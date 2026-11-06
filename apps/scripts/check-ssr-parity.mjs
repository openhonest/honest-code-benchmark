#!/usr/bin/env node
// Correctness check for the SSR ablation arms 7, 8 and 9 (no timing).
//
// 1. Server markup parity: for every archetype and data size, the HTML each
//    arm's server tree renders must equal renderToString() of the shared
//    client (the tree the browser hydrates). Equal markup means hydration
//    has nothing to patch.
// 2. Client parity: arms 7, 8 and 9 must ship the same client bundle, and
//    each index.jsx must hydrate ../shared-client/App.jsx.
//
// Usage: node scripts/check-ssr-parity.mjs [--sizes 100,1000] [--archetype table]
// Run `node build.js` first. Exits 1 on any mismatch.

import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openTableDb, openDashboardDb, openBrowserDb, openFormDb, openGridDb } from '../lib/sqlite.js';

const APPS = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(APPS, '..', 'data', 'sqlite');
const ARCHETYPES = ['form', 'table', 'dashboard', 'browser', 'grid'];
const ARMS = ['7-react-ssr-honest', '8-react-ssr-domain-classes', '9-react-ssr-conventional'];
// A fixed load time, so the dashboard's last-updated line renders the same
// on both sides. Other archetypes ignore it.
const LOADED_AT = '2026-10-30T19:03:12.345Z';
const OPENERS = { table: openTableDb, dashboard: openDashboardDb, browser: openBrowserDb, form: openFormDb, grid: openGridDb };

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const sizes = arg('sizes', '100,1000,10000,50000,100000').split(',');
const archetypes = arg('archetype', ARCHETYPES.join(',')).split(',');

function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return { at: i, expected: a.slice(Math.max(0, i - 80), i + 80), actual: b.slice(Math.max(0, i - 80), i + 80) };
}

const scratch = mkdtempSync(join(tmpdir(), 'ssr-parity-'));
let checks = 0;
let failures = 0;
function fail(msg, detail) {
  failures++;
  console.log(`FAIL ${msg}`);
  if (detail) console.log(detail);
}

try {
  for (const archetype of archetypes) {
    // Bundle the shared client with its own React so it renders on Node.
    const entry = join(scratch, `${archetype}-entry.jsx`);
    const out = join(scratch, `${archetype}-shared.cjs`);
    writeFileSync(entry, [
      "import React from 'react';",
      "import { renderToString } from 'react-dom/server';",
      `import App from ${JSON.stringify(join(APPS, archetype, 'shared-client', 'App.jsx'))};`,
      'export function render(data, at) { return renderToString(<App initialData={data} initialUpdatedAt={at} />); }',
    ].join('\n'));
    await build({
      entryPoints: [entry], bundle: true, outfile: out, format: "cjs", platform: 'node',
      jsx: 'automatic', nodePaths: [join(APPS, 'node_modules')], logLevel: 'error',
      define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.js': 'jsx', '.jsx': 'jsx' },
    });
    const shared = (await import(pathToFileURL(out).href)).default;

    const servers = {};
    for (const arm of ARMS) {
      const p = join(APPS, archetype, arm, 'dist', 'server.mjs');
      if (!existsSync(p)) { fail(`${archetype}/${arm}: dist/server.mjs missing (run node build.js)`); continue; }
      servers[arm] = await import(pathToFileURL(p).href);
    }

    for (const size of sizes) {
      const db = OPENERS[archetype](join(DATA, `${size}.sqlite`));
      const data = db.all();
      db.close();
      const expected = shared.render(data, LOADED_AT);
      for (const [arm, mod] of Object.entries(servers)) {
        checks++;
        const result = mod.render(data, { loadedAt: LOADED_AT });
        const html = typeof result === 'string' ? result : result.html;
        if (html !== expected) fail(`markup ${archetype}/${arm} rows=${size}`, firstDiff(expected, html));
        else console.log(`ok   markup ${archetype}/${arm} rows=${size}`);
      }
    }

    // Client parity
    const hashes = new Map();
    for (const arm of ['1-useState', ...ARMS]) {
      const bundle = join(APPS, archetype, arm, 'dist', 'app.js');
      if (existsSync(bundle)) hashes.set(arm, createHash('sha256').update(readFileSync(bundle)).digest('hex'));
    }
    for (const arm of ARMS) {
      checks++;
      const src = readFileSync(join(APPS, archetype, arm, 'index.jsx'), 'utf8');
      if (!src.includes("from '../shared-client/App.jsx'") || !src.includes('hydrateRoot')) fail(`client ${archetype}/${arm}: index.jsx does not hydrate the shared client`);
      else console.log(`ok   client-entry ${archetype}/${arm}`);
    }
    checks++;
    const ssrHashes = ARMS.map(a => hashes.get(a));
    if (new Set(ssrHashes).size !== 1 || !ssrHashes[0]) fail(`client ${archetype}: arms 7, 8 and 9 ship different bundles`);
    else console.log(`ok   client-bundle ${archetype} (arms 7, 8, 9 identical)`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`\n${checks - failures} of ${checks} checks passed.`);
process.exit(failures ? 1 : 0);
