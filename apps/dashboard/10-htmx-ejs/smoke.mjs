#!/usr/bin/env node

// Smoke test: import the module, render with real data, check the output.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '..', '..', '..', 'data', 'dashboard', '100.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

const { render } = await import(join(__dirname, 'server.js'));
const html = await render(data, { archetype: 'dashboard', arm: '10-htmx-ejs', rows: 100 });

const checks = [
  ['htmx script', /htmx\.org@1\.9\.12/],
  ['dashboard cards', /class="dashboard-cards"/],
  ['total-orders card', /data-role="total-orders"/],
  ['total-revenue card', /data-role="total-revenue"/],
  ['avg-order card', /data-role="avg-order"/],
  ['unique-customers card', /data-role="unique-customers"/],
  ['category filter', /data-role="category-filter"/],
  ['status filter', /data-role="status-filter"/],
  ['date-from filter', /data-role="date-from"/],
  ['date-to filter', /data-role="date-to"/],
  ['data table', /<table>/],
  ['table rows', /data-row="ORD-/],
  ['hx-get attributes', /hx-get="/],
  ['hx-target attributes', /hx-target="#dashboard-content"/],
  ['hidden state inputs', /input type="hidden" name="sortCol"/],
  ['pagination', /data-role="page-info"/],
  ['sort indicators', /class="sort-indicator/],
  ['status badges', /class="status-badge status-/],
  ['shared stylesheet', /\/shared\/styles\.css/],
];

let passed = 0;
let failed = 0;

for (const [name, pattern] of checks) {
  if (pattern.test(html)) {
    passed++;
  } else {
    console.error(`FAIL: ${name} (${pattern})`);
    failed++;
  }
}

console.log(`${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
console.log('Smoke test passed.');
