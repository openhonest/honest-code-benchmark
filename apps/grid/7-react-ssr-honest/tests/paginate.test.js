import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { paginate } from '../lib.js';

const makeRows = (n) => Array.from({ length: n }, (_, i) => ({
  id: i + 1, category: 'Engineering', description: `Item ${i + 1}`,
  q1: 10, q2: 20, q3: 30, q4: 40, budgetTarget: 100,
}));

describe('paginate', () => {
  it('returns all rows when fewer than page size', () => {
    const rows = makeRows(10);
    const result = paginate(rows, 1, 25);
    strictEqual(result.pageRows.length, 10);
    strictEqual(result.totalPages, 1);
    strictEqual(result.totalFiltered, 10);
  });

  it('returns first page of 25 from 60 rows', () => {
    const rows = makeRows(60);
    const result = paginate(rows, 1, 25);
    strictEqual(result.pageRows.length, 25);
    strictEqual(result.totalPages, 3);
    deepStrictEqual(result.pageRows[0].id, 1);
  });

  it('returns last partial page', () => {
    const rows = makeRows(60);
    const result = paginate(rows, 3, 25);
    strictEqual(result.pageRows.length, 10);
    strictEqual(result.totalPages, 3);
    deepStrictEqual(result.pageRows[0].id, 51);
  });

  it('handles empty input', () => {
    const result = paginate([], 1, 25);
    strictEqual(result.pageRows.length, 0);
    strictEqual(result.totalPages, 1);
  });
});
