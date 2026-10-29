import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { paginate } from '../lib.js';

const makeRows = n => Array.from({ length: n }, (_, i) => ({
  id: i + 1, name: `Row ${i + 1}`, email: `r${i + 1}@test.com`,
  department: 'Engineering', hireDate: '2023-01-01', salary: 50000, active: true,
}));

describe('paginate', () => {
  it('returns first page of results', () => {
    const rows = makeRows(25);
    const result = paginate(rows, 1, 10);
    strictEqual(result.pageRows.length, 10);
    strictEqual(result.totalPages, 3);
    strictEqual(result.totalFiltered, 25);
  });

  it('returns last partial page', () => {
    const rows = makeRows(25);
    const result = paginate(rows, 3, 10);
    strictEqual(result.pageRows.length, 5);
  });

  it('returns empty for page beyond range', () => {
    const rows = makeRows(10);
    const result = paginate(rows, 5, 10);
    strictEqual(result.pageRows.length, 0);
  });

  it('handles single row on single page', () => {
    const rows = makeRows(1);
    const result = paginate(rows, 1, 10);
    strictEqual(result.pageRows.length, 1);
    strictEqual(result.totalPages, 1);
  });
});
