#!/usr/bin/env node

// Benchmark harness runner.
//
// Three-layer architecture for reuse:
//   1. Interaction scripts (src/interactions/) — pure Playwright sequences
//   2. Metric collectors (src/collectors/) — pluggable measurement
//   3. Instrumentation wrappers (src/timed.js) — timing levels for app code
//
// The runner orchestrates: create context, apply emulation, inject collector,
// navigate, run interaction, collect metrics.
//
// Usage:
//   node src/runner.js --validate [--runs 5] [--port 3999]
//       Harness self-check against the stub server.
//   node src/runner.js --check [--base http://127.0.0.1:3000] [--sizes 100,1000]
//       Correctness only: runs every archetype's interaction script once per
//       arm with no emulation and no collector, and reports how many complete
//       without an error. It records no metrics.
//   node src/runner.js --full [--base URL] [--runs 30] [--seed 1]
//       [--arms 1-useState,...] [--archetypes table,...] [--sizes 100,...]
//       [--networks 0ms,...] [--devices desktop,mobile]
//       The preregistered run: every condition (arm x archetype x size x
//       network x device) in a seeded random order, one discarded warmup,
//       then --runs measured runs. Each condition's rows are appended to
//       results/full-<seed>.csv as soon as the condition finishes, and
//       conditions already in that file are skipped, so an interrupted run
//       resumes where it stopped.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { networkProfiles, deviceProfiles } from './profiles.js';
import * as webVitalsCollector from './collectors/web-vitals.js';
import { stubInteraction, interactions } from './interactions/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, '..', 'results');

export const ARMS = [
  '1-useState', '2-redux', '3-zustand', '4-signals', '5-stateless-domx',
  '6-react-ssr-stateless-domx', '7-react-ssr-honest',
  '8-react-ssr-domain-classes', '9-react-ssr-conventional',
  '10-htmx-ejs', '11-fastapi-honest-htmx', '12-fastapi-honest-nogenx',
  '13-htmx-ejs-conventional',
];
export const ARCHETYPES = ['form', 'table', 'dashboard', 'browser', 'grid'];
export const SIZES = ['100', '1000', '10000', '50000', '100000'];

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : undefined;
  };
  // `allowed` is the set of valid values; `fallback` is used when the flag is absent.
  const list = (flag, all, fallback = all) => {
    const v = value(flag);
    if (v === undefined) return fallback;
    const picked = v.split(',').map((x) => x.trim()).filter(Boolean);
    const unknown = picked.filter((x) => !all.includes(x));
    if (unknown.length) throw new Error(`${flag}: unknown value(s) ${unknown.join(', ')}`);
    return picked;
  };
  const positiveInt = (flag, fallback) => {
    const v = value(flag);
    if (v === undefined) return fallback;
    if (!/^[1-9][0-9]*$/.test(v)) throw new Error(`${flag} must be a positive integer`);
    return Number(v);
  };
  const full = args.includes('--full');
  return {
    validate: args.includes('--validate'),
    check: args.includes('--check'),
    full,
    runs: positiveInt('--runs', full ? 30 : 5),
    port: positiveInt('--port', 3999),
    seed: positiveInt('--seed', 1),
    base: (value('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, ''),
    arms: list('--arms', ARMS),
    archetypes: list('--archetypes', ARCHETYPES),
    sizes: list('--sizes', SIZES, full ? SIZES : ['100', '1000']),
    networks: list('--networks', networkProfiles.map((p) => p.name)),
    devices: list('--devices', deviceProfiles.map((p) => p.name)),
    timingLevel: 0,
  };
}

const BROWSER_ARGS = [
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--no-first-run',
  '--disable-sync',
  '--enable-blink-features=ForceEagerMeasureMemory',
];

// The dashboard loads with its auto-refresh timer off (refresh=0); the
// interaction script fires each refresh itself, so every run is the same.
const appUrl = (base, archetype, arm, rows) =>
  `${base}/${archetype}/${arm}/?rows=${rows}${archetype === 'dashboard' ? '&refresh=0' : ''}`;

// Mulberry32: small seeded PRNG so the condition order is reproducible.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, seed) {
  const rand = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function applyNetworkEmulation(cdpSession, profile) {
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latency,
    downloadThroughput: profile.downloadThroughput,
    uploadThroughput: profile.uploadThroughput,
  });
}

