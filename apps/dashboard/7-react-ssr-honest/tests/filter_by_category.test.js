import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { filter_by_category } from '../lib.js';

const order = (id, category) => ({
  id, date: '2024-01-01', customerName: 'Test', category,
  amount: 100.00, status: 'pending', items: 1,
});

describe('filter_by_category', () => {
  const rows = [
    order(1, 'Electronics'),
    order(2, 'Clothing'),
    order(3, 'Food'),
  ];

  it('returns all rows when category is "All"', () => {
    deepStrictEqual(filter_by_category(rows, 'All'), rows);
  });

  it('keeps only rows matching the category', () => {
    const result = filter_by_category(
      [order(1, 'Electronics'), order(2, 'Clothing'), order(3, 'Electronics')],
      'Electronics',
    );
    strictEqual(result.length, 2);
    result.forEach(r => strictEqual(r.category, 'Electronics'));
  });

  it('returns empty when no rows match', () => {
    const result = filter_by_category(rows, 'Toys');
    strictEqual(result.length, 0);
  });

  it('uses exact match not substring', () => {
    const result = filter_by_category(rows, 'Electro');
    strictEqual(result.length, 0);
  });
});
