import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { compare_string, compare_number } from '../lib.js';

describe('compare_string', () => {
  it('returns -1 when a comes before b', () => {
    strictEqual(compare_string('apple', 'banana'), -1);
  });

  it('returns 0 for equal strings', () => {
    strictEqual(compare_string('hello', 'hello'), 0);
  });

  it('returns 1 when a comes after b', () => {
    strictEqual(compare_string('zebra', 'apple'), 1);
  });

  it('compares case-insensitively', () => {
    strictEqual(compare_string('Alice', 'alice'), 0);
  });
});

describe('compare_number', () => {
  it('returns -1 when a is less than b', () => {
    strictEqual(compare_number(1, 5), -1);
  });

  it('returns 0 for equal numbers', () => {
    strictEqual(compare_number(3, 3), 0);
  });

  it('returns 1 when a is greater than b', () => {
    strictEqual(compare_number(10, 2), 1);
  });
});
