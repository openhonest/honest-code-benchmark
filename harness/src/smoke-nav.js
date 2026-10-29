#!/usr/bin/env node

// Smoke test: navigate to every arm × archetype, verify the page loads
// and renders content. Does not run interaction scripts (those need
// data-attribute wiring that is not yet in every arm).
//
// Checks per arm:
//   1. Page loads (HTTP 200, no navigation timeout)
//   2. Body has content (not empty/error page)
//   3. No uncaught page errors
//   4. For SSR/htmx/FastAPI arms: Server-Timing header present
//
// Usage:
//   node src/smoke-nav.js --node-port 4000 --fastapi-port 4001

import { chromium } from 'playwright';

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
const SSR_HTMX_ARMS = new Set([
  '6-react-ssr-stateless-domx', '7-react-ssr-honest',
  '8-react-ssr-domain-classes', '9-react-ssr-conventional',
  '10-htmx-ejs', '11-fastapi-honest-htmx',
]);
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
  };
}

async function smokeOne(browser, url, arm) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const checks = [];

  page.on('pageerror', err => errors.push(err.message));

  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    checks.push({ name: 'load', ok: response.status() === 200, detail: `HTTP ${response.status()}` });

    // Wait for CSR arms to render (they start with empty #root)
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body');
    const hasContent = bodyText && bodyText.trim().length > 50;
    checks.push({ name: 'content', ok: hasContent, detail: `${(bodyText || '').trim().length} chars` });

    const noErrors = errors.length === 0;
    checks.push({ name: 'no-errors', ok: noErrors, detail: errors.length > 0 ? errors[0].substring(0, 80) : '' });

    if (SSR_HTMX_ARMS.has(arm)) {
      const timing = response.headers()['server-timing'];
      checks.push({ name: 'server-timing', ok: !!timing, detail: timing || 'missing' });
    }

    return checks;
  } catch (e) {
    return [{ name: 'load', ok: false, detail: e.message.split('\n')[0] }];
  } finally {
    await context.close();
  }
}

async function main() {
  const opts = parseArgs();
  const total = ARMS.length * ARCHETYPES.length;

  console.log(`Smoke testing ${total} combinations\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-extensions', '--no-first-run'],
  });

  let pass = 0, fail = 0;
  const failures = [];

  for (const arch of ARCHETYPES) {
    console.log(`--- ${arch} ---`);
    for (const arm of ARMS) {
      const port = FASTAPI_ARMS.has(arm) ? opts.fastapiPort : opts.nodePort;
      const url = `http://localhost:${port}/${arch}/${arm}/?rows=100`;

      const checks = await smokeOne(browser, url, arm);
      const allOk = checks.every(c => c.ok);
      const summary = checks.map(c => `${c.name}:${c.ok ? 'ok' : 'FAIL'}`).join(' ');

      if (allOk) {
        console.log(`  ${arm}: ${summary}`);
        pass++;
      } else {
        const failedChecks = checks.filter(c => !c.ok).map(c => `${c.name}(${c.detail})`).join(', ');
        console.log(`  ${arm}: FAIL — ${failedChecks}`);
        fail++;
        failures.push(`${arch}/${arm}: ${failedChecks}`);
      }
    }
    console.log('');
  }

  await browser.close();

  console.log(`=== ${pass} pass, ${fail} fail out of ${total} ===`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ${f}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main();
