import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { sort_rows, sort_comparators } from '../lib.js';

const row = (id, name, salary, active) => ({
  id, name, email: `${name.toLowerCase()}@test.com`, department: 'Engineering',
  hireDate: '2023-01-01', salary, active,
});

describe('sort_rows', () => {
  it('sorts by string column ascending', () => {
    const rows = [row(1, 'Charlie', 50000, true), row(2, 'Alice', 50000, true), row(3, 'Bob', 50000, true)];
    const result = sort_rows(rows, 'name', 'asc');
    deepStrictEqual(result.map(r => r.name), ['Alice', 'Bob', 'Charlie']);
  });

  it('sorts by string column descending', () => {
    const rows = [row(1, 'Alice', 50000, true), row(2, 'Bob', 50000, true), row(3, 'Charlie', 50000, true)];
    const result = sort_rows(rows, 'name', 'desc');
    deepStrictEqual(result.map(r => r.name), ['Charlie', 'Bob', 'Alice']);
  });

  it('sorts by number column ascending', () => {
    const rows = [row(1, 'A', 50000, true), row(2, 'B', 30000, true), row(3, 'C', 70000, true)];
    const result = sort_rows(rows, 'salary', 'asc');
    deepStrictEqual(result.map(r => r.salary), [30000, 50000, 70000]);
  });

  it('sorts by boolean column ascending', () => {
    const rows = [row(1, 'A', 50000, false), row(2, 'B', 50000, true), row(3, 'C', 50000, false)];
    const result = sort_rows(rows, 'active', 'asc');
    deepStrictEqual(result.map(r => r.active), [false, false, true]);
  });
});

describe('sort_comparators dispatch table', () => {
  it('maps string to compare_string', () => {
    strictEqual(typeof sort_comparators.string, 'function');
  });

  it('maps number to compare_number', () => {
    strictEqual(typeof sort_comparators.number, 'function');
  });

  it('maps boolean to compare_boolean', () => {
    strictEqual(typeof sort_comparators.boolean, 'function');
  });
});
