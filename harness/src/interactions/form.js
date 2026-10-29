// Interaction script: multi-step form (Archetype 1).
//
// Matches the preregistration interaction sequence:
//   Fill all fields in steps 1-3, toggle business account type,
//   navigate back and forward, submit on step 4.

export default async function formInteraction(page) {
  // Step 1: personal information
  await page.fill('[name="firstName"]', 'Jane');
  await page.fill('[name="lastName"]', 'Doe');
  await page.fill('[name="email"]', 'jane.doe@example.com');
  await page.fill('[name="phone"]', '5551234567');
  await page.selectOption('[name="accountType"]', 'business');
  await page.waitForTimeout(200);

  // Conditional fields appear for business account
  await page.fill('[name="companyName"]', 'Acme Corp');
  await page.fill('[name="taxId"]', '12-3456789');
  await page.fill('[name="poNumber"]', 'PO-2026-001');

  await page.click('[data-action="next"]');
  await page.waitForTimeout(300);

  // Step 2: shipping address
  await page.fill('[name="street"]', '123 Main St');
  await page.fill('[name="city"]', 'Springfield');
  await page.selectOption('[name="state"]', 'IL');
  await page.fill('[name="zip"]', '62704');
  await page.selectOption('[name="country"]', 'US');
  await page.check('[name="sameAsBilling"]');
  await page.waitForTimeout(200);

  await page.click('[data-action="next"]');
  await page.waitForTimeout(300);

  // Step 3: payment
  await page.fill('[name="cardNumber"]', '4111111111111111');
  await page.fill('[name="expiration"]', '12/28');
  await page.fill('[name="cvv"]', '123');
  await page.fill('[name="cardholderName"]', 'Jane Doe');
  await page.waitForTimeout(200);

  // Navigate back to step 2, then forward again
  await page.click('[data-action="back"]');
  await page.waitForTimeout(300);
  await page.click('[data-action="next"]');
  await page.waitForTimeout(300);

  // Step 4: review and submit
  await page.click('[data-action="next"]');
  await page.waitForTimeout(300);
  await page.click('[data-action="submit"]');
  await page.waitForTimeout(500);
}
