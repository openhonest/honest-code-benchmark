#!/usr/bin/env node

// Dev server for benchmark apps.
// Serves any CSR arm: http://localhost:PORT/table/2-redux/?rows=1000
// Also serves SSR arms when they register their routes.
//
// Usage: node server.js [--port 4000]

import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const SHARED_DIR = join(__dirname, '..', 'shared');

const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '4000', 10);

const SSR_ARMS = ['6-react-ssr-stateless-domx', '7-react-ssr-honest', '8-react-ssr-domain-classes', '9-react-ssr-conventional'];
const HTMX_ARMS = ['10-htmx-ejs'];
const FASTAPI_ARMS = ['11-fastapi-honest-htmx'];

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Shared static assets
app.use('/shared', express.static(SHARED_DIR));

// Data files
app.use('/data', express.static(DATA_DIR));

// Mount htmx arm partial routers
for (const arch of ['form', 'table', 'dashboard', 'browser', 'grid']) {
  for (const arm of HTMX_ARMS) {
    const serverPath = join(__dirname, arch, arm, 'server.js');
    if (!existsSync(serverPath)) continue;
    const mod = await import(serverPath);
    if (mod.partialRouter) {
      app.use(`/${arch}/${arm}`, mod.partialRouter(DATA_DIR, arch));
    }
  }
}

// Arm handler: /:archetype/:arm/
app.get('/:archetype/:arm/', async (req, res) => {
  const { archetype, arm } = req.params;
  const rows = req.query.rows || '1000';

  const isSSR = SSR_ARMS.includes(arm);
  const isHtmx = HTMX_ARMS.includes(arm);
  const isFastAPI = FASTAPI_ARMS.includes(arm);

  if (isFastAPI) {
    res.status(302).redirect(`http://localhost:4001/${archetype}/${arm}/?rows=${rows}`);
    return;
  }

  if (!isHtmx) {
    const distPath = join(__dirname, archetype, arm, 'dist', 'app.js');
    if (!existsSync(distPath)) {
      res.status(404).send(`Not built: ${archetype}/${arm}. Run: node build.js ${archetype}`);
      return;
    }
  }

  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  const start = performance.now();

  if (isHtmx) {
    const serverPath = join(__dirname, archetype, arm, 'server.js');
    if (!existsSync(serverPath)) {
      res.status(404).send(`Not found: ${archetype}/${arm}/server.js`);
      return;
    }
    const dataPath = join(DATA_DIR, archetype, `${rows}.json`);
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
    const mod = await import(serverPath);
    const pageHtml = await mod.render(data, { archetype, arm, rows });

    const renderMs = performance.now() - start;
    res.setHeader('Server-Timing', `render;dur=${renderMs.toFixed(2)}`);
    res.send(pageHtml);
    return;
  }

  if (isSSR) {
    const serverPath = join(__dirname, archetype, arm, 'dist', 'server.mjs');
    if (!existsSync(serverPath)) {
      res.status(404).send(`Server bundle not built: ${archetype}/${arm}`);
      return;
    }

    const dataPath = join(DATA_DIR, archetype, `${rows}.json`);
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
    const { render } = await import(serverPath);
    const appHtml = render(data);

    const renderMs = performance.now() - start;
    res.setHeader('Server-Timing', `render;dur=${renderMs.toFixed(2)}`);

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Benchmark: ${archetype} / ${arm}</title>
  <link rel="stylesheet" href="/shared/styles.css">
</head>
<body>
  <div id="root">${appHtml}</div>
  <script>window.__BENCHMARK_CONFIG__ = { archetype: "${archetype}", arm: "${arm}", rows: ${rows}, dataUrl: "/data/${archetype}/${rows}.json" };</script>
  <script>window.__SSR_DATA__ = ${JSON.stringify(data)};</script>
  <script type="module" src="/${archetype}/${arm}/dist/app.js"></script>
</body>
</html>`);
    return;
  }

  const renderMs = performance.now() - start;
  res.setHeader('Server-Timing', `render;dur=${renderMs.toFixed(2)}`);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Benchmark: ${archetype} / ${arm}</title>
  <link rel="stylesheet" href="/shared/styles.css">
</head>
<body>
  <div id="root"></div>
  <script>window.__BENCHMARK_CONFIG__ = { archetype: "${archetype}", arm: "${arm}", rows: ${rows}, dataUrl: "/data/${archetype}/${rows}.json" };</script>
  <script type="module" src="/${archetype}/${arm}/dist/app.js"></script>
</body>
</html>`);
});

// Static files for each arm (dist/ bundles)
app.use('/:archetype/:arm/dist', (req, res, next) => {
  const { archetype, arm } = req.params;
  express.static(join(__dirname, archetype, arm, 'dist'))(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Benchmark server: http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/table/2-redux/?rows=1000`);
});
