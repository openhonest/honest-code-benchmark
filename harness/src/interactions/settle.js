// Waits until the page has no requests in flight, then a short quiet gap.
// Server-driven arms (6, 10, 11) fetch after each action; client arms do
// not, so for them this returns after the gap alone. Same wait for every arm.

const inflight = new WeakMap();

function track(page) {
  if (inflight.has(page)) return;
  const state = { n: 0 };
  inflight.set(page, state);
  page.on('request', () => { state.n++; });
  // A request that started before tracking began can still finish later;
  // never let the count go below zero.
  page.on('requestfinished', () => { state.n = Math.max(0, state.n - 1); });
  page.on('requestfailed', () => { state.n = Math.max(0, state.n - 1); });
}

export async function settle(page, gapMs = 100) {
  track(page);
  const state = inflight.get(page);
  await page.waitForTimeout(gapMs);
  for (let i = 0; i < 200 && state.n > 0; i++) await page.waitForTimeout(25);
}

// Call once before the first action so requests are counted from the start.
export function prepare(page) {
  track(page);
}

// Clicks the control only when it exists and is enabled. Page buttons are
// disabled when a filter leaves a single page, which is a valid state.
export async function clickIfEnabled(page, selector) {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0 || !(await el.isEnabled())) return false;
  await el.click();
  return true;
}
