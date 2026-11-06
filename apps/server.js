#!/usr/bin/env node

// Dev and benchmark server for every arm.
//   CSR arms 1-5:   http://localhost:PORT/table/2-redux/?rows=1000
//   SSR arms 6-9:   rendered here (Arm 6 pages from SQLite, Arms 7-9 get all rows)
//   htmx Arm 10:    rendered here with EJS from SQLite
//   FastAPI Arms 11-12: proxied on the same origin to the Python server (port 4001)
//
// Usage: node server.js [--port 4000] [--fastapi-port 4001]

import express from 'express';
import compression from 'compression';
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openFormDb } from './lib/sqlite.js';
import { createTimer } from './lib/timing.js';
import { BadRequest, scriptJson, deepFreeze, route } from './lib/http-util.js';
import { createArm6, ARM6 } from './lib/arm6-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const SHARED_DIR = join(__dirname, '..', 'shared');
const VENDOR_DIR = join(__dirname, '..', 'vendor');

const argValue = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const PORT = Number(argValue('--port', '4000'));
const FASTAPI_PORT = Number(argValue('--fastapi-port', '4001'));

const ARCHETYPES = ['table', 'dashboard', 'browser', 'form', 'grid'];
const CSR_ARMS = ['1-useState', '2-redux', '3-zustand', '4-signals', '5-stateless-domx'];
const FULL_DATA_SSR_ARMS = ['7-react-ssr-honest', '8-react-ssr-domain-classes', '9-react-ssr-conventional'];
const HTMX_ARM = '10-htmx-ejs';
const HTMX_ARM13 = '13-htmx-ejs-conventional';
const FASTAPI_ARM = '11-fastapi-honest-htmx';
const FASTAPI_ARM12 = '12-fastapi-honest-nogenx';
const FASTAPI_ARMS = [FASTAPI_ARM, FASTAPI_ARM12];
const ALLOWED_SIZES = ['100', '1000', '10000', '50000', '100000'];

// Compression: gzip at level 6 for responses of 500 bytes or more, on both
// servers (fastapi-server.py uses the same settings). Proxied Arm 11
// responses arrive already compressed and pass through untouched.
const COMPRESSION = { level: 6, threshold: 500 };

// ---------------------------------------------------------------- data for Arms 7-9
// Arms 7-9 receive every row, as the plan specifies. Each data file is parsed
// once and deep-frozen, so a render or an edit can never change what the next
// page load receives.
const fullDataCache = new Map();
function loadAllRows(archetype, rows) {
  const key = `${archetype}/${rows}`;
  if (!fullDataCache.has(key)) {
    const text = readFileSync(join(DATA_DIR, archetype, `${rows}.json`), 'utf-8');
    fullDataCache.set(key, deepFreeze(JSON.parse(text)));
  }
  return fullDataCache.get(key);
}

// Arm 6 form shows one record; it reads that record from SQLite.
const formDbs = new Map();
function firstFormRecord(rows) {
  if (!formDbs.has(rows)) formDbs.set(rows, openFormDb(join(DATA_DIR, 'sqlite', `${rows}.sqlite`)));
  const rec = formDbs.get(rows).getFirst();
  return rec ? [rec] : [];
}

const arm6 = createArm6(DATA_DIR);

// ---------------------------------------------------------------- app
const app = express();
app.disable('x-powered-by');

// Same-origin reverse proxy for FastAPI arms. Sits before compression and the
// body parsers so the request and response bytes pass through unchanged.
for (const faArm of FASTAPI_ARMS) {
  app.use(`/:archetype/${faArm}`, (req, res) => {
    const upstream = http.request({
      host: '127.0.0.1',
      port: FASTAPI_PORT,
      method: req.method,
      path: req.originalUrl,
      headers: { ...req.headers, host: `127.0.0.1:${FASTAPI_PORT}` },
    }, (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.status(502).send(`${faArm} upstream (FastAPI) is not running`);
      else res.end();
    });
    req.pipe(upstream);
  });
}

