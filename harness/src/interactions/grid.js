// Interaction script: editable grid (Archetype 5).
//
// Selector contract: td[data-cell=q1..q4] (click to edit; the editor is an
//   <input> inside the same cell; Enter commits), tr[data-row=<id>],
//   [data-role=row-checkbox|select-all|category-filter|bulk-quarter|
//   bulk-value|bulk-fill|totals-row|variance|page-info],
//   [data-action=prev-page|next-page].
//
// Sequence: edit Q1 and Q2 in the first row, select 20 rows, bulk-fill Q3.

import { settle, prepare } from './settle.js';

async function editCell(page, field, value) {
  await page.click(`tbody tr:first-child td[data-cell="${field}"]`);
  const editor = page.locator(`td[data-cell="${field}"] input`).first();
  await editor.waitFor();
  await editor.fill(value);
  await editor.press('Enter');
  await settle(page);
}

export default async function gridInteraction(page) {
  prepare(page);

  await editCell(page, 'q1', '15000');
  await editCell(page, 'q2', '22000');

  const boxes = page.locator('[data-role="row-checkbox"]');
  const n = Math.min(20, await boxes.count());
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).click();
    await settle(page);
  }

  await page.selectOption('[data-role="bulk-quarter"]', 'q3');
  await page.fill('[data-role="bulk-value"]', '18000');
  await page.click('[data-role="bulk-fill"]');
  await settle(page);
}
