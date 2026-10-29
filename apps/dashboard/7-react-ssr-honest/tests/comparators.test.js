import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { compare_string, compare_number } from '../lib.js';

describe('compare_string', () => {
  it('returns 0 for equal strings', () => {
    strictEqual(compare_string('apple', 'apple'), 0);
  });

  it('returns -1 when first comes before second', () => {
    strictEqual(compare_string('apple', 'banana'), -1);
  });

  it('returns 1 when first comes after second', () => {
    strictEqual(compare_string('banana', 'apple'), 1);
  });
});

describe('compare_number', () => {
  it('returns 0 for equal numbers', () => {
    strictEqual(compare_number(42, 42), 0);
  });

  it('returns -1 when first is less', () => {
    strictEqual(compare_number(10, 20), -1);
  });

  it('returns 1 when first is greater', () => {
    strictEqual(compare_number(20, 10), 1);
  });
});