app.use(compression(COMPRESSION));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

// Cross-origin isolation headers on every response (FastAPI sends the same).
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use('/shared', express.static(SHARED_DIR));
app.use('/htmx', express.static(join(VENDOR_DIR, 'htmx')));
app.use('/domx', express.static(join(VENDOR_DIR, 'domx')));
app.use('/genx', express.static(join(VENDOR_DIR, 'genx')));
// Reload persistence for Arms 10 and 11 (fastapi-server.py serves it too).
app.get('/lib/htmx-replay.js', (req, res) => res.sendFile(join(__dirname, 'lib', 'htmx-replay.js')));
app.use('/data', express.static(DATA_DIR));

// Arm 6 JSON API (page, record, edit, delete, cell, bulk).
app.use(`/:archetype/${ARM6}/api`, arm6.router);

// Arm 10 htmx partial routes.
const htmxModules = new Map();
for (const arch of ARCHETYPES) {
  const serverPath = join(__dirname, arch, HTMX_ARM, 'server.js');
  if (!existsSync(serverPath)) continue;
  const mod = await import(serverPath);
  htmxModules.set(arch, mod);
  if (mod.partialRouter) app.use(`/${arch}/${HTMX_ARM}`, mod.partialRouter(DATA_DIR, arch));
}

// Arm 13 htmx partial routes (conventional class/object patterns).
const htmx13Modules = new Map();
for (const arch of ARCHETYPES) {
  const serverPath = join(__dirname, arch, HTMX_ARM13, 'server.js');
  if (!existsSync(serverPath)) continue;
  const mod = await import(serverPath);
  htmx13Modules.set(arch, mod);
  if (mod.partialRouter) app.use(`/${arch}/${HTMX_ARM13}`, mod.partialRouter(DATA_DIR, arch));
}

// Built SSR server bundles, loaded once.
const ssrModules = new Map();
async function ssrModule(archetype, arm) {
  const key = `${archetype}/${arm}`;
  if (!ssrModules.has(key)) {
    const serverPath = join(__dirname, archetype, arm, 'dist', 'server.mjs');
    if (!existsSync(serverPath)) return null;
    ssrModules.set(key, await import(serverPath));
  }
  return ssrModules.get(key);
}

function parseRows(query) {
  if (query.rows === undefined) return '1000';
  if (typeof query.rows !== 'string' || !ALLOWED_SIZES.includes(query.rows)) {
    throw new BadRequest(`rows must be one of ${ALLOWED_SIZES.join(', ')}`);
  }
  return query.rows;
}

// Dashboard auto-refresh interval in seconds: ?refresh=N, default 60, and 0
// turns the timer off (the harness does this and fires each refresh itself).
// fastapi-server.py applies the same rule.
const DEFAULT_REFRESH_SECONDS = 60;
const MAX_REFRESH_SECONDS = 3600;
function parseRefresh(query) {
  if (query.refresh === undefined) return DEFAULT_REFRESH_SECONDS;
  if (typeof query.refresh !== 'string' || !/^\d{1,4}$/.test(query.refresh) || Number(query.refresh) > MAX_REFRESH_SECONDS) {
    throw new BadRequest(`refresh must be an integer from 0 to ${MAX_REFRESH_SECONDS}`);
  }
  return Number(query.refresh);
}

function page({ archetype, arm, rows, appHtml = '', ssrData, refreshSeconds, loadedAt }) {
  const config = { archetype, arm, rows: Number(rows), dataUrl: `/data/${archetype}/${rows}.json` };
  if (refreshSeconds !== undefined) config.refreshSeconds = refreshSeconds;
  if (loadedAt !== undefined) config.loadedAt = loadedAt;
  const ssrScript = ssrData === undefined ? '' : `\n  <script>window.__SSR_DATA__ = ${scriptJson(ssrData)};</script>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Benchmark: ${archetype} / ${arm}</title>
  <link rel="stylesheet" href="/shared/styles.css">
</head>
<body>
  <div id="root">${appHtml}</div>
  <script>window.__BENCHMARK_CONFIG__ = ${scriptJson(config)};</script>${ssrScript}
  <script type="module" src="/${archetype}/${arm}/dist/app.js"></script>
</body>
</html>`;
}

