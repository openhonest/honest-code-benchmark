#!/usr/bin/env node
// Hydration check for the SSR arms 6, 7, 8 and 9 (correctness only, no timing).
//
// Loads every SSR arm, archetype and data size in headless Chromium and fails
// if the page logs any console error or warning, throws an uncaught error, or
// lets React report a recoverable (hydration) error. React logs every
// mismatch between server markup and the client's first render, so a clean
// log means hydration reused the server HTML unchanged.
//
// Dashboard pages load with refresh=0, then fire one refresh after
// hydration; the last-updated stamp must change with no errors logged.
//
// Usage: node scripts/check-hydration.mjs [--base http://localhost:4000]
//          [--sizes 100,1000] [--archetype table] [--arms 6,7]
// Start `node server.js` first. Exits 1 on any failure.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'harness', 'package.json'));
const { chromium } = require('playwright');

const ARCHETYPES = ['form', 'table', 'dashboard', 'browser', 'grid'];
const ARMS = ['6-react-ssr-stateless-domx', '7-react-ssr-honest', '8-react-ssr-domain-classes', '9-react-ssr-conventional'];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const base = arg('base', 'http://localhost:4000');
const sizes = arg('sizes', '100,1000,10000,50000,100000').split(',');
const archetypes = arg('archetype', ARCHETYPES.join(',')).split(',');
const armFilter = arg('arms', '');
const arms = armFilter ? ARMS.filter(a => armFilter.split(',').some(p => a.startsWith(`${p}-`))) : ARMS;

const browser = await chromium.launch();
let pass = 0;
const failures = [];
try {
  for (const archetype of archetypes) {
    for (const arm of arms) {
      for (const rows of sizes) {
        const page = await browser.newPage();
        const problems = [];
        page.on('console', msg => {
          if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`console.${msg.type()}: ${msg.text().slice(0, 200)}`);
        });
        page.on('pageerror', err => problems.push(`pageerror: ${String(err.message).slice(0, 200)}`));
        const url = `${base}/${archetype}/${arm}/?rows=${rows}${archetype === 'dashboard' ? '&refresh=0' : ''}`;
        const res = await page.goto(url, { waitUntil: 'load', timeout: 120000 });
        if (!res || res.status() !== 200) problems.push(`HTTP ${res ? res.status() : 'no response'}`);
        const ssrNonEmpty = await page.evaluate(() => document.getElementById('root')?.children.length > 0);
        if (!ssrNonEmpty) problems.push('root is empty');
        await page.waitForFunction(() => {
          const root = document.getElementById('root');
          return root && Object.keys(root).some(k => k.startsWith('__reactContainer'));
        }, null, { timeout: 120000 }).catch(() => problems.push('React never attached to #root'));
        await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
        await page.waitForTimeout(250);
        if (archetype === 'dashboard') {
          const old = await page.getAttribute('[data-role="last-updated"]', 'datetime').catch(() => null);
          if (!old) problems.push('no server-rendered last-updated stamp');
          await page.waitForTimeout(5);
          await page.evaluate(() => document.body.dispatchEvent(new CustomEvent('dashboard-refresh')));
          await page.waitForFunction((o) => {
            const v = document.querySelector('[data-role="last-updated"]')?.getAttribute('datetime');
            return v && v !== o;
          }, old, { timeout: 60000 }).catch(() => problems.push('refresh did not update the last-updated stamp'));
          await page.waitForTimeout(100);
        }
        await page.close();
        if (problems.length) failures.push({ url, problems });
        else pass++;
      }
    }
  }
} finally {
  await browser.close();
}

for (const f of failures) {
  console.log(`FAIL ${f.url}`);
  for (const p of [...new Set(f.problems)].slice(0, 5)) console.log(`  ${p}`);
}
console.log(`hydration: ${pass} of ${pass + failures.length} pages clean`);
process.exit(failures.length ? 1 : 0);
