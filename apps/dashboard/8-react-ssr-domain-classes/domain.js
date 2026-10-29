const ROWS_PER_PAGE = 25;

export class DashboardModel {
  constructor(orders) {
    this.orders = orders;
    this.categoryFilter = 'All';
    this.statusFilter = 'All';
    this.dateFrom = '';
    this.dateTo = '';
    this.sortColumn = null;
    this.sortDirection = null;
    this.currentPage = 1;
  }

  static fromData(data) {
    return new DashboardModel(data);
  }

  setCategoryFilter(v) { this.categoryFilter = v; this.currentPage = 1; }
  setStatusFilter(v) { this.statusFilter = v; this.currentPage = 1; }
  setDateFrom(v) { this.dateFrom = v; this.currentPage = 1; }
  setDateTo(v) { this.dateTo = v; this.currentPage = 1; }
  setPage(p) { this.currentPage = p; }

  sort(col) {
    if (this.sortColumn === col) {
      if (this.sortDirection === 'asc') this.sortDirection = 'desc';
      else { this.sortColumn = null; this.sortDirection = null; }
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
  }

  getFiltered() {
    let rows = this.orders;
    if (this.categoryFilter !== 'All') rows = rows.filter(r => r.category === this.categoryFilter);
    if (this.statusFilter !== 'All') rows = rows.filter(r => r.status === this.statusFilter);
    if (this.dateFrom) rows = rows.filter(r => r.date >= this.dateFrom);
    if (this.dateTo) rows = rows.filter(r => r.date <= this.dateTo);
    if (this.sortColumn && this.sortDirection) {
      const col = this.sortColumn, dir = this.sortDirection;
      rows = [...rows].sort((a, b) => {
        const av = a[col], bv = b[col];
        let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return dir === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  }

  getPageRows() {
    const all = this.getFiltered();
    const start = (this.currentPage - 1) * ROWS_PER_PAGE;
    return all.slice(start, start + ROWS_PER_PAGE);
  }

  getTotalPages() {
    return Math.max(1, Math.ceil(this.getFiltered().length / ROWS_PER_PAGE));
  }

  getTotalOrders() { return this.getFiltered().length; }

  getTotalRevenue() {
    return this.getFiltered().reduce((sum, r) => sum + r.amount, 0);
  }

  getAvgOrder() {
    const filtered = this.getFiltered();
    return filtered.length ? this.getTotalRevenue() / filtered.length : 0;
  }

  getUniqueCustomers() {
    return new Set(this.getFiltered().map(r => r.customerName)).size;
  }

  getCategories() {
    return [...new Set(this.orders.map(r => r.category))].sort();
  }

  getStatuses() {
    return [...new Set(this.orders.map(r => r.status))].sort();
  }
}
