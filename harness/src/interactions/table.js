// Interaction script: data table (Archetype 2).
//
// Selector contract (task-specification.md, "Selector contract"):
//   th[data-column=<key>], td[data-column=<key>], tr[data-row=<id>],
//   [data-role=filter-input|select-all|row-checkbox|page-info],
//   [data-action=prev-page|next-page|delete-selected].
//
// Sequence: sort by name twice, sort by salary, filter "Smith", page
// forward twice, clear the filter, double-click a name cell and edit it,
// select five rows, delete the selection.

import { settle, prepare, clickIfEnabled } from './settle.js';

export default async function tableInteraction(page) {
  prepare(page);

  await page.click('th[data-column="name"]'); // name ascending
  await settle(page);
  await page.click('th[data-column="name"]'); // name descending
  await settle(page);
  await page.click('th[data-column="salary"]'); // salary ascending
  await settle(page);

  await page.fill('[data-role="filter-input"]', 'Smith');
  await settle(page, 400); // the filter is debounced in some arms

  await clickIfEnabled(page, '[data-action="next-page"]');
  await settle(page);
  await clickIfEnabled(page, '[data-action="next-page"]');
  await settle(page);

  // Clear the filter so the edit and delete act on the full dataset.
  await page.fill('[data-role="filter-input"]', '');
  await settle(page, 400);

  await page.dblclick('tbody tr:first-child td[data-column="name"]');
  const editor = page.locator('td[data-column="name"] input').first();
  await editor.waitFor();
  await editor.fill('Edited Name');
  await editor.press('Enter');
  await settle(page);

  const boxes = page.locator('[data-role="row-checkbox"]');
  const n = Math.min(5, await boxes.count());
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).click();
    await settle(page);
  }

  await clickIfEnabled(page, '[data-action="delete-selected"]');
  await settle(page);
}
