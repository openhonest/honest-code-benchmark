#!/usr/bin/env node
// Reload persistence check for the htmx arms, 10 and 11 (correctness only,
// no timing). lib/htmx-replay.js saves the last successful htmx request in
// localStorage and replays it after a reload.
//
// For every arm, archetype, and data size:
//   1. Replay. Load the page, take the default state, then sort, filter,
//      page, and select (or, for the form, fill two steps and pick an
//      account type). Hard-reload. The rows, the controls, and the hidden
//      state inputs must match what was on screen before the reload, and
//      must differ from the default.
//   2. Fresh context. A new browser context (empty localStorage) must show
//      the default state.
//   3. Corrupt entry. Overwrite the saved entry with bad JSON and reload.
//      The page must show the default state with no error.
//   4. Parity. After the reload, arms 10 and 11 must show the same row ids,
//      page info, and form step.
//   5. Cloak (arm 11). After the first load, after every step, and after
//      the reload in case 1, no [fx-cloak] element may stay hidden, and
//      each one must end up formatted by genX (it carries fx-raw). An
//      element the cloak revealed early (genx-uncloak) but genX then
//      formatted is counted and printed, not failed: genX's cloak reveals
//      everything still hidden at genx:ready, and a swap replayed after a
//      reload can land just before that event.
// Any uncaught error or HTTP error fails the case, as in `harness --check`.
//
// Usage: node scripts/check-reload-replay.mjs [--base http://127.0.0.1:4000]
//          [--sizes 100,1000] [--arms 10,11] [--archetypes table,form]
// Needs the Node server and the FastAPI server running. Exits 1 on failure.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(HERE, '..', '..', 'harness');
const require = createRequire(join(HARNESS, 'package.json'));
const { chromium } = require('playwright');
const { settle, prepare, clickIfEnabled } = await import(pathToFileURL(join(HARNESS, 'src', 'interactions', 'settle.js')).href);

const ARMS = ['10-htmx-ejs', '11-fastapi-honest-htmx'];
const ARCHETYPES = ['table', 'dashboard', 'browser', 'form', 'grid'];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const base = arg('base', 'http://127.0.0.1:4000');
const sizes = arg('sizes', '100,1000,10000,50000,100000').split(',');
const armFilter = arg('arms', '');
const arms = armFilter ? ARMS.filter((a) => armFilter.split(',').some((p) => a.startsWith(`${p}-`))) : ARMS;
const archetypes = arg('archetypes', ARCHETYPES.join(',')).split(',');

const browser = await chromium.launch({ headless: true });
let pass = 0;
let fail = 0;
let cloakChecked = 0;
const cloakForced = [];
function result(ok, label, detail) {
  if (ok) pass++;
  else { fail++; console.log(`FAIL ${label}${detail ? `: ${detail}` : ''}`); }
}

const visible = (page, sel) => page.locator(`${sel}:visible`).first();

// The check's own wait. settle() from the harness is the preregistered wait
// and stays as it is; this check adds a stricter one on top, so that a slow
// response on a busy machine cannot let the next step start from stale
// hidden inputs. After settle(), it waits until no element has htmx's
// .htmx-request class and no request is in flight, and that has held for
// IDLE_QUIET_MS in a row. It gives up after IDLE_LIMIT_MS.
const IDLE_QUIET_MS = 150;
const IDLE_LIMIT_MS = 60_000;
const pending = new WeakMap();

function trackRequests(page) {
  if (pending.has(page)) return;
  const state = { n: 0 };
  pending.set(page, state);
  page.on('request', () => { state.n++; });
  page.on('requestfinished', () => { state.n = Math.max(0, state.n - 1); });
  page.on('requestfailed', () => { state.n = Math.max(0, state.n - 1); });
}

// Cloak problems seen on each page, filled in by idle() after every wait.
const cloakIssues = new WeakMap();
const CLOAK_LIMIT_MS = 10_000;

async function checkCloak(page) {
  const read = () => page.evaluate(() => {
    const els = [...document.querySelectorAll('[fx-cloak]')];
    return {
      total: els.length,
      hidden: els.filter((el) => getComputedStyle(el).visibility === 'hidden').length,
      forced: els.filter((el) => el.hasAttribute('genx-uncloak')).length,
      unformatted: els.filter((el) => !el.hasAttribute('fx-raw')).length,
    };
  });
  let state = await read();
  const deadline = Date.now() + CLOAK_LIMIT_MS;
  while (state.hidden > 0 && Date.now() < deadline) {
    await page.waitForTimeout(50);
    state = await read();
  }
  const list = cloakIssues.get(page) ?? [];
  list.checked = (list.checked ?? 0) + state.total;
  if (state.hidden) list.push(`${state.hidden} of ${state.total} cloaked elements still hidden`);
  if (state.forced) list.forced = Math.max(list.forced ?? 0, state.forced);
  if (state.unformatted) list.push(`${state.unformatted} of ${state.total} not formatted`);
  cloakIssues.set(page, list);
}

