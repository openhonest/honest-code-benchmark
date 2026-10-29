import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { filter_by_date_range } from '../lib.js';

const order = (id, date) => ({
  id, date, customerName: 'Test', category: 'Electronics',
  amount: 100.00, status: 'pending', items: 1,
});

describe('filter_by_date_range', () => {
  const rows = [
    order(1, '2024-01-01'),
    order(2, '2024-06-15'),
    order(3, '2024-12-31'),
  ];

  it('returns all rows when both from and to are empty', () => {
    deepStrictEqual(filter_by_date_range(rows, '', ''), rows);
  });

  it('keeps rows on or after from date', () => {
    const result = filter_by_date_range(rows, '2024-06-15', '');
    strictEqual(result.length, 2);
    strictEqual(result[0].date, '2024-06-15');
    strictEqual(result[1].date, '2024-12-31');
  });

  it('keeps rows on or before to date', () => {
    const result = filter_by_date_range(rows, '', '2024-06-15');
    strictEqual(result.length, 2);
    strictEqual(result[0].date, '2024-01-01');
    strictEqual(result[1].date, '2024-06-15');
  });

  it('narrows to range when both are set', () => {
    const result = filter_by_date_range(rows, '2024-03-01', '2024-09-01');
    strictEqual(result.length, 1);
    strictEqual(result[0].date, '2024-06-15');
  });

  it('boundaries are inclusive', () => {
    const result = filter_by_date_range(rows, '2024-06-15', '2024-06-15');
    strictEqual(result.length, 1);
    strictEqual(result[0].date, '2024-06-15');
  });
});
