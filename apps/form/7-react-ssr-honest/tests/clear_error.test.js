import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { clear_error } from '../lib.js';

describe('clear_error', () => {
  it('removes an existing error', () => {
    const result = clear_error({ email: true, phone: true }, 'email');
    strictEqual(result.email, undefined);
  });

  it('keeps other errors', () => {
    const result = clear_error({ email: true, phone: true }, 'email');
    strictEqual(result.phone, true);
  });

  it('is a no-op for absent error', () => {
    const result = clear_error({}, 'email');
    deepStrictEqual(result, {});
  });

  it('does not mutate the original', () => {
    const original = { email: true };
    clear_error(original, 'email');
    strictEqual(original.email, true);
  });
});
