#!/usr/bin/env node

// Smoke test: navigate to every arm × archetype, wait for load, run the
// interaction script, report pass/fail. No metrics collected, no CSV output.
//
// Usage:
//   node src/smoke.js --node-port 4000 --fastapi-port 4001
//   node src/smoke.js --node-port 4000 --fastapi-port 4001 --arch table
//   node src/smoke.js --node-port 4000 --fastapi-port 4001 --arm 11-fastapi-honest-htmx

import { chromium } from 'playwright';
import { interactions } from './interactions/index.js';

const ARMS = [
  '1-useState',
  '2-redux',
  '3-zustand',
  '4-signals',
  '5-stateless-domx',
  '6-react-ssr-stateless-domx',
  '7-react-ssr-honest',
  '8-react-ssr-domain-classes',
  '9-react-ssr-conventional',
  '10-htmx-ejs',
  '11-fastapi-honest-htmx',
];

const FASTAPI_ARMS = new Set(['11-fastapi-honest-htmx']);
const ARCHETYPES = ['table', 'form', 'dashboard', 'browser', 'grid'];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = flag => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    nodePort: parseInt(get('--node-port') || '4000', 10),
    fastapiPort: parseInt(get('--fastapi-port') || '4001', 10),
    filterArch: get('--arch'),
    filterArm: get('--arm'),
  };
}

async function smokeOne(browser, url, archetype, arm) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', err => errors.push(err.message));

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(1000);

    const body = await page.textContent('body');
    if (!body || body.trim().length < 20) {
      return { status: 'FAIL', reason: 'empty page body' };
    }

    const interact = interactions[archetype];
    if (interact) {
      await interact(page);
      await page.waitForTimeout(500);
    }

    if (errors.length > 0) {
      return { status: 'WARN', reason: `page errors: ${errors.slice(0, 3).join('; ')}` };
    }
    return { status: 'PASS' };
  } catch (e) {
    return { status: 'FAIL', reason: e.message.split('\n')[0] };
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs();
  const arms = opts.filterArm ? ARMS.filter(a => a === opts.filterArm) : ARMS;
  const archetypes = opts.filterArch ? ARCHETYPES.filter(a => a === opts.filterArch) : ARCHETYPES;
  const total = arms.length * archetypes.length;

  console.log(`Smoke testing ${total} combinations (${archetypes.length} archetypes × ${arms.length} arms)\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-extensions', '--no-first-run'],
  });

  let pass = 0, warn = 0, fail = 0;
  const failures = [];

  for (const arch of archetypes) {
    for (const arm of arms) {
      const port = FASTAPI_ARMS.has(arm) ? opts.fastapiPort : opts.nodePort;
      const url = `http://localhost:${port}/${arch}/${arm}/?rows=100`;
      const label = `${arch}/${arm}`;

      process.stdout.write(`  ${label}...`);
      const result = await smokeOne(browser, url, arch, arm);

      if (result.status === 'PASS') {
        process.stdout.write(' PASS\n');
        pass++;
      } else if (result.status === 'WARN') {
        process.stdout.write(` WARN: ${result.reason}\n`);
        warn++;
      } else {
        process.stdout.write(` FAIL: ${result.reason}\n`);
        fail++;
        failures.push({ label, reason: result.reason });
      }
    }
  }

  await browser.close();

  console.log(`\n=== Results: ${pass} pass, ${warn} warn, ${fail} fail out of ${total} ===`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ${f.label}: ${f.reason}`);
    }
  }
  process.exit(fail > 0 ? 1 : 0);
}

main();
