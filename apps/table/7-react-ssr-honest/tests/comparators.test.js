import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { compare_string, compare_number, compare_boolean } from '../lib.js';

describe('compare_string', () => {
  it('returns 0 for equal strings', () => {
    strictEqual(compare_string('apple', 'apple'), 0);
  });

  it('returns -1 when first is before second', () => {
    strictEqual(compare_string('apple', 'banana'), -1);
  });

  it('returns 1 when first is after second', () => {
    strictEqual(compare_string('banana', 'apple'), 1);
  });

  it('compares case-insensitively', () => {
    strictEqual(compare_string('Apple', 'apple'), 0);
  });
});

describe('compare_number', () => {
  it('returns 0 for equal numbers', () => {
    strictEqual(compare_number(42, 42), 0);
  });

  it('returns -1 when first is smaller', () => {
    strictEqual(compare_number(10, 20), -1);
  });

  it('returns 1 when first is larger', () => {
    strictEqual(compare_number(20, 10), 1);
  });
});

describe('compare_boolean', () => {
  it('returns 0 for both false', () => {
    strictEqual(compare_boolean(false, false), 0);
  });

  it('returns 0 for both true', () => {
    strictEqual(compare_boolean(true, true), 0);
  });

  it('returns -1 for false before true', () => {
    strictEqual(compare_boolean(false, true), -1);
  });

  it('returns 1 for true before false', () => {
    strictEqual(compare_boolean(true, false), 1);
  });
});
