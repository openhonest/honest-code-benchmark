const ROWS_PER_PAGE = 25;

export class GridModel {
  constructor(rows) {
    this.rows = rows;
    this.categoryFilter = 'All';
    this.currentPage = 1;
    this.selectedIds = {};
    this.editingCell = null;
    this.editingValue = '';
    this.bulkQuarter = 'q1';
    this.bulkValue = '';
  }

  static fromData(data) {
    return new GridModel(data);
  }

  setCategoryFilter(v) { this.categoryFilter = v; this.currentPage = 1; }
  setPage(p) { this.currentPage = p; }
  setBulkQuarter(v) { this.bulkQuarter = v; }
  setBulkValue(v) { this.bulkValue = v; }

  getCategories() {
    return [...new Set(this.rows.map(r => r.category))].sort();
  }

  getFiltered() {
    if (this.categoryFilter === 'All') return this.rows;
    return this.rows.filter(r => r.category === this.categoryFilter);
  }

  getPageRows() {
    const all = this.getFiltered();
    const start = (this.currentPage - 1) * ROWS_PER_PAGE;
    return all.slice(start, start + ROWS_PER_PAGE);
  }

  getTotalPages() {
    return Math.max(1, Math.ceil(this.getFiltered().length / ROWS_PER_PAGE));
  }

  getTotals() {
    const filtered = this.getFiltered();
    const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
    for (const r of filtered) {
      t.q1 += r.q1; t.q2 += r.q2; t.q3 += r.q3; t.q4 += r.q4;
      t.budgetTarget += r.budgetTarget;
    }
    t.total = t.q1 + t.q2 + t.q3 + t.q4;
    t.variance = t.total - t.budgetTarget;
    return t;
  }

  rowTotal(row) { return row.q1 + row.q2 + row.q3 + row.q4; }
  rowVariance(row) { return this.rowTotal(row) - row.budgetTarget; }

  startEditing(id, field) {
    const row = this.rows.find(r => r.id === id);
    this.editingCell = { id, field };
    this.editingValue = row ? String(row[field]) : '';
  }

  setEditingValue(v) { this.editingValue = v; }

  commitEdit() {
    if (!this.editingCell) return;
    const { id, field } = this.editingCell;
    const num = parseFloat(this.editingValue);
    if (!isNaN(num)) {
      const row = this.rows.find(r => r.id === id);
      if (row) row[field] = num;
    }
    this.editingCell = null;
    this.editingValue = '';
  }

  cancelEdit() {
    this.editingCell = null;
    this.editingValue = '';
  }

  toggleRow(id) {
    if (this.selectedIds[id]) delete this.selectedIds[id];
    else this.selectedIds[id] = true;
  }

  toggleAllVisible() {
    const ids = this.getPageRows().map(r => r.id);
    const allSelected = ids.every(id => this.selectedIds[id]);
    if (allSelected) ids.forEach(id => delete this.selectedIds[id]);
    else ids.forEach(id => { this.selectedIds[id] = true; });
  }

  getSelectedCount() {
    return Object.keys(this.selectedIds).length;
  }

  bulkFill() {
    const num = parseFloat(this.bulkValue);
    if (isNaN(num) || this.getSelectedCount() === 0) return;
    for (const row of this.rows) {
      if (this.selectedIds[row.id]) row[this.bulkQuarter] = num;
    }
  }
}
