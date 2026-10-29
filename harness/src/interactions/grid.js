// Interaction script: editable grid (Archetype 5).
//
// Preregistration sequence:
//   Edit a Q1 cell in the first row (verify subtotal and grand total update),
//   tab to Q2 and edit it, select a range of 20 cells in the Q3 column via
//   click then shift-click, bulk-fill a value (verify all 20 cells, their
//   annual totals, affected subtotals, and the grand total update).

export default async function gridInteraction(page) {
  // Click the Q1 cell in the first data row to enter edit mode
  await page.click('tr[data-row="0"] td[data-column="q1"]');
  await page.waitForTimeout(200);

  // Type a new value and press Tab to move to Q2
  await page.keyboard.selectAll();
  await page.keyboard.type('15000');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);

  // Now in Q2 of the same row; type a value and press Enter to commit
  await page.keyboard.selectAll();
  await page.keyboard.type('22000');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Select a range of 20 cells in the Q3 column: click row 0, shift-click row 19
  await page.click('tr[data-row="0"] td[data-column="q3"]');
  await page.waitForTimeout(100);
  await page.click('tr[data-row="19"] td[data-column="q3"]', {
    modifiers: ['Shift'],
  });
  await page.waitForTimeout(200);

  // Bulk fill: type a value in the bulk-fill input and apply
  await page.fill('[data-role="bulk-fill-input"]', '18000');
  await page.click('[data-action="bulk-fill-apply"]');
  await page.waitForTimeout(500);
}
