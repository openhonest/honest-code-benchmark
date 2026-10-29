import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { validate_business } from '../lib.js';

describe('validate_business', () => {
  it('passes when business has companyName and taxId', () => {
    const errors = validate_business({ accountType: 'business', companyName: 'Acme', taxId: '123' });
    deepStrictEqual(errors, {});
  });

  it('fails when business is missing companyName', () => {
    const errors = validate_business({ accountType: 'business', companyName: '', taxId: '123' });
    strictEqual(errors.companyName, true);
  });

  it('fails when business is missing taxId', () => {
    const errors = validate_business({ accountType: 'business', companyName: 'Acme', taxId: '' });
    strictEqual(errors.taxId, true);
  });

  it('returns empty for individual account', () => {
    const errors = validate_business({ accountType: 'individual', companyName: '', taxId: '' });
    deepStrictEqual(errors, {});
  });
});
