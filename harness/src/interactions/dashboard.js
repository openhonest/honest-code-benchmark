// Interaction script: dashboard (Archetype 3).
//
// Preregistration sequence:
//   Set a date range and category, click apply, hover over a chart bar,
//   click a table row to open the detail panel, close it.

export default async function dashboardInteraction(page) {
  // Set date range
  await page.fill('[name="startDate"]', '2026-01-01');
  await page.fill('[name="endDate"]', '2026-06-30');
  await page.waitForTimeout(200);

  // Set category filter
  await page.selectOption('[name="category"]', 'Electronics');
  await page.waitForTimeout(200);

  // Apply filters
  await page.click('[data-action="apply-filters"]');
  await page.waitForTimeout(500);

  // Hover over a chart bar to trigger tooltip
  const chartCanvas = page.locator('canvas').first();
  const box = await chartCanvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.waitForTimeout(300);
  }

  // Click a row in the recent orders table to open detail panel
  await page.click('[data-role="orders-table"] tbody tr:nth-child(2)');
  await page.waitForTimeout(500);

  // Close the detail panel
  await page.click('[data-action="close-detail"]');
  await page.waitForTimeout(300);
}
