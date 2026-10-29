// Interaction scripts by archetype name.
// Each is a pure async function: (page) => void.
// No measurement, no assertions. The runner calls these between
// collector.beforeRun and collector.afterRun.

import formInteraction from './form.js';
import tableInteraction from './table.js';
import dashboardInteraction from './dashboard.js';
import browserInteraction from './browser.js';
import gridInteraction from './grid.js';

export const interactions = {
  form: formInteraction,
  table: tableInteraction,
  dashboard: dashboardInteraction,
  browser: browserInteraction,
  grid: gridInteraction,
};

// Stub interaction for harness validation (clicks a button and types in an input)
export async function stubInteraction(page) {
  try {
    await page.click('#interact-btn', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.fill('#interact-input', 'test value', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.click('#interact-btn', { timeout: 5000 });
    await page.waitForTimeout(500);
  } catch (e) {
    console.warn('  interaction failed:', e.message);
  }
}
