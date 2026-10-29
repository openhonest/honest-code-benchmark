// Interaction script: data table (Archetype 2).
//
// Operation vocabulary follows js-framework-benchmark (Krausest) where
// applicable: select, update (inline edit), remove (delete selected).
// Additional operations from the preregistration: sort, filter, paginate.
//
// Preregistration sequence:
//   Sort by two columns, filter by a substring, paginate to page 3,
//   inline-edit one cell, select 5 rows, delete selected.

export default async function tableInteraction(page) {
  // Sort by name ascending
  await page.click('th[data-column="name"]');
  await page.waitForTimeout(300);

  // Sort by name descending (second click)
  await page.click('th[data-column="name"]');
  await page.waitForTimeout(300);

  // Sort by salary ascending (clears name sort, sorts salary)
  await page.click('th[data-column="salary"]');
  await page.waitForTimeout(300);

  // Filter by substring
  await page.fill('[data-role="filter-input"]', 'Smith');
  await page.waitForTimeout(400);

  // Paginate to page 3
  await page.click('[data-action="next-page"]');
  await page.waitForTimeout(300);
  await page.click('[data-action="next-page"]');
  await page.waitForTimeout(300);

  // Clear filter to get full dataset back
  await page.fill('[data-role="filter-input"]', '');
  await page.waitForTimeout(400);

  // Inline edit: double-click a name cell, change value, press Enter
  await page.dblclick('td[data-column="name"]:first-of-type');
  await page.waitForTimeout(200);
  await page.keyboard.selectAll();
  await page.keyboard.type('Edited Name');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // Select 5 rows via checkboxes
  const checkboxes = page.locator('td[data-column="select"] input[type="checkbox"]');
  for (let i = 0; i < 5; i++) {
    await checkboxes.nth(i).check();
    await page.waitForTimeout(100);
  }

  // Delete selected
  await page.click('[data-action="delete-selected"]');
  await page.waitForTimeout(500);
}
