import { describe, it } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { filter_by_search } from '../lib.js';

const row = (id, name) => ({
  id, name, status: 'active', createdDate: '2024-01-01', value: 100,
});

describe('filter_by_search', () => {
  const rows = [
    row(1, 'Alice Smith'),
    row(2, 'Bob Jones'),
    row(3, 'Charlie Adams'),
  ];

  it('returns all rows when search text is empty', () => {
    deepStrictEqual(filter_by_search(rows, ''), rows);
  });

  it('matches name substring case-insensitively', () => {
    const result = filter_by_search(rows, 'smith');
    deepStrictEqual(result, [rows[0]]);
  });

  it('excludes non-matching rows', () => {
    const result = filter_by_search(rows, 'zzz');
    deepStrictEqual(result, []);
  });

  it('matches partial substring in the middle of name', () => {
    const result = filter_by_search(rows, 'ob jo');
    deepStrictEqual(result, [rows[1]]);
  });
});
