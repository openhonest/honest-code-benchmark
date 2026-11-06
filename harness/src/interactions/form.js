// Interaction script: multi-step form (Archetype 1).
//
// Selector contract: .form-step[data-step=1..4] on the visible step,
//   [data-field=<name>] on every input and select,
//   [data-role=account-type|next-step|prev-step|submit|error].
//
// Sequence: fill step 1, next; fill step 2, next; switch to a business
// account and fill its fields, back, forward; next to review; submit.

import { settle, prepare } from './settle.js';

const visible = (page, sel) => page.locator(`${sel}:visible`).first();

async function next(page) {
  await visible(page, '[data-role="next-step"]').click();
  await settle(page);
}

export default async function formInteraction(page) {
  prepare(page);

  // Client-rendered arms prefill the form from the data file after load.
  // Wait for that, or the late prefill overwrites the values typed below.
  await page.waitForFunction(() => document.querySelector('[data-field="firstName"]')?.value);

  await page.fill('[data-field="firstName"]', 'Jane');
  await page.fill('[data-field="lastName"]', 'Doe');
  await page.fill('[data-field="email"]', 'jane.doe@example.com');
  await page.fill('[data-field="phone"]', '5551234567');
  await next(page);

  await page.locator('.form-step[data-step="2"]').waitFor();
  await page.fill('[data-field="street"]', '123 Main St');
  await page.fill('[data-field="city"]', 'Springfield');
  await page.selectOption('[data-field="state"]', 'IL');
  await page.fill('[data-field="zip"]', '62704');
  await page.selectOption('[data-field="country"]', 'US');
  await next(page);

  await page.locator('.form-step[data-step="3"]').waitFor();
  await page.selectOption('[data-role="account-type"]', 'business');
  await settle(page);
  await page.fill('[data-field="companyName"]', 'Acme Corp');
  await page.fill('[data-field="taxId"]', '12-3456789');
  await page.fill('[data-field="poNumber"]', 'PO-2026-001');

  await visible(page, '[data-role="prev-step"]').click();
  await settle(page);
  await page.locator('.form-step[data-step="2"]').waitFor();
  await next(page);
  await page.locator('.form-step[data-step="3"]').waitFor();
  await next(page);

  await page.locator('.form-step[data-step="4"]').waitFor();
  await visible(page, '[data-role="submit"]').click();
  await settle(page);
}