async function applyCpuThrottling(cdpSession, device) {
  await cdpSession.send('Emulation.setCPUThrottlingRate', {
    rate: device.cpuThrottling,
  });
}

// Core run function. Takes a collector and interaction script, both pluggable.
async function runOnce(browser, url, networkProfile, deviceProfile, collector, interact) {
  if (!interact) throw new Error('no interaction script');
  const context = await browser.newContext({
    bypassCSP: false,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);

  // Let the collector set up CDP domains and any other pre-navigation state
  await collector.beforeRun(page, cdpSession);

  await applyNetworkEmulation(cdpSession, networkProfile);
  await applyCpuThrottling(cdpSession, deviceProfile);

  // Inject the collector's observers before page JS runs
  await page.addInitScript(collector.initScript);

  const runStart = Date.now();
  const wallClockStart = new Date(runStart).toISOString();

  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });

  // Settle after initial load
  await page.waitForTimeout(2000);

  // Run the interaction script
  await interact(page);

  // Wait for the TTI quiet window (5s with no Long Tasks, plus margin)
  await page.waitForTimeout(6000);

  // Let the collector read its metrics
  const metrics = await collector.afterRun(page, cdpSession);
  metrics.wallClockMs = Date.now() - runStart;
  metrics.wallClockStart = wallClockStart;

  await cdpSession.detach();
  await context.close();

  return metrics;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function cv(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const stddev = Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length);
  return mean > 0 ? stddev / mean : 0;
}

function printMetricsSummary(allResults) {
  console.log('\n=== Metrics Summary ===\n');

  for (const [condition, runs] of Object.entries(allResults)) {
    console.log(`--- ${condition} (${runs.length} runs) ---`);

    const fields = ['ttfb', 'fcp', 'lcp', 'tti', 'tbt', 'inp', 'interactionToSettled', 'cls', 'peakHeap', 'cdpHeapUsed', 'scriptDuration', 'layoutDuration', 'recalcStyleDuration', 'taskDuration', 'wallClockMs'];
    for (const field of fields) {
      const values = runs.map(r => r[field]).filter(v => v !== null && typeof v === 'number');
      if (values.length === 0) {
        console.log(`  ${field}: NO DATA`);
        continue;
      }
      const fmt = v => ['peakHeap', 'cdpHeapUsed'].includes(field)
        ? (v / 1024 / 1024).toFixed(1) + 'MB'
        : ['scriptDuration', 'layoutDuration', 'recalcStyleDuration', 'taskDuration'].includes(field)
          ? (v * 1000).toFixed(1) + 'ms'
          : field === 'cls'
            ? v.toFixed(4)
            : v.toFixed(1) + 'ms';
      const sorted = [...values].sort((a, b) => a - b);
      const med = median(values);
      const c = cv(values);

      console.log(`  ${field}: median=${fmt(med)} min=${fmt(sorted[0])} max=${fmt(sorted[sorted.length - 1])} cv=${c.toFixed(3)}`);
      if (c > 0.30) console.log(`    !! CV exceeds 0.30 threshold`);
    }

    const first = runs[0];
    if (first.serverTiming) {
      console.log(`  serverTiming: ${JSON.stringify(first.serverTiming)}`);
    } else {
      console.log(`  serverTiming: NOT COLLECTED`);
    }
    console.log(`  memorySource: ${first.memorySource || 'unknown'}`);
    console.log(`  longTaskCount: ${runs.map(r => r.longTaskCount).join(', ')}`);
    console.log(`  layoutShiftCount: ${runs.map(r => r.layoutShiftCount ?? 0).join(', ')}`);
    console.log(`  interactionCount: ${runs.map(r => r.interactionCount).join(', ')}`);
    console.log(`  layoutCount: ${runs.map(r => r.layoutCount ?? 'N/A').join(', ')}`);
    console.log(`  recalcStyleCount: ${runs.map(r => r.recalcStyleCount ?? 'N/A').join(', ')}`);
    console.log(`  bundleTransferSize: ${first.bundleSize?.totalTransferSize || 'N/A'} bytes`);
    console.log(`  mutationCount: ${runs.map(r => r.mutationCount ?? 0).join(', ')}`);
    if (first.interactionToSettled != null) {
      console.log(`  interactionToSettled: ${runs.map(r => r.interactionToSettled?.toFixed(1) ?? 'null').join(', ')} ms`);
    }
    console.log('');
  }
}

