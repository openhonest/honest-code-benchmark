import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { validate_step } from '../lib.js';

const filled = {
  firstName: 'Alice', lastName: 'Smith', email: 'a@b.com', phone: '555',
  street: '123 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

describe('validate_step', () => {
  it('step 1 passes when contact fields are filled', () => {
    const errors = validate_step(filled, 1);
    deepStrictEqual(errors, {});
  });

  it('step 1 fails with missing email', () => {
    const errors = validate_step({ ...filled, email: '' }, 1);
    strictEqual(errors.email, true);
  });

  it('step 2 fails with missing city', () => {
    const errors = validate_step({ ...filled, city: '' }, 2);
    strictEqual(errors.city, true);
  });

  it('step 2 fails with whitespace-only zip', () => {
    const errors = validate_step({ ...filled, zip: '   ' }, 2);
    strictEqual(errors.zip, true);
  });

  it('step 4 has no required fields', () => {
    const errors = validate_step(filled, 4);
    deepStrictEqual(errors, {});
  });
});
