// Interaction script: large dataset browser (Archetype 4).
//
// Selector contract: [data-role=search-input|status-filter|detail-panel|
//   detail-close|page-info], th[data-column=<key>], tr[data-row=<id>],
//   [data-action=prev-page|next-page].
//
// Sequence: page forward, search for "Taylor" (a surname present at every
// data size), open the first result in the detail panel, close it, filter
// by a status, sort by name.

import { settle, prepare, clickIfEnabled } from './settle.js';

export default async function browserInteraction(page) {
  prepare(page);

  await clickIfEnabled(page, '[data-action="next-page"]');
  await settle(page);

  await page.fill('[data-role="search-input"]', 'Taylor');
  await settle(page, 400);

  await page.click('tbody tr[data-row]:first-child');
  await page.locator('[data-role="detail-panel"]').waitFor();
  await settle(page);
  await page.click('[data-role="detail-close"]');
  await settle(page);

  // A status filter is a <select> in some arms and a button group in others.
  const status = page.locator('[data-role="status-filter"]');
  if ((await status.first().evaluate((el) => el.tagName)) === 'SELECT') {
    await status.first().selectOption({ index: 1 });
  } else {
    await status.nth(1).click();
  }
  await settle(page);

  await page.click('th[data-column="name"]');
  await settle(page);
}
