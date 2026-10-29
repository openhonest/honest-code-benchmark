import { describe, it } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { sort_rows } from '../lib.js';

const row = (id, name, value) => ({
  id, name, status: 'active', createdDate: '2024-01-01', value,
});

describe('sort_rows', () => {
  it('sorts by name ascending', () => {
    const rows = [row(1, 'Charlie', 100), row(2, 'Alice', 200), row(3, 'Bob', 300)];
    const result = sort_rows(rows, 'name', 'asc');
    deepStrictEqual(result.map(r => r.name), ['Alice', 'Bob', 'Charlie']);
  });

  it('sorts by name descending', () => {
    const rows = [row(1, 'Alice', 100), row(2, 'Bob', 200), row(3, 'Charlie', 300)];
    const result = sort_rows(rows, 'name', 'desc');
    deepStrictEqual(result.map(r => r.name), ['Charlie', 'Bob', 'Alice']);
  });

  it('sorts by value ascending', () => {
    const rows = [row(1, 'A', 300), row(2, 'B', 100), row(3, 'C', 200)];
    const result = sort_rows(rows, 'value', 'asc');
    deepStrictEqual(result.map(r => r.value), [100, 200, 300]);
  });

  it('sorts by value descending', () => {
    const rows = [row(1, 'A', 100), row(2, 'B', 200), row(3, 'C', 300)];
    const result = sort_rows(rows, 'value', 'desc');
    deepStrictEqual(result.map(r => r.value), [300, 200, 100]);
  });

  it('does not mutate the original array', () => {
    const rows = [row(1, 'Bob', 200), row(2, 'Alice', 100)];
    const copy = [...rows];
    sort_rows(rows, 'name', 'asc');
    deepStrictEqual(rows, copy);
  });
});
