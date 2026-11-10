import { sortBy } from './patterns.jsx';

export const ROWS_PER_PAGE = 25;

const COLUMN_TYPES = {
  id: 'string', date: 'string', customerName: 'string', category: 'string',
  amount: 'number', status: 'string', items: 'number',
};

export class Order {
  constructor(row) {
    this.id = row.id;
    this.date = row.date;
    this.customerName = row.customerName;
    this.category = row.category;
    this.amount = row.amount;
    this.status = row.status;
    this.items = row.items;
  }

  matches({ category, status, dateFrom, dateTo }) {
    if (category !== 'All' && this.category !== category) return false;
    if (status !== 'All' && this.status !== status) return false;
    if (dateFrom && this.date < dateFrom) return false;
    if (dateTo && this.date > dateTo) return false;
    return true;
  }
}

export class OrderBook {
  static fromRows(rows) {
    return new OrderBook(rows.map(r => new Order(r)));
  }

  constructor(orders) {
    this.orders = orders;
    this.categories = [...new Set(orders.map(o => o.category))].sort();
    this.statuses = [...new Set(orders.map(o => o.status))].sort();
  }

  view(filters) {
    const needsFilter = filters.category !== 'All' || filters.status !== 'All' || filters.dateFrom || filters.dateTo;
    const filtered = needsFilter ? this.orders.filter(o => o.matches(filters)) : this.orders;
    const sorted = sortBy(filtered, COLUMN_TYPES, filters.sortCol, filters.sortDir);
    const totalRevenue = filtered.reduce((s, o) => s + o.amount, 0);
    const start = (filters.currentPage - 1) * ROWS_PER_PAGE;
    return {
      kpis: {
        totalOrders: filtered.length,
        totalRevenue,
        avgOrder: filtered.length > 0 ? totalRevenue / filtered.length : 0,
        uniqueCustomers: new Set(filtered.map(o => o.customerName)).size,
      },
      pageRows: sorted.slice(start, start + ROWS_PER_PAGE),
      totalPages: Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE)),
    };
  }
}
