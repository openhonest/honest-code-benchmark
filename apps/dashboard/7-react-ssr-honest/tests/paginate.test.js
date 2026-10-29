import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { paginate } from '../lib.js';

const makeRows = n => Array.from({ length: n }, (_, i) => ({
  id: i + 1, date: '2024-01-01', customerName: `Customer ${i + 1}`,
  category: 'Electronics', amount: 100.00, status: 'pending', items: 1,
}));

describe('paginate', () => {
  it('returns first page of results', () => {
    const result = paginate(makeRows(60), 1, 25);
    strictEqual(result.pageRows.length, 25);
    strictEqual(result.totalPages, 3);
    strictEqual(result.totalFiltered, 60);
  });

  it('returns last partial page', () => {
    const result = paginate(makeRows(60), 3, 25);
    strictEqual(result.pageRows.length, 10);
  });

  it('returns empty for page beyond range', () => {
    const result = paginate(makeRows(10), 2, 25);
    strictEqual(result.pageRows.length, 0);
  });

  it('handles single row on single page', () => {
    const result = paginate(makeRows(1), 1, 25);
    strictEqual(result.pageRows.length, 1);
    strictEqual(result.totalPages, 1);
  });

  it('returns one empty page for zero rows', () => {
    const result = paginate([], 1, 25);
    strictEqual(result.pageRows.length, 0);
    strictEqual(result.totalPages, 1);
  });
});
