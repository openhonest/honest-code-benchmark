import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { toggle_row, toggle_all_visible, commit_edit, delete_selected } from '../lib.js';

describe('toggle_row', () => {
  it('adds an unselected row', () => {
    deepStrictEqual(toggle_row({}, 5), { 5: true });
  });

  it('removes a selected row', () => {
    deepStrictEqual(toggle_row({ 5: true, 10: true }, 5), { 10: true });
  });
});

describe('toggle_all_visible', () => {
  it('selects all when some are unselected', () => {
    const result = toggle_all_visible({ 1: true }, [1, 2, 3]);
    deepStrictEqual(result, { 1: true, 2: true, 3: true });
  });

  it('deselects all when all are selected', () => {
    const result = toggle_all_visible({ 1: true, 2: true, 3: true }, [1, 2, 3]);
    deepStrictEqual(result, {});
  });
});

describe('commit_edit', () => {
  const rows = [
    { id: 1, name: 'Alice', email: 'a@b.com', department: 'Engineering', hireDate: '2023-01-01', salary: 50000, active: true },
    { id: 2, name: 'Bob', email: 'b@b.com', department: 'Sales', hireDate: '2023-02-01', salary: 60000, active: true },
  ];

  it('updates a name field', () => {
    const result = commit_edit(rows, { id: 1, column: 'name', value: 'Alicia' });
    strictEqual(result[0].name, 'Alicia');
    strictEqual(result[1].name, 'Bob');
  });

  it('updates a salary field with integer parsing', () => {
    const result = commit_edit(rows, { id: 2, column: 'salary', value: '75000' });
    strictEqual(result[1].salary, 75000);
  });

  it('keeps original salary on non-numeric input', () => {
    const result = commit_edit(rows, { id: 1, column: 'salary', value: 'abc' });
    strictEqual(result[0].salary, 50000);
  });
});

describe('delete_selected', () => {
  const rows = [
    { id: 1, name: 'A', email: '', department: '', hireDate: '', salary: 0, active: true },
    { id: 2, name: 'B', email: '', department: '', hireDate: '', salary: 0, active: true },
    { id: 3, name: 'C', email: '', department: '', hireDate: '', salary: 0, active: true },
  ];

  it('removes selected rows', () => {
    const result = delete_selected(rows, { 1: true, 3: true });
    strictEqual(result.length, 1);
    strictEqual(result[0].id, 2);
  });

  it('returns all rows when none selected', () => {
    const result = delete_selected(rows, {});
    strictEqual(result.length, 3);
  });
});