app.get('/:archetype/:arm/', route(async (req, res) => {
  const { archetype, arm } = req.params;
  if (!ARCHETYPES.includes(archetype)) return res.status(404).send('Unknown archetype');
  const rows = parseRows(req.query);
  const refreshSeconds = archetype === 'dashboard' ? parseRefresh(req.query) : undefined;

  if (arm === HTMX_ARM || arm === HTMX_ARM13) {
    const mods = arm === HTMX_ARM ? htmxModules : htmx13Modules;
    const mod = mods.get(archetype);
    if (!mod) return res.status(404).send(`Not found: ${archetype}/${arm}/server.js`);
    const timer = createTimer();
    const html = await mod.render(join(DATA_DIR, 'sqlite', `${rows}.sqlite`), { archetype, arm, rows, refreshSeconds }, timer);
    res.setHeader('Server-Timing', timer.header());
    return res.send(html);
  }

  const known = CSR_ARMS.includes(arm) || FULL_DATA_SSR_ARMS.includes(arm) || arm === ARM6;
  if (!known) return res.status(404).send('Unknown arm');
  if (!existsSync(join(__dirname, archetype, arm, 'dist', 'app.js'))) {
    return res.status(404).send(`Not built: ${archetype}/${arm}. Run: node build.js ${archetype}`);
  }

  if (CSR_ARMS.includes(arm)) return res.send(page({ archetype, arm, rows, refreshSeconds }));

  const mod = await ssrModule(archetype, arm);
  if (!mod) return res.status(404).send(`Server bundle not built: ${archetype}/${arm}`);
  const timer = createTimer();
  let appHtml;
  let ssrData;
  let loadedAt;

  if (arm === ARM6) {
    if (archetype === 'form') {
      ssrData = timer.time('load', () => firstFormRecord(rows));
    } else {
      // Page 1 from SQLite. Opening the working copy is setup (untimed).
      const db = arm6.open(archetype, rows);
      ssrData = timer.time('load', () => arm6.firstPage(archetype, db));
    }
    appHtml = timer.time('render', () => mod.render(ssrData));
  } else {
    // Arms 7-9: every row. The bundle times its own map and render phases.
    ssrData = timer.time('load', () => loadAllRows(archetype, rows));
    // The dashboard's last-updated stamp; the client hydrates with it.
    if (archetype === 'dashboard') loadedAt = new Date().toISOString();
    const result = mod.render(ssrData, { loadedAt });
    if (result.timing.map !== undefined) timer.add('map', result.timing.map);
    timer.add('render', result.timing.render);
    appHtml = result.html;
  }

  const html = timer.time('serialize', () => page({ archetype, arm, rows, appHtml, ssrData, refreshSeconds, loadedAt }));
  res.setHeader('Server-Timing', timer.header());
  res.send(html);
}));

app.use('/:archetype/:arm/dist', (req, res, next) => {
  const { archetype, arm } = req.params;
  if (!ARCHETYPES.includes(archetype)) return next();
  express.static(join(__dirname, archetype, arm, 'dist'))(req, res, next);
});

// One error handler for every route: bad input is a 400, anything else a 500.
// The process keeps serving either way.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status === 400 || err.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).type('text/plain').send(status === 400 ? `Bad request: ${err.message}` : 'Internal server error');
});

const server = app.listen(PORT, () => {
  console.log(`Benchmark server: http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/table/2-redux/?rows=1000`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    arm6.closeAll();
    for (const db of formDbs.values()) db.close();
    for (const mod of htmxModules.values()) mod.close?.();
    for (const mod of htmx13Modules.values()) mod.close?.();
    server.close(() => process.exit(0));
  });
}
