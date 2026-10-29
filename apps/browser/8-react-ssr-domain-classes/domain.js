const ROWS_PER_PAGE = 25;

export class BrowserModel {
  constructor(records) {
    this.records = records;
    this.search = '';
    this.statusFilter = 'all';
    this.sortColumn = null;
    this.sortDirection = null;
    this.currentPage = 1;
    this.selectedId = null;
  }

  static fromData(data) {
    return new BrowserModel(data);
  }

  setSearch(text) { this.search = text; this.currentPage = 1; }
  setStatusFilter(status) { this.statusFilter = status; this.currentPage = 1; }
  setPage(p) { this.currentPage = p; }
  selectRecord(id) { this.selectedId = id; }
  clearSelection() { this.selectedId = null; }

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
    let rows = this.records;
    if (this.search) {
      const s = this.search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(s));
    }
    if (this.statusFilter !== 'all') {
      rows = rows.filter(r => r.status === this.statusFilter);
    }
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

  getTotalFiltered() {
    return this.getFiltered().length;
  }

  getSelectedRecord() {
    if (this.selectedId == null) return null;
    return this.records.find(r => r.id === this.selectedId) || null;
  }
}
