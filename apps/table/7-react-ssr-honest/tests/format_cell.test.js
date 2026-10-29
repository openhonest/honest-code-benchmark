import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { format_cell } from '../lib.js';

describe('format_cell', () => {
  it('formats salary as currency', () => {
    strictEqual(format_cell('salary', 75000), '$75,000');
  });

  it('formats active true as Yes', () => {
    strictEqual(format_cell('active', true), 'Yes');
  });

  it('formats active false as No', () => {
    strictEqual(format_cell('active', false), 'No');
  });

  it('passes string column through', () => {
    strictEqual(format_cell('name', 'Alice'), 'Alice');
  });

  it('passes hireDate through', () => {
    strictEqual(format_cell('hireDate', '2023-01-15'), '2023-01-15');
  });
});
