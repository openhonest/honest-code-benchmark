import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { next_step } from '../lib.js';

const filled = {
  firstName: 'Alice', lastName: 'Smith', email: 'a@b.com', phone: '555',
  street: '123 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

describe('next_step', () => {
  it('valid step 1 returns 2', () => {
    const result = next_step(filled, 1);
    strictEqual(result, 2);
  });

  it('invalid step 1 returns errors', () => {
    const result = next_step({ ...filled, firstName: '' }, 1);
    strictEqual(typeof result, 'object');
    strictEqual(result.firstName, true);
  });

  it('step 3 business with missing company returns errors', () => {
    const biz = { ...filled, accountType: 'business', companyName: '' };
    const result = next_step(biz, 3);
    strictEqual(typeof result, 'object');
    strictEqual(result.companyName, true);
  });

  it('step 3 individual advances to 4', () => {
    const result = next_step(filled, 3);
    strictEqual(result, 4);
  });
});
