import { describe, it } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { filter_rows } from '../lib.js';

const row = (id, name, email, department) => ({
  id, name, email, department, hireDate: '2023-01-01', salary: 50000, active: true,
});

describe('filter_rows', () => {
  const rows = [
    row(1, 'Alice Smith', 'alice@example.com', 'Engineering'),
    row(2, 'Bob Jones', 'bob@test.org', 'Sales'),
    row(3, 'Carol Eng', 'carol@example.com', 'Marketing'),
  ];

  it('returns all rows when filter text is empty', () => {
    deepStrictEqual(filter_rows(rows, ''), rows);
  });

  it('matches name substring case-insensitively', () => {
    const result = filter_rows(rows, 'smith');
    deepStrictEqual(result, [rows[0]]);
  });

  it('matches email substring', () => {
    const result = filter_rows(rows, 'test.org');
    deepStrictEqual(result, [rows[1]]);
  });

  it('matches department', () => {
    const result = filter_rows(rows, 'engineer');
    deepStrictEqual(result, [rows[0]]);
  });

  it('excludes non-matching rows', () => {
    const result = filter_rows(rows, 'zzz');
    deepStrictEqual(result, []);
  });
});