async function idle(page, gapMs) {
  await settle(page, gapMs);
  trackRequests(page);
  const state = pending.get(page);
  const deadline = Date.now() + IDLE_LIMIT_MS;
  let quietSince = null;
  while (Date.now() < deadline) {
    const busy = state.n > 0
      || await page.evaluate(() => document.querySelector('.htmx-request') !== null);
    if (busy) quietSince = null;
    else if (quietSince === null) quietSince = Date.now();
    else if (Date.now() - quietSince >= IDLE_QUIET_MS) { await checkCloak(page); return; }
    await page.waitForTimeout(25);
  }
  throw new Error(`page still busy after ${IDLE_LIMIT_MS / 1000} s`);
}

// The steps each archetype takes before the reload. Each one leaves the page
// in a state that only the server requests produced.
const INTERACT = {
  async table(page) {
    await page.click('th[data-column="name"]');
    await idle(page);
    await page.click('th[data-column="name"]');
    await idle(page);
    await page.fill('[data-role="filter-input"]', 'an');
    await idle(page, 400);
    await clickIfEnabled(page, '[data-action="next-page"]');
    await idle(page);
    await page.locator('[data-role="row-checkbox"]').first().check();
    await idle(page);
  },
  async dashboard(page) {
    await page.fill('[data-role="date-from"]', '2025-01-01');
    await idle(page);
    await page.selectOption('[data-role="category-filter"]', { index: 1 });
    await idle(page);
    await page.selectOption('[data-role="status-filter"]', { index: 1 });
    await idle(page);
    await page.click('th[data-column="amount"]');
    await idle(page);
    await page.click('th[data-column="amount"]');
    await idle(page);
    await clickIfEnabled(page, '[data-action="next-page"]');
    await idle(page);
  },
  async browser(page) {
    await page.click('th[data-column="name"]');
    await idle(page);
    const status = page.locator('[data-role="status-filter"]');
    if ((await status.first().evaluate((el) => el.tagName)) === 'SELECT') {
      await status.first().selectOption({ index: 1 });
    } else {
      await status.nth(1).click();
    }
    await idle(page);
    await clickIfEnabled(page, '[data-action="next-page"]');
    await idle(page);
    await page.click('tbody tr[data-row]:first-child');
    await page.locator('[data-role="detail-panel"]').waitFor();
    await idle(page);
  },
  async form(page) {
    await page.fill('[data-field="firstName"]', 'Jane');
    await page.fill('[data-field="lastName"]', 'Doe');
    await page.fill('[data-field="email"]', 'jane.doe@example.com');
    await page.fill('[data-field="phone"]', '5551234567');
    await visible(page, '[data-role="next-step"]').click();
    await idle(page);
    await page.locator('.form-step[data-step="2"]').waitFor();
    await page.fill('[data-field="street"]', '123 Main St');
    await page.fill('[data-field="city"]', 'Springfield');
    await page.selectOption('[data-field="state"]', 'IL');
    await page.fill('[data-field="zip"]', '62704');
    await page.selectOption('[data-field="country"]', 'US');
    await visible(page, '[data-role="next-step"]').click();
    await idle(page);
    await page.locator('.form-step[data-step="3"]').waitFor();
    await page.selectOption('[data-role="account-type"]', 'business');
    await idle(page);
  },
  async grid(page) {
    await page.selectOption('[data-role="category-filter"]', { index: 1 });
    await idle(page);
    await clickIfEnabled(page, '[data-action="next-page"]');
    await idle(page);
    await page.locator('[data-role="row-checkbox"]').first().check();
    await idle(page);
  },
};

// What the user sees and what the next request would send: row ids, every
// control and hidden input in the swapped region, sort headers, page info,
// the visible form step, and the detail panel. The dashboard's last-updated
// stamp is left out because it changes on every request.
function snapshot(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[id$="-content"]') ?? document.body;
    const text = (sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      rows: [...root.querySelectorAll('tr[data-row]')].map((tr) => tr.dataset.row),
      controls: [...root.querySelectorAll('input, select, textarea')].map((el) => {
        const name = el.name || el.dataset.role || el.dataset.field || el.id || el.type;
        const checkable = el.type === 'checkbox' || el.type === 'radio';
        return `${name}=${checkable ? el.checked : el.value}`;
      }),
      headers: [...root.querySelectorAll('th[data-column]')].map((th) =>
        `${th.dataset.column}:${th.getAttribute('aria-sort') ?? ''}:${th.querySelector('.sort-indicator.active') ? 'active' : ''}:${th.textContent.replace(/\s+/g, ' ').trim()}`),
      pageInfo: text('[data-role="page-info"]'),
      step: [...root.querySelectorAll('.form-step[data-step]')].filter((el) => el.offsetParent !== null).map((el) => el.dataset.step),
      detail: text('[data-role="detail-panel"]'),
    };
  });
}

