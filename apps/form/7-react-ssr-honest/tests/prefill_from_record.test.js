import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { prefill_from_record } from '../lib.js';

describe('prefill_from_record', () => {
  it('maps all fields from a full record', () => {
    const rec = { firstName: 'Alice', lastName: 'Smith', email: 'a@b.com', phone: '555-1234',
      street: '123 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US',
      accountType: 'business', companyName: 'Acme', taxId: '12-345', poNumber: 'PO-1' };
    const result = prefill_from_record(rec);
    strictEqual(result.firstName, 'Alice');
    strictEqual(result.companyName, 'Acme');
  });

  it('defaults missing fields to empty strings', () => {
    const result = prefill_from_record({ firstName: 'Bob' });
    strictEqual(result.lastName, '');
    strictEqual(result.email, '');
    strictEqual(result.phone, '');
  });

  it('defaults missing accountType to individual', () => {
    const result = prefill_from_record({});
    strictEqual(result.accountType, 'individual');
  });

  it('returns all defaults for empty record', () => {
    const result = prefill_from_record({});
    strictEqual(result.firstName, '');
    strictEqual(result.street, '');
    strictEqual(result.accountType, 'individual');
  });
});