const CSV_COLUMNS = [
  'condition', 'run', 'wallClockStart',
  'ttfb', 'fcp', 'lcp', 'tti', 'tbt', 'inp',
  'interactionToSettled', 'cls',
  'serverTimingRenderMs', 'serverTimingMapMs',
  'cdpHeapUsed', 'cdpHeapTotal', 'peakHeap', 'memorySource',
  'scriptDuration', 'layoutDuration', 'recalcStyleDuration', 'taskDuration',
  'longTaskCount', 'layoutShiftCount', 'layoutCount', 'recalcStyleCount',
  'interactionCount', 'eventEntryCount', 'mutationCount',
  'bundleTransferSize', 'wallClockMs',
  'perInteractionSettled',
  'sha256',
];

function hashRow(values) {
  const payload = values.filter(v => v !== '').join('|');
  return createHash('sha256').update(payload).digest('hex');
}

function csvRows(condition, runs) {
  let csv = '';
  {
    runs.forEach((r, i) => {
      const settled = Array.isArray(r.perInteractionSettled) && r.perInteractionSettled.length > 0
        ? r.perInteractionSettled.map(v => v.toFixed(2)).join(';')
        : '';
      const values = [
        condition, i + 1, r.wallClockStart ?? '',
        r.ttfb ?? '', r.fcp ?? '', r.lcp ?? '', r.tti ?? '',
        r.tbt ?? '', r.inp ?? '',
        r.interactionToSettled ?? '', r.cls ?? '',
        r.serverTiming?.render ?? '', r.serverTiming?.map ?? '',
        r.cdpHeapUsed ?? '', r.cdpHeapTotal ?? '',
        r.peakHeap ?? '', r.memorySource ?? '',
        r.scriptDuration ?? '', r.layoutDuration ?? '',
        r.recalcStyleDuration ?? '', r.taskDuration ?? '',
        r.longTaskCount ?? '', r.layoutShiftCount ?? '',
        r.layoutCount ?? '', r.recalcStyleCount ?? '',
        r.interactionCount ?? '', r.eventEntryCount ?? '',
        r.mutationCount ?? '',
        r.bundleSize?.totalTransferSize ?? '', r.wallClockMs ?? '',
        settled,
      ];
      const hash = hashRow(values);
      csv += [...values, hash].join(',') + '\n';
    });
  }
  return csv;
}

function writeCSV(allResults) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(RESULTS_DIR, `validate-${timestamp}.csv`);

  let csv = CSV_COLUMNS.join(',') + '\n';
  for (const [condition, runs] of Object.entries(allResults)) csv += csvRows(condition, runs);

  writeFileSync(path, csv);
  console.log(`Results written to ${path}`);
  return path;
}

