#!/usr/bin/env node
// Cross-arm state correctness gate.
//
// For each archetype at a small row count, runs targeted interaction steps
// on every arm, captures visible row IDs after each step, and compares
// across arms. A divergence means one arm shows different results for the
// same operation.
//
// This catches bugs like Arm 5's missing re-sort after edit (issue #2,
// finding 2), where skipped work shows up as a speed win.
//
// Usage:
//   node src/check-state.js [--base http://127.0.0.1:4000] [--size 100]
//   node src/check-state.js --arch table
//   node src/check-state.js --arm 1-useState,5-stateless-domx

import { chromium } from 'playwright';
import { settle, prepare, clickIfEnabled } from './interactions/settle.js';

const ARMS = [
  '1-useState', '2-redux', '3-zustand', '4-signals', '5-stateless-domx',
  '6-react-ssr-stateless-domx', '7-react-ssr-honest',
  '8-react-ssr-domain-classes', '9-react-ssr-conventional',
  '10-htmx-ejs', '11-fastapi-honest-htmx', '12-fastapi-honest-nogenx',
  '13-htmx-ejs-conventional',
];
const FASTAPI_ARMS = new Set(['11-fastapi-honest-htmx', '12-fastapi-honest-nogenx']);

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i > 0 && args[i + 1] ? args[i + 1] : null;
  };
  const base = get('--base') || 'http://127.0.0.1:4000';
  const fastapiBase = get('--fastapi-base') || 'http://127.0.0.1:4001';
  const size = get('--size') || '100';
  const filterArch = get('--arch');
  const filterArms = get('--arm')?.split(',');
  return { base, fastapiBase, size, filterArch, filterArms };
}

function url(base, fastapiBase, arch, arm, size) {
  const b = FASTAPI_ARMS.has(arm) ? fastapiBase : base;
  return `${b}/${arch}/${arm}/?rows=${size}`;
}

async function captureRowIds(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('tbody tr[data-row]')]
      .map(tr => tr.dataset.row)
  );
}

async function capturePageInfo(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-role="page-info"]');
    return el ? el.textContent.trim() : null;
  });
}

async function captureSummary(page) {
  return page.evaluate(() => {
    const counts = document.querySelector('.selection-count');
    return counts ? counts.textContent.trim() : null;
  });
}

// Table: sort, filter, edit-while-sorted (the re-sort check), delete.
async function tableSteps(page) {
  prepare(page);
  const snaps = {};

  snaps['initial'] = await captureRowIds(page);

  await page.click('th[data-column="name"]');
  await settle(page);
  snaps['sort-name-asc'] = await captureRowIds(page);

  await page.click('th[data-column="name"]');
  await settle(page);
  snaps['sort-name-desc'] = await captureRowIds(page);

  await page.click('th[data-column="salary"]');
  await settle(page);
  snaps['sort-salary-asc'] = await captureRowIds(page);

  await page.fill('[data-role="filter-input"]', 'Smith');
  await settle(page, 400);
  snaps['filter-smith'] = await captureRowIds(page);

  await page.fill('[data-role="filter-input"]', '');
  await settle(page, 400);

  // Sort by name for the edit re-sort check.
  await page.click('th[data-column="salary"]'); // clear salary sort
  await settle(page);
  await page.click('th[data-column="name"]'); // name asc
  await settle(page);
  snaps['pre-edit-name-asc'] = await captureRowIds(page);

  // Edit the first visible row's name to "ZZZZZ". If sorted by name asc,
  // the row should move toward the end.
  await page.dblclick('tbody tr:first-child td[data-column="name"]');
  const editor = page.locator('td[data-column="name"] input').first();
  await editor.waitFor({ timeout: 5000 });
  await editor.fill('ZZZZZ');
  await editor.press('Enter');
  await settle(page);
  snaps['after-edit-name-sorted'] = await captureRowIds(page);

  return snaps;
}

// Dashboard: sort, category filter, status filter.
async function dashboardSteps(page) {
  prepare(page);
  const snaps = {};

  snaps['initial'] = await captureRowIds(page);

  await page.click('th[data-column="amount"]');
  await settle(page);
  snaps['sort-amount-asc'] = await captureRowIds(page);

  await page.click('th[data-column="amount"]');
  await settle(page);
  snaps['sort-amount-desc'] = await captureRowIds(page);

  await page.selectOption('[data-role="category-filter"]', { index: 1 });
  await settle(page);
  snaps['filter-category'] = await captureRowIds(page);

  return snaps;
}

// Browser: sort, search, status filter.
async function browserSteps(page) {
  prepare(page);
  const snaps = {};

  snaps['initial'] = await captureRowIds(page);

  await page.click('th[data-column="name"]');
  await settle(page);
  snaps['sort-name-asc'] = await captureRowIds(page);

  await page.click('th[data-column="value"]');
  await settle(page);
  snaps['sort-value-asc'] = await captureRowIds(page);

  await page.fill('[data-role="search-input"]', 'Taylor');
  await settle(page, 400);
  snaps['search-taylor'] = await captureRowIds(page);

  return snaps;
}

