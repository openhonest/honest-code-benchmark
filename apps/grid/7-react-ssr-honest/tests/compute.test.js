import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { compute_row_total, compute_row_variance, compute_totals, format_number } from '../lib.js';

const row = (q1, q2, q3, q4, budgetTarget) => ({
  id: 1, category: 'Engineering', description: 'Test',
  q1, q2, q3, q4, budgetTarget,
});

describe('compute_row_total', () => {
  it('sums four quarters', () => {
    strictEqual(compute_row_total(row(100, 200, 300, 400, 0)), 1000);
  });

  it('handles zeros', () => {
    strictEqual(compute_row_total(row(0, 0, 0, 0, 0)), 0);
  });

  it('handles fractional values', () => {
    const r = row(10.50, 20.25, 30.75, 40.00, 0);
    strictEqual(compute_row_total(r), 101.50);
  });
});

describe('compute_row_variance', () => {
  it('positive variance when over target', () => {
    strictEqual(compute_row_variance(row(300, 300, 300, 300, 1000)), 200);
  });

  it('negative variance when under target', () => {
    strictEqual(compute_row_variance(row(100, 100, 100, 100, 500)), -100);
  });

  it('zero when exactly on target', () => {
    strictEqual(compute_row_variance(row(250, 250, 250, 250, 1000)), 0);
  });
});

describe('compute_totals', () => {
  it('aggregates two rows', () => {
    const rows = [
      row(100, 200, 300, 400, 900),
      row(50, 60, 70, 80, 300),
    ];
    const t = compute_totals(rows);
    strictEqual(t.q1, 150);
    strictEqual(t.q2, 260);
    strictEqual(t.q3, 370);
    strictEqual(t.q4, 480);
    strictEqual(t.total, 1260);
    strictEqual(t.budgetTarget, 1200);
    strictEqual(t.variance, 60);
  });

  it('handles single row', () => {
    const t = compute_totals([row(10, 20, 30, 40, 120)]);
    strictEqual(t.total, 100);
    strictEqual(t.variance, -20);
  });

  it('handles empty list', () => {
    const t = compute_totals([]);
    strictEqual(t.q1, 0);
    strictEqual(t.q2, 0);
    strictEqual(t.q3, 0);
    strictEqual(t.q4, 0);
    strictEqual(t.total, 0);
    strictEqual(t.budgetTarget, 0);
    strictEqual(t.variance, 0);
  });
});

describe('format_number', () => {
  it('formats integer to two decimals', () => {
    strictEqual(format_number(1000), '1,000.00');
  });

  it('formats float to two decimals', () => {
    strictEqual(format_number(1234.5), '1,234.50');
  });

  it('formats zero', () => {
    strictEqual(format_number(0), '0.00');
  });

  it('formats negative number', () => {
    strictEqual(format_number(-500.123), '-500.12');
  });
});
