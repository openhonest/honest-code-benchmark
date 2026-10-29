import { describe, it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { commit_cell_edit, bulk_fill, toggle_row, toggle_all_visible } from '../lib.js';

const row = (id, q1, q2, q3, q4) => ({
  id, category: 'Engineering', description: `Item ${id}`,
  q1, q2, q3, q4, budgetTarget: 1000,
});

describe('commit_cell_edit', () => {
  const rows = [row(1, 100, 200, 300, 400), row(2, 500, 600, 700, 800)];

  it('updates the specified cell', () => {
    const result = commit_cell_edit(rows, 1, 'q1', 999);
    strictEqual(result[0].q1, 999);
    strictEqual(result[1].q1, 500);
  });

  it('leaves other rows unchanged', () => {
    const result = commit_cell_edit(rows, 1, 'q2', 0);
    deepStrictEqual(result[1], rows[1]);
  });

  it('does not mutate the original array', () => {
    const result = commit_cell_edit(rows, 1, 'q1', 0);
    strictEqual(rows[0].q1, 100);
    strictEqual(result !== rows, true);
  });
});

describe('bulk_fill', () => {
  const rows = [row(1, 100, 200, 300, 400), row(2, 500, 600, 700, 800), row(3, 10, 20, 30, 40)];
  const selected = { 1: true, 3: true };

  it('fills the specified quarter on selected rows', () => {
    const result = bulk_fill(rows, selected, 'q2', 999);
    strictEqual(result[0].q2, 999);
    strictEqual(result[1].q2, 600);
    strictEqual(result[2].q2, 999);
  });

  it('does not modify unselected rows', () => {
    const result = bulk_fill(rows, selected, 'q1', 0);
    deepStrictEqual(result[1], rows[1]);
  });

  it('does not mutate the original', () => {
    bulk_fill(rows, selected, 'q1', 0);
    strictEqual(rows[0].q1, 100);
  });
});

describe('toggle_row', () => {
  it('adds an unselected row', () => {
    const result = toggle_row({}, 5);
    strictEqual(result[5], true);
  });

  it('removes a selected row', () => {
    const result = toggle_row({ 5: true }, 5);
    strictEqual(result[5], undefined);
  });

  it('does not mutate the original', () => {
    const sel = { 5: true };
    toggle_row(sel, 5);
    strictEqual(sel[5], true);
  });
});

describe('toggle_all_visible', () => {
  it('selects all when none selected', () => {
    const result = toggle_all_visible({}, [1, 2, 3]);
    strictEqual(result[1], true);
    strictEqual(result[2], true);
    strictEqual(result[3], true);
  });

  it('deselects all when all selected', () => {
    const result = toggle_all_visible({ 1: true, 2: true, 3: true }, [1, 2, 3]);
    strictEqual(result[1], undefined);
    strictEqual(result[2], undefined);
    strictEqual(result[3], undefined);
  });

  it('selects all when partially selected', () => {
    const result = toggle_all_visible({ 1: true }, [1, 2, 3]);
    strictEqual(result[1], true);
    strictEqual(result[2], true);
    strictEqual(result[3], true);
  });

  it('preserves other selections', () => {
    const result = toggle_all_visible({ 10: true }, [1, 2]);
    strictEqual(result[10], true);
    strictEqual(result[1], true);
  });
});
