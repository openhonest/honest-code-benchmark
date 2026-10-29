// Interaction script: large dataset browser (Archetype 4).
//
// Preregistration sequence:
//   Scroll to row ~500, search for a name, click a result,
//   shift-click to select a range, apply a batch status update.

export default async function browserInteraction(page) {
  const viewport = page.locator('[data-role="virtual-list"]');

  // Scroll to approximately row 500 (row height 48px, so ~24000px)
  await viewport.evaluate(el => { el.scrollTop = 24000; });
  await page.waitForTimeout(500);

  // Search for a name
  await page.fill('[data-role="search-input"]', 'Anderson');
  await page.waitForTimeout(400);

  // Click the first search result to open detail panel
  await page.click('[data-role="virtual-list"] tr:nth-child(1)');
  await page.waitForTimeout(300);

  // Shift-click the fifth result to select a range
  await page.click('[data-role="virtual-list"] tr:nth-child(5)', {
    modifiers: ['Shift'],
  });
  await page.waitForTimeout(300);

  // Apply batch status update
  await page.selectOption('[data-role="batch-status"]', 'archived');
  await page.click('[data-action="apply-batch"]');
  await page.waitForTimeout(500);
}
