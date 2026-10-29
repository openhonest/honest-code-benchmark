import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { compute_kpis } from '../lib.js';

const order = (id, amount, customerName) => ({
  id, date: '2024-01-01', customerName, category: 'Electronics',
  amount, status: 'pending', items: 1,
});

describe('compute_kpis', () => {
  it('computes all four KPIs', () => {
    const rows = [order(1, 100.00, 'Alice'), order(2, 200.00, 'Bob'), order(3, 150.00, 'Alice')];
    const kpis = compute_kpis(rows);
    strictEqual(kpis.totalOrders, 3);
    strictEqual(kpis.totalRevenue, 450.00);
    strictEqual(kpis.avgOrder, 150.00);
    strictEqual(kpis.uniqueCustomers, 2);
  });

  it('returns zeroes for empty input', () => {
    const kpis = compute_kpis([]);
    strictEqual(kpis.totalOrders, 0);
    strictEqual(kpis.totalRevenue, 0);
    strictEqual(kpis.avgOrder, 0);
    strictEqual(kpis.uniqueCustomers, 0);
  });

  it('handles a single order', () => {
    const kpis = compute_kpis([order(1, 99.99, 'Carol')]);
    strictEqual(kpis.totalOrders, 1);
    strictEqual(kpis.avgOrder, 99.99);
    strictEqual(kpis.uniqueCustomers, 1);
  });
});
