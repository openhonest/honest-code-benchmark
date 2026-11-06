// Interaction script: dashboard (Archetype 3).
//
// Selector contract: [data-role=date-from|date-to|category-filter|
//   status-filter|total-orders|total-revenue|avg-order|unique-customers|
//   page-info|last-updated], th[data-column=<key>], tr[data-row=<id>],
//   [data-action=prev-page|next-page].
//
// Sequence: set a date range, choose a category, choose a status, sort by
// amount twice, page forward, refresh.
//
// The runner loads the dashboard with refresh=0, so the timer never fires on
// its own. The refresh step fires the page-wide event instead, waits for the
// last-updated stamp to change, and checks that the filters, sort, page and
// rows came through unchanged.

import { settle, prepare, clickIfEnabled } from './settle.js';

export default async function dashboardInteraction(page) {
  prepare(page);

  await page.fill('[data-role="date-from"]', '2025-01-01');
  await settle(page);
  await page.fill('[data-role="date-to"]', '2025-12-31');
  await settle(page);

  await page.selectOption('[data-role="category-filter"]', { index: 1 });
  await settle(page);
  await page.selectOption('[data-role="status-filter"]', { index: 1 });
  await settle(page);

  await page.click('th[data-column="amount"]');
  await settle(page);
  await page.click('th[data-column="amount"]');
  await settle(page);

  await clickIfEnabled(page, '[data-action="next-page"]');
  await settle(page);

  await refreshDashboard(page);
  await settle(page);
}

// What a refresh must leave alone. The data does not change between loads,
// so the visible rows must match too.
export function dashboardState(page) {
  return page.evaluate(() => {
    const val = (role) => document.querySelector(`[data-role="${role}"]`)?.value ?? null;
    const active = document.querySelector('th[data-column] .sort-indicator.active');
    return {
      dateFrom: val('date-from'),
      dateTo: val('date-to'),
      category: val('category-filter'),
      status: val('status-filter'),
      sortColumn: active ? active.closest('th').dataset.column : '',
      sortMark: active ? active.textContent.trim() : '',
      pageInfo: document.querySelector('[data-role="page-info"]')?.textContent.trim() ?? null,
      rows: [...document.querySelectorAll('tr[data-row]')].map((tr) => tr.dataset.row),
    };
  });
}

const stamp = (page) => page.getAttribute('[data-role="last-updated"]', 'datetime');

// Fires one refresh and waits for it to land. Throws if the stamp does not
// change or any part of the state moved.
export async function refreshDashboard(page) {
  const before = await dashboardState(page);
  const oldStamp = await stamp(page);
  // A stamp has millisecond resolution; make sure the next one differs.
  await page.waitForTimeout(5);
  await page.evaluate(() => document.body.dispatchEvent(new CustomEvent('dashboard-refresh')));
  await page.waitForFunction(
    (old) => {
      const el = document.querySelector('[data-role="last-updated"]');
      return el && el.getAttribute('datetime') && el.getAttribute('datetime') !== old;
    },
    oldStamp,
  );
  const after = await dashboardState(page);
  for (const key of Object.keys(before)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      throw new Error(`refresh changed ${key}: ${JSON.stringify(before[key])} -> ${JSON.stringify(after[key])}`);
    }
  }
  return after;
}
