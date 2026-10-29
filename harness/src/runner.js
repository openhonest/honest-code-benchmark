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
//   node src/runner.js --validate
//   node src/runner.js --validate --runs 5

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkProfiles, deviceProfiles } from './profiles.js';
import * as webVitalsCollector from './collectors/web-vitals.js';
import { stubInteraction } from './interactions/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, '..', 'results');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    validate: args.includes('--validate'),
    runs: 5,
    port: 3999,
    timingLevel: 0,
  };
  const runsIdx = args.indexOf('--runs');
  if (runsIdx !== -1 && args[runsIdx + 1]) {
    opts.runs = parseInt(args[runsIdx + 1], 10);
  }
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    opts.port = parseInt(args[portIdx + 1], 10);
  }
  return opts;
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

  await cdpSession.detach();
  await context.close();

  return metrics;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
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

    const fields = ['ttfb', 'fcp', 'lcp', 'tti', 'tbt', 'inp', 'cls', 'peakHeap', 'cdpHeapUsed', 'scriptDuration', 'layoutDuration', 'recalcStyleDuration', 'taskDuration', 'wallClockMs'];
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
      const med = median(values);
      const c = cv(values);

      console.log(`  ${field}: median=${fmt(med)} min=${fmt(values[0])} max=${fmt(values[values.length - 1])} cv=${c.toFixed(3)}`);
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
    console.log('');
  }
}

function writeCSV(allResults) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(RESULTS_DIR, `validate-${timestamp}.csv`);

  const header = 'condition,run,ttfb,fcp,lcp,tti,tbt,inp,cls,cdpHeapUsed,scriptDuration,layoutDuration,recalcStyleDuration,taskDuration,wallClockMs,longTaskCount,layoutShiftCount,layoutCount,recalcStyleCount,interactionCount,bundleTransferSize\n';
  let csv = header;

  for (const [condition, runs] of Object.entries(allResults)) {
    runs.forEach((r, i) => {
      csv += [
        condition, i + 1,
        r.ttfb ?? '', r.fcp ?? '', r.lcp ?? '', r.tti ?? '',
        r.tbt ?? '', r.inp ?? '', r.cls ?? '',
        r.cdpHeapUsed ?? '',
        r.scriptDuration ?? '', r.layoutDuration ?? '',
        r.recalcStyleDuration ?? '', r.taskDuration ?? '',
        r.wallClockMs ?? '', r.longTaskCount ?? '',
        r.layoutShiftCount ?? '', r.layoutCount ?? '',
        r.recalcStyleCount ?? '',
        r.interactionCount ?? '', r.bundleSize?.totalTransferSize ?? '',
      ].join(',') + '\n';
    });
  }

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

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--no-first-run',
      '--disable-sync',
      '--enable-blink-features=ForceEagerMeasureMemory',
    ],
  });

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

const opts = parseArgs();
if (opts.validate) {
  validate(opts).then(({ fail }) => process.exit(fail > 0 ? 1 : 0));
} else {
  console.log('Full run mode not yet implemented. Use --validate.');
}
