import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { format_currency } from '../lib.js';

describe('format_currency', () => {
  it('formats a whole number', () => {
    strictEqual(format_currency(1000), '$1,000.00');
  });

  it('formats a decimal value', () => {
    strictEqual(format_currency(1234.5), '$1,234.50');
  });

  it('formats zero', () => {
    strictEqual(format_currency(0), '$0.00');
  });

  it('formats large numbers with commas', () => {
    strictEqual(format_currency(1234567.89), '$1,234,567.89');
  });
});
