import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { filter_by_status } from '../lib.js';

const order = (id, status) => ({
  id, date: '2024-01-01', customerName: 'Test', category: 'Electronics',
  amount: 100.00, status, items: 1,
});

describe('filter_by_status', () => {
  const rows = [
    order(1, 'pending'),
    order(2, 'shipped'),
    order(3, 'delivered'),
  ];

  it('returns all rows when status is "All"', () => {
    deepStrictEqual(filter_by_status(rows, 'All'), rows);
  });

  it('keeps only rows matching the status', () => {
    const result = filter_by_status(
      [order(1, 'pending'), order(2, 'shipped'), order(3, 'pending')],
      'pending',
    );
    strictEqual(result.length, 2);
    result.forEach(r => strictEqual(r.status, 'pending'));
  });

  it('returns empty when no rows match', () => {
    const result = filter_by_status(rows, 'cancelled');
    strictEqual(result.length, 0);
  });

  it('uses exact match not substring', () => {
    const result = filter_by_status(rows, 'ship');
    strictEqual(result.length, 0);
  });
});