async function validate(opts) {
  console.log('=== Harness Validation ===');
  console.log(`Runs per condition: ${opts.runs}`);
  console.log(`Stub server: http://localhost:${opts.port}`);
  console.log('');

  const nets = [networkProfiles[0], networkProfiles[2], networkProfiles[4]];
  const devs = [deviceProfiles[0], deviceProfiles[1]];
  const collector = webVitalsCollector;
  const interact = stubInteraction;

  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });

  const allResults = {};

  for (const net of nets) {
    for (const dev of devs) {
      const condition = `${net.name}_${dev.name}`;
      console.log(`Running: ${condition}`);
      const runs = [];

      // Warmup run (discarded)
      process.stdout.write('  warmup...');
      try {
        await runOnce(browser, `http://localhost:${opts.port}`, net, dev, collector, interact);
        process.stdout.write(' done\n');
      } catch (e) {
        process.stdout.write(` failed: ${e.message}\n`);
      }

      for (let i = 0; i < opts.runs; i++) {
        process.stdout.write(`  run ${i + 1}/${opts.runs}...`);
        try {
          const metrics = await runOnce(
            browser, `http://localhost:${opts.port}`, net, dev, collector, interact,
          );
          runs.push(metrics);
          process.stdout.write(` fcp=${metrics.fcp?.toFixed(1)}ms inp=${metrics.inp ?? 'null'} heap=${metrics.cdpHeapUsed ? (metrics.cdpHeapUsed / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}\n`);
        } catch (e) {
          console.error(`  FAILED: ${e.message}`);
          runs.push({ error: e.message });
        }
      }

      allResults[condition] = runs;
    }
  }

  await browser.close();
  printMetricsSummary(allResults);

  console.log('\n=== Validation Checks ===\n');
  let pass = 0;
  let fail = 0;

  function check(name, ok, detail) {
    if (ok) { console.log(`  + ${name}`); pass++; }
    else    { console.log(`  - ${name}: ${detail}`); fail++; }
  }

  const first = allResults['0ms_desktop']?.[0];
  if (first) {
    check('TTFB collected', typeof first.ttfb === 'number', typeof first.ttfb);
    check('FCP collected', typeof first.fcp === 'number', typeof first.fcp);
    check('LCP collected', typeof first.lcp === 'number', typeof first.lcp);
    check('TTI collected', typeof first.tti === 'number', typeof first.tti);
    check('TBT collected', typeof first.tbt === 'number', typeof first.tbt);
    check('INP collected', typeof first.inp === 'number', 'need interactions');
    check('CLS collected', typeof first.cls === 'number', typeof first.cls);
    check('CDP heap collected', typeof first.cdpHeapUsed === 'number', typeof first.cdpHeapUsed);
    check('Script duration collected', typeof first.scriptDuration === 'number', typeof first.scriptDuration);
    check('Layout duration collected', typeof first.layoutDuration === 'number', typeof first.layoutDuration);
    check('Task duration collected', typeof first.taskDuration === 'number', typeof first.taskDuration);
    check('Server-Timing collected', first.serverTiming !== null, 'null');
    check('Bundle size collected', first.bundleSize?.totalTransferSize > 0, first.bundleSize?.totalTransferSize);
    check('Interactions registered', first.interactionCount > 0, first.interactionCount);
    check('Mutation tracking active', typeof first.mutationCount === 'number' && first.mutationCount > 0, first.mutationCount);
  }

  const fcp0 = allResults['0ms_desktop']?.map(r => r.fcp).filter(v => typeof v === 'number');
  const fcp300 = allResults['300ms_desktop']?.map(r => r.fcp).filter(v => typeof v === 'number');
  if (fcp0?.length && fcp300?.length) {
    check('Network emulation affects FCP',
      median(fcp300) > median(fcp0) + 100,
      `0ms=${median(fcp0).toFixed(1)}ms, 300ms=${median(fcp300).toFixed(1)}ms`);
  }

  const fcpDesk = allResults['0ms_desktop']?.map(r => r.fcp).filter(v => typeof v === 'number');
  const fcpMob = allResults['0ms_mobile']?.map(r => r.fcp).filter(v => typeof v === 'number');
  if (fcpDesk?.length && fcpMob?.length) {
    check('CPU throttling affects FCP',
      median(fcpMob) > median(fcpDesk) * 1.5,
      `desktop=${median(fcpDesk).toFixed(1)}ms, mobile=${median(fcpMob).toFixed(1)}ms`);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  writeCSV(allResults);
  return { pass, fail };
}

