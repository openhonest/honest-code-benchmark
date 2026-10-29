import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { update_field } from '../lib.js';

describe('update_field', () => {
  const fields = { firstName: 'Alice', lastName: 'Smith', email: 'a@b.com' };

  it('updates a single field', () => {
    const result = update_field(fields, 'firstName', 'Bob');
    strictEqual(result.firstName, 'Bob');
  });

  it('leaves other fields unchanged', () => {
    const result = update_field(fields, 'firstName', 'Bob');
    strictEqual(result.lastName, 'Smith');
  });

  it('does not mutate the original', () => {
    update_field(fields, 'email', 'c@d.com');
    strictEqual(fields.email, 'a@b.com');
  });
});
