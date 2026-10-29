import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { format_review } from '../lib.js';

const individual = {
  firstName: 'Alice', lastName: 'Smith', email: 'a@b.com', phone: '555',
  street: '123 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

const business = {
  ...individual,
  accountType: 'business', companyName: 'Acme', taxId: '12-345', poNumber: '',
};

describe('format_review', () => {
  it('includes Name line for individual', () => {
    const lines = format_review(individual);
    const name = lines.find(l => l.label === 'Name');
    ok(name);
    strictEqual(name.value, 'Alice Smith');
  });

  it('includes Email line', () => {
    const lines = format_review(individual);
    ok(lines.find(l => l.label === 'Email'));
  });

  it('includes Company and Tax ID for business', () => {
    const lines = format_review(business);
    ok(lines.find(l => l.label === 'Company'));
    ok(lines.find(l => l.label === 'Tax ID'));
  });

  it('omits PO Number when blank', () => {
    const lines = format_review(business);
    ok(!lines.find(l => l.label === 'PO Number'));
  });

  it('includes PO Number when filled', () => {
    const lines = format_review({ ...business, poNumber: 'PO-999' });
    const po = lines.find(l => l.label === 'PO Number');
    ok(po);
    strictEqual(po.value, 'PO-999');
  });
});