// Correctness-only run: each interaction script once per arm, archetype and
// size, with a fresh context, no emulation and no collector. A script
// completes when every step finds its element and the page raises no
// uncaught error. Nothing is timed or recorded.
async function check(opts) {
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  let ok = 0;
  let total = 0;
  for (const size of opts.sizes) {
    for (const archetype of opts.archetypes) {
      for (const arm of opts.arms) {
        total++;
        const context = await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('response', (r) => {
          if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
        });
        try {
          await page.goto(appUrl(opts.base, archetype, arm, size), { waitUntil: 'load', timeout: 120_000 });
          await interactions[archetype](page);
          if (errors.length) throw new Error(errors.join('; '));
          ok++;
        } catch (e) {
          console.log(`FAIL ${archetype}/${arm} rows=${size}: ${e.message.split('\n')[0]}`);
        }
        await context.close();
      }
    }
  }
  await browser.close();
  console.log(`interaction scripts: ${ok} of ${total} completed`);
  return { fail: total - ok };
}

// The preregistered data collection (section 3, "Data collection").
async function fullRun(opts) {
  const nets = networkProfiles.filter((p) => opts.networks.includes(p.name));
  const devs = deviceProfiles.filter((p) => opts.devices.includes(p.name));
  const conditions = [];
  for (const arm of opts.arms)
    for (const archetype of opts.archetypes)
      for (const size of opts.sizes)
        for (const net of nets)
          for (const dev of devs)
            conditions.push({ arm, archetype, size, net, dev, name: `${archetype}_${arm}_${size}_${net.name}_${dev.name}` });
  const order = shuffle(conditions, opts.seed);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const path = join(RESULTS_DIR, `full-${opts.seed}.csv`);
  const done = new Set();
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split('\n').slice(1)) {
      if (line) done.add(line.split(',')[0]);
    }
  } else {
    writeFileSync(path, CSV_COLUMNS.join(',') + '\n');
  }
  writeFileSync(join(RESULTS_DIR, `full-${opts.seed}-order.txt`), order.map((c) => c.name).join('\n') + '\n');

  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  let failed = 0;
  for (const [i, c] of order.entries()) {
    if (done.has(c.name)) continue;
    console.log(`[${i + 1}/${order.length}] ${c.name}`);
    const url = appUrl(opts.base, c.archetype, c.arm, c.size);
    const interact = interactions[c.archetype];
    try {
      await runOnce(browser, url, c.net, c.dev, webVitalsCollector, interact); // warmup, discarded
    } catch (e) {
      console.log(`  warmup failed: ${e.message.split('\n')[0]}`);
    }
    const runs = [];
    for (let r = 0; r < opts.runs; r++) {
      try {
        runs.push(await runOnce(browser, url, c.net, c.dev, webVitalsCollector, interact));
      } catch (e) {
        failed++;
        console.log(`  run ${r + 1} failed: ${e.message.split('\n')[0]}`);
        runs.push({ error: e.message });
      }
    }
    appendFileSync(path, csvRows(c.name, runs));
  }
  await browser.close();
  console.log(`Results in ${path}; ${failed} run(s) failed.`);
  return { fail: failed };
}

const opts = parseArgs();
const mode = opts.validate ? validate : opts.check ? check : opts.full ? fullRun : null;
if (!mode) {
  console.log('Choose a mode: --validate, --check, or --full.');
  process.exit(2);
}
mode(opts).then(({ fail }) => process.exit(fail > 0 ? 1 : 0));