function diff(a, b) {
  return Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

function watch(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  return errors;
}

async function open(url) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = watch(page);
  prepare(page);
  trackRequests(page);
  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  await page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {});
  await idle(page);
  return { context, page, errors };
}

// A hard reload (cache bypassed), then wait for the replayed request.
async function hardReload(page) {
  const cdp = await page.context().newCDPSession(page);
  await Promise.all([page.waitForEvent('load', { timeout: 120_000 }), cdp.send('Page.reload', { ignoreCache: true })]);
  await cdp.detach();
  await page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => {});
  await idle(page, 300);
}

try {
  for (const rows of sizes) {
    for (const archetype of archetypes) {
      const after = {};
      for (const arm of arms) {
        const url = `${base}/${archetype}/${arm}/?rows=${rows}${archetype === 'dashboard' ? '&refresh=0' : ''}`;
        const tag = `${archetype}/${arm} rows=${rows}`;
        let defaults = null;

        // 1. Replay after a hard reload.
        const { context, page, errors } = await open(url);
        try {
          defaults = await snapshot(page);
          await INTERACT[archetype](page);
          const before = await snapshot(page);
          await hardReload(page);
          const reloaded = await snapshot(page);
          after[arm] = reloaded;
          const problems = [...errors];
          if (diff(before, defaults).length === 0) problems.push('the interactions did not change the page');
          const changed = diff(before, reloaded);
          if (changed.length) problems.push(`after reload, ${changed.join(', ')} changed`);
          result(problems.length === 0, `replay ${tag}`, problems.join('; '));
        } catch (e) {
          result(false, `replay ${tag}`, e.message.split('\n')[0]);
        }

        // 5. No cloaked element stays hidden (arm 11 uses the genX cloak).
        if (arm.startsWith('11-')) {
          const issues = cloakIssues.get(page) ?? [];
          result(issues.length === 0, `cloak ${tag}`, [...new Set(issues)].join('; '));
          cloakChecked += issues.checked ?? 0;
          if (issues.forced) cloakForced.push(`${tag} (${issues.forced})`);
        }

        // 3. A corrupt entry is ignored.
        try {
          errors.length = 0;
          await page.evaluate(() => {
            for (const key of Object.keys(localStorage)) {
              if (key.startsWith('htmx-replay:')) localStorage.setItem(key, '{not json');
            }
          });
          await hardReload(page);
          const reloaded = await snapshot(page);
          const problems = [...errors];
          const changed = defaults ? diff(defaults, reloaded) : ['no default state'];
          if (changed.length) problems.push(`${changed.join(', ')} not default`);
          result(problems.length === 0, `corrupt entry ${tag}`, problems.join('; '));
        } catch (e) {
          result(false, `corrupt entry ${tag}`, e.message.split('\n')[0]);
        }
        await context.close();

        // 2. A fresh context shows the default state.
        const fresh = await open(url);
        try {
          const state = await snapshot(fresh.page);
          const problems = [...fresh.errors];
          const changed = defaults ? diff(defaults, state) : ['no default state'];
          if (changed.length) problems.push(`${changed.join(', ')} not default`);
          result(problems.length === 0, `fresh context ${tag}`, problems.join('; '));
        } catch (e) {
          result(false, `fresh context ${tag}`, e.message.split('\n')[0]);
        }
        await fresh.context.close();
      }

      // 4. Both arms land on the same rows, page, and step.
      if (arms.length > 1) {
        const pick = (s) => s && JSON.stringify([s.rows, s.pageInfo, s.step]);
        const distinct = new Set(arms.map((a) => pick(after[a])));
        result(distinct.size === 1 && !distinct.has(undefined), `parity ${archetype} rows=${rows}`,
          arms.map((a) => `${a}=${after[a]?.rows.slice(0, 3).join(',')}... ${after[a]?.pageInfo ?? ''} step ${after[a]?.step ?? ''}`).join(' '));
      }
    }
  }
} finally {
  await browser.close();
}
console.log(`cloak: ${cloakChecked} cloaked-element inspections across arm 11 pages`);
if (cloakForced.length) console.log(`cloak: revealed early by genX's cloak, then formatted: ${cloakForced.join(', ')}`);
console.log(`reload replay: ${pass} of ${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
