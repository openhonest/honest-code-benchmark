#!/usr/bin/env node

// Build all CSR arms for a given archetype (or all archetypes).
// Usage: node build.js [archetype]
//   node build.js table        # build all arms for table
//   node build.js              # build all archetypes

import { build } from 'esbuild';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CSR_ARMS = [
  '1-useState',
  '2-redux',
  '3-zustand',
  '4-signals',
  '5-stateless-domx',
];

const SSR_ARMS = [
  '6-react-ssr-stateless-domx',
  '7-react-ssr-honest',
  '8-react-ssr-domain-classes',
  '9-react-ssr-conventional',
];

const HTMX_ARMS = [
  '10-htmx-ejs',
  '11-fastapi-honest-htmx',
];

const ARCHETYPES = ['form', 'table', 'dashboard', 'browser', 'grid'];

const targetArchetypes = process.argv[2]
  ? [process.argv[2]]
  : ARCHETYPES;

let built = 0;

for (const archetype of targetArchetypes) {
  for (const arm of CSR_ARMS) {
    const entryPoint = join(__dirname, archetype, arm, 'index.jsx');
    if (!existsSync(entryPoint)) continue;

    const outdir = join(__dirname, archetype, arm, 'dist');

    try {
      await build({
        entryPoints: [entryPoint],
        bundle: true,
        minify: true,
        sourcemap: false,
        outfile: join(outdir, 'app.js'),
        format: 'esm',
        jsx: 'automatic',
        target: ['chrome120'],
        define: {
          'process.env.NODE_ENV': '"production"',
        },
        loader: {
          '.js': 'jsx',
          '.jsx': 'jsx',
        },
      });
      console.log(`  ${archetype}/${arm}/dist/app.js`);
      built++;
    } catch (e) {
      console.error(`  FAILED: ${archetype}/${arm}: ${e.message}`);
    }
  }

  for (const arm of SSR_ARMS) {
    const clientEntry = join(__dirname, archetype, arm, 'index.jsx');
    const serverEntry = join(__dirname, archetype, arm, 'server.jsx');
    if (!existsSync(clientEntry) || !existsSync(serverEntry)) continue;

    const outdir = join(__dirname, archetype, arm, 'dist');

    try {
      await build({
        entryPoints: [clientEntry],
        bundle: true,
        minify: true,
        sourcemap: false,
        outfile: join(outdir, 'app.js'),
        format: 'esm',
        jsx: 'automatic',
        target: ['chrome120'],
        define: { 'process.env.NODE_ENV': '"production"' },
        loader: { '.js': 'jsx', '.jsx': 'jsx' },
      });

      await build({
        entryPoints: [serverEntry],
        bundle: true,
        minify: false,
        sourcemap: false,
        outfile: join(outdir, 'server.mjs'),
        format: 'esm',
        jsx: 'automatic',
        platform: 'node',
        define: { 'process.env.NODE_ENV': '"production"' },
        loader: { '.js': 'jsx', '.jsx': 'jsx' },
        external: ['react', 'react-dom', 'react-dom/server'],
      });

      console.log(`  ${archetype}/${arm}/dist/app.js + server.mjs`);
      built++;
    } catch (e) {
      console.error(`  FAILED: ${archetype}/${arm}: ${e.message}`);
    }
  }
}

console.log(`\n${built} bundles built.`);
