import { describe, it } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { filter_by_category } from '../lib.js';

const row = (id, category) => ({
  id, category, description: `Item ${id}`,
  q1: 100, q2: 200, q3: 300, q4: 400, budgetTarget: 900,
});

describe('filter_by_category', () => {
  const rows = [
    row(1, 'Engineering'),
    row(2, 'Sales'),
    row(3, 'Marketing'),
    row(4, 'Engineering'),
  ];

  it('returns all rows when category is "All"', () => {
    deepStrictEqual(filter_by_category(rows, 'All'), rows);
  });

  it('keeps only matching rows', () => {
    const result = filter_by_category(rows, 'Engineering');
    deepStrictEqual(result, [rows[0], rows[3]]);
  });

  it('returns empty when no rows match', () => {
    deepStrictEqual(filter_by_category(rows, 'HR'), []);
  });
});
