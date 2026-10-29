import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { paginate } from '../lib.js';

const makeRows = (n) => Array.from({ length: n }, (_, i) => ({
  id: i + 1, name: `Row ${i + 1}`, status: 'active', createdDate: '2024-01-01', value: 100,
}));

describe('paginate', () => {
  it('returns first page of results', () => {
    const result = paginate(makeRows(50), 1, 25);
    strictEqual(result.pageRows.length, 25);
    strictEqual(result.totalPages, 2);
    strictEqual(result.totalFiltered, 50);
  });

  it('returns partial last page', () => {
    const result = paginate(makeRows(30), 2, 25);
    strictEqual(result.pageRows.length, 5);
    strictEqual(result.totalPages, 2);
  });

  it('returns empty for page beyond range', () => {
    const result = paginate(makeRows(10), 2, 25);
    strictEqual(result.pageRows.length, 0);
  });

  it('returns one page for empty input', () => {
    const result = paginate([], 1, 25);
    strictEqual(result.totalPages, 1);
    strictEqual(result.pageRows.length, 0);
  });
});
