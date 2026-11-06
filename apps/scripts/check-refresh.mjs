#!/usr/bin/env node
// Dashboard auto-refresh check for all 11 arms (correctness only, no timing).
//
// For every arm and data size:
//   1. Manual refresh. Load with refresh=0 (timer off), choose the first
//      category, sort by amount descending, go to page 2, then fire the
//      page-wide `dashboard-refresh` event. (When the category fits on one
//      page, as at 100 rows, the table stays on page 1.) The last-updated stamp must
//      change, and the filters, sort, page and row ids must not.
//   2. Row parity. After the refresh, every arm must show the same row ids.
//   3. Timer. Load with refresh=1, choose the first category, and wait for
//      the stamp to change with no action taken. The filter must survive.
// Any uncaught error or HTTP error fails the case, as in `harness --check`.
// Console messages are not checked here; check-hydration.mjs covers them
// for the SSR arms.
//
// Usage: node scripts/check-refresh.mjs [--base http://127.0.0.1:4000]
//          [--sizes 100,1000] [--arms 1,10]
// Needs the Node server and the FastAPI server running. Exits 1 on failure.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(HERE, '..', '..', 'harness');
const require = createRequire(join(HARNESS, 'package.json'));
const { chromium } = require('playwright');
const { dashboardState, refreshDashboard } = await import(pathToFileURL(join(HARNESS, 'src', 'interactions', 'dashboard.js')).href);
const { settle, prepare, clickIfEnabled } = await import(pathToFileURL(join(HARNESS, 'src', 'interactions', 'settle.js')).href);

const ARMS = [
  '1-useState', '2-redux', '3-zustand', '4-signals', '5-stateless-domx',
  '6-react-ssr-stateless-domx', '7-react-ssr-honest', '8-react-ssr-domain-classes',
  '9-react-ssr-conventional', '10-htmx-ejs', '11-fastapi-honest-htmx',
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const base = arg('base', 'http://127.0.0.1:4000');
const sizes = arg('sizes', '100,1000,10000,50000,100000').split(',');
const armFilter = arg('arms', '');
const arms = armFilter ? ARMS.filter((a) => armFilter.split(',').some((p) => a.startsWith(`${p}-`))) : ARMS;

const browser = await chromium.launch({ headless: true });
let pass = 0;
let fail = 0;
function result(ok, label, detail) {
  if (ok) pass++;
  else { fail++; console.log(`FAIL ${label}${detail ? `: ${detail}` : ''}`); }
}

async function open(arm, rows, refresh) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  prepare(page);
  await page.goto(`${base}/dashboard/${arm}/?rows=${rows}&refresh=${refresh}`, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {});
  await page.waitForSelector('tr[data-row]');
  return { context, page, errors };
}

try {
  for (const rows of sizes) {
    const ids = {};
    for (const arm of arms) {
      // 1. Manual refresh keeps the state.
      const label = `manual ${arm} rows=${rows}`;
      const { context, page, errors } = await open(arm, rows, 0);
      try {
        await page.selectOption('[data-role="category-filter"]', { index: 1 });
        await settle(page);
        await page.click('th[data-column="amount"]');
        await settle(page);
        await page.click('th[data-column="amount"]');
        await settle(page);
        const paged = await clickIfEnabled(page, '[data-action="next-page"]');
        await settle(page);
        const before = await dashboardState(page);
        const after = await refreshDashboard(page);
        await settle(page);
        const problems = [...errors];
        if (before.category === 'All') problems.push('category filter did not apply');
        if (before.sortColumn !== 'amount') problems.push(`sort column is "${before.sortColumn}"`);
        if (!new RegExp(`^Page ${paged ? 2 : 1} of `).test(before.pageInfo)) problems.push(`page info is "${before.pageInfo}"`);
        ids[arm] = after.rows.join(',');
        result(problems.length === 0, label, problems.join('; '));
      } catch (e) {
        result(false, label, e.message.split('\n')[0]);
      }
      await context.close();

      // 3. The timer fires on its own and keeps the filter.
      const tLabel = `timer ${arm} rows=${rows}`;
      const t = await open(arm, rows, 1);
      try {
        await t.page.selectOption('[data-role="category-filter"]', { index: 1 });
        await settle(t.page);
        const before = await dashboardState(t.page);
        const old = await t.page.getAttribute('[data-role="last-updated"]', 'datetime');
        await t.page.waitForFunction((o) => {
          const v = document.querySelector('[data-role="last-updated"]')?.getAttribute('datetime');
          return v && v !== o;
        }, old);
        await settle(t.page);
        const after = await dashboardState(t.page);
        const problems = [...t.errors];
        if (after.category !== before.category || after.category === 'All') problems.push(`category ${before.category} -> ${after.category}`);
        if (after.pageInfo !== before.pageInfo) problems.push(`page info ${before.pageInfo} -> ${after.pageInfo}`);
        if (after.rows.join(',') !== before.rows.join(',')) problems.push('rows changed');
        result(problems.length === 0, tLabel, problems.join('; '));
      } catch (e) {
        result(false, tLabel, e.message.split('\n')[0]);
      }
      await t.context.close();
    }

    // 2. Row parity across arms after the refresh.
    const distinct = new Set(Object.values(ids));
    result(distinct.size === 1 && !distinct.has(''), `row parity rows=${rows}`,
      Object.entries(ids).map(([a, v]) => `${a}=${v.split(',').slice(0, 3).join(',')}...`).join(' '));
  }
} finally {
  await browser.close();
}
console.log(`refresh: ${pass} of ${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