// Grid: sort by category filter, edit a cell.
async function gridSteps(page) {
  prepare(page);
  const snaps = {};

  snaps['initial'] = await captureRowIds(page);

  await page.selectOption('[data-role="category-filter"]', { index: 1 });
  await settle(page);
  snaps['filter-category'] = await captureRowIds(page);

  return snaps;
}

const ARCHETYPE_STEPS = {
  table: tableSteps,
  dashboard: dashboardSteps,
  browser: browserSteps,
  grid: gridSteps,
};

async function main() {
  const opts = parseArgs();
  const archetypes = opts.filterArch
    ? [opts.filterArch]
    : Object.keys(ARCHETYPE_STEPS);
  const arms = opts.filterArms || ARMS;

  console.log(`Cross-arm state check: ${archetypes.join(', ')} at rows=${opts.size}`);
  console.log(`Arms: ${arms.join(', ')}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-extensions', '--no-first-run'],
  });

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const arch of archetypes) {
    const stepFn = ARCHETYPE_STEPS[arch];
    if (!stepFn) {
      console.log(`  skipping ${arch} (no step function)\n`);
      continue;
    }

    const allSnaps = {};
    const armOrder = [];

    for (const arm of arms) {
      const pageUrl = url(opts.base, opts.fastapiBase, arch, arm, opts.size);
      const label = `${arch}/${arm}`;
      process.stdout.write(`  ${label}...`);

      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);

      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      try {
        await page.goto(pageUrl, { waitUntil: 'load', timeout: 30_000 });
        await page.waitForTimeout(1000);
        const snaps = await stepFn(page);
        if (errors.length) {
          process.stdout.write(` ERROR: ${errors[0]}\n`);
        } else {
          allSnaps[arm] = snaps;
          armOrder.push(arm);
          process.stdout.write(` ${Object.keys(snaps).length} steps captured\n`);
        }
      } catch (e) {
        process.stdout.write(` FAIL: ${e.message.split('\n')[0]}\n`);
      }

      await context.close();
    }

    // Compare within sort-implementation groups. Client arms (1-9) sort
    // case-insensitively in JavaScript; server arms (10-13) sort via SQLite
    // binary collation. Cross-group differences after a mutation are expected.
    if (armOrder.length < 2) {
      console.log(`  ${arch}: fewer than 2 arms succeeded, skipping comparison\n`);
      continue;
    }

    const CLIENT_ARMS = new Set([
      '1-useState', '2-redux', '3-zustand', '4-signals', '5-stateless-domx',
      '6-react-ssr-stateless-domx', '7-react-ssr-honest',
      '8-react-ssr-domain-classes', '9-react-ssr-conventional',
    ]);
    const groups = [
      armOrder.filter(a => CLIENT_ARMS.has(a)),
      armOrder.filter(a => !CLIENT_ARMS.has(a)),
    ].filter(g => g.length >= 2);

    // Also compare across groups on non-mutation steps (sort and filter
    // should agree because the starting data is identical and untouched).
    const MUTATION_STEPS = new Set(['after-edit-name-sorted']);
    const crossGroup = armOrder;

    const steps = Object.keys(allSnaps[armOrder[0]]);
    for (const step of steps) {
      const isMutation = MUTATION_STEPS.has(step);
      const comparisons = isMutation ? groups : [crossGroup];
      for (const group of comparisons) {
        if (group.length < 2) continue;
        const ref = group[0];
        const refIds = allSnaps[ref][step];
        for (let i = 1; i < group.length; i++) {
          const arm = group[i];
          const armIds = allSnaps[arm]?.[step];
          if (!armIds) continue;
          const match = refIds.length === armIds.length
            && refIds.every((id, j) => id === armIds[j]);
          if (match) {
            pass++;
          } else {
            fail++;
            const scope = isMutation ? ' (within group)' : '';
            const msg = `${arch} step "${step}"${scope}: ${arm} differs from ${ref}`;
            failures.push(msg);
            console.log(`  MISMATCH ${msg}`);
            console.log(`    ${ref}: [${refIds.slice(0, 8).join(',')}${refIds.length > 8 ? ',...' : ''}] (${refIds.length} rows)`);
            console.log(`    ${arm}:  [${armIds.slice(0, 8).join(',')}${armIds.length > 8 ? ',...' : ''}] (${armIds.length} rows)`);
          }
        }
      }
    }
    console.log('');
  }

  await browser.close();

  console.log(`=== ${pass} match, ${fail} mismatch ===`);
  if (failures.length) {
    console.log('\nMismatches:');
    for (const f of failures) console.log(`  ${f}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main();
