import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { sort_rows, column_types } from '../lib.js';

const order = (id, customerName, amount) => ({
  id, date: '2024-01-01', customerName, category: 'Electronics',
  amount, status: 'pending', items: 1,
});

describe('sort_rows', () => {
  it('sorts by string column ascending', () => {
    const rows = [order(1, 'Charlie', 100), order(2, 'Alice', 100), order(3, 'Bob', 100)];
    const result = sort_rows(rows, 'customerName', 'asc');
    deepStrictEqual(result.map(r => r.customerName), ['Alice', 'Bob', 'Charlie']);
  });

  it('sorts by string column descending', () => {
    const rows = [order(1, 'Alice', 100), order(2, 'Bob', 100), order(3, 'Charlie', 100)];
    const result = sort_rows(rows, 'customerName', 'desc');
    deepStrictEqual(result.map(r => r.customerName), ['Charlie', 'Bob', 'Alice']);
  });

  it('sorts by number column ascending', () => {
    const rows = [order(1, 'A', 99.50), order(2, 'B', 25.00), order(3, 'C', 150.75)];
    const result = sort_rows(rows, 'amount', 'asc');
    deepStrictEqual(result.map(r => r.amount), [25.00, 99.50, 150.75]);
  });

  it('sorts by number column descending', () => {
    const rows = [order(1, 'A', 99.50), order(2, 'B', 25.00), order(3, 'C', 150.75)];
    const result = sort_rows(rows, 'amount', 'desc');
    deepStrictEqual(result.map(r => r.amount), [150.75, 99.50, 25.00]);
  });
});

describe('column_types dispatch table', () => {
  it('maps string to a function', () => {
    strictEqual(typeof column_types.string, 'function');
  });

  it('maps number to a function', () => {
    strictEqual(typeof column_types.number, 'function');
  });
});
