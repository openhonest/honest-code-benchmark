import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { filter_by_status } from '../lib.js';

const row = (id, status) => ({
  id, name: `Row ${id}`, status, createdDate: '2024-01-01', value: 100,
});

describe('filter_by_status', () => {
  const rows = [
    row(1, 'active'),
    row(2, 'inactive'),
    row(3, 'pending'),
    row(4, 'active'),
  ];

  it('returns all rows when status is "all"', () => {
    deepStrictEqual(filter_by_status(rows, 'all'), rows);
  });

  it('returns all rows when status is null', () => {
    deepStrictEqual(filter_by_status(rows, null), rows);
  });

  it('returns all rows when status is undefined', () => {
    deepStrictEqual(filter_by_status(rows, undefined), rows);
  });

  it('keeps only rows matching the given status', () => {
    const result = filter_by_status(rows, 'active');
    strictEqual(result.length, 2);
    result.forEach(r => strictEqual(r.status, 'active'));
  });

  it('returns empty when no rows match the status', () => {
    const result = filter_by_status(rows, 'flagged');
    deepStrictEqual(result, []);
  });
});
