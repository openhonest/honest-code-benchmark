#!/usr/bin/env node
// INP vs interaction-to-settled comparison for Arms 1 and 5.
//
// Boris Petrov (issue #2, finding 1) observed that Arm 5's update path
// (MutationObserver → rAF → React state bump) defers work past the first
// paint, so Event Timing (and therefore INP) stops the clock before the
// re-render runs. This script measures both metrics side by side.
//
// Usage:
//   node src/compare-inp.js [--base http://127.0.0.1:4000] [--size 100000] [--runs 5]

import { chromium } from 'playwright';
import * as webVitalsCollector from './collectors/web-vitals.js';
import tableInteraction from './interactions/table.js';
import { networkProfiles, deviceProfiles } from './profiles.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
  };
  return {
    base: get('--base', 'http://127.0.0.1:4000'),
    size: get('--size', '100000'),
    runs: parseInt(get('--runs', '5'), 10),
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

async function runOnce(browser, url, collector, interact) {
  const net = networkProfiles[0]; // 0ms
  const dev = deviceProfiles[0]; // desktop

  const context = await browser.newContext({ bypassCSP: false, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);

  await collector.beforeRun(page, cdpSession);
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false, latency: net.latency,
    downloadThroughput: net.downloadThroughput, uploadThroughput: net.uploadThroughput,
  });
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: dev.cpuThrottling });
  await page.addInitScript(collector.initScript);

  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForTimeout(2000);

  await interact(page);
  await page.waitForTimeout(6000);

  const metrics = await collector.afterRun(page, cdpSession);
  await cdpSession.detach();
  await context.close();
  return metrics;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function main() {
  const opts = parseArgs();
  const arms = ['1-useState', '5-stateless-domx'];

  console.log(`INP vs interaction-to-settled comparison`);
  console.log(`Table archetype, rows=${opts.size}, ${opts.runs} runs per arm, 0ms/desktop\n`);

  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });

  for (const arm of arms) {
    const url = `${opts.base}/table/${arm}/?rows=${opts.size}`;
    console.log(`--- ${arm} ---`);

    // Warmup
    process.stdout.write('  warmup...');
    try {
      await runOnce(browser, url, webVitalsCollector, tableInteraction);
      process.stdout.write(' done\n');
    } catch (e) {
      process.stdout.write(` failed: ${e.message.split('\n')[0]}\n`);
    }

    const inpValues = [];
    const settledValues = [];
    const perInteraction = [];

    for (let i = 0; i < opts.runs; i++) {
      process.stdout.write(`  run ${i + 1}/${opts.runs}...`);
      try {
        const m = await runOnce(browser, url, webVitalsCollector, tableInteraction);
        inpValues.push(m.inp);
        settledValues.push(m.interactionToSettled);
        if (m.perInteractionSettled) perInteraction.push(m.perInteractionSettled);
        process.stdout.write(` INP=${m.inp?.toFixed(1) ?? 'null'}ms settled=${m.interactionToSettled?.toFixed(1) ?? 'null'}ms events=${m.eventEntryCount} mutations=${m.mutationCount} interactions=${m.interactionCount}\n`);
      } catch (e) {
        process.stdout.write(` FAIL: ${e.message.split('\n')[0]}\n`);
      }
    }

    const validInp = inpValues.filter(v => v != null);
    const validSettled = settledValues.filter(v => v != null);

    console.log(`  INP (p98):                median=${median(validInp).toFixed(1)}ms  values=[${validInp.map(v => v.toFixed(1)).join(', ')}]`);
    console.log(`  interaction-to-settled:    median=${median(validSettled).toFixed(1)}ms  values=[${validSettled.map(v => v.toFixed(1)).join(', ')}]`);
    if (validInp.length && validSettled.length) {
      const ratio = median(validSettled) / median(validInp);
      console.log(`  settled/INP ratio:        ${ratio.toFixed(2)}x`);
    }

    if (perInteraction.length > 0) {
      const sample = perInteraction[0];
      console.log(`  per-interaction settled (run 1): [${sample.map(v => v.toFixed(1)).join(', ')}]`);
    }
    console.log('');
  }

  await browser.close();
}

main();
