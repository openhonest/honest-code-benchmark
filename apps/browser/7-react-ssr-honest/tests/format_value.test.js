import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { format_value } from '../lib.js';

describe('format_value', () => {
  it('formats a whole dollar amount', () => {
    strictEqual(format_value(1500), '$1,500');
  });

  it('formats zero', () => {
    strictEqual(format_value(0), '$0');
  });

  it('formats a large value with comma grouping', () => {
    strictEqual(format_value(1234567), '$1,234,567');
  });
});
