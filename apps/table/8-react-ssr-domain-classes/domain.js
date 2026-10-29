const ROWS_PER_PAGE = 25;

export class TableModel {
  constructor(rows) {
    this.rows = rows;
    this.sortColumn = null;
    this.sortDirection = null;
    this.filterText = '';
    this.currentPage = 1;
    this.selectedIds = {};
    this.editingCell = null;
    this.editingValue = '';
  }

  static fromData(data) {
    return new TableModel(data);
  }

  sort(col) {
    if (this.sortColumn === col) {
      if (this.sortDirection === 'asc') this.sortDirection = 'desc';
      else { this.sortColumn = null; this.sortDirection = null; }
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
  }

  setFilter(text) {
    this.filterText = text;
    this.currentPage = 1;
  }

  setPage(p) { this.currentPage = p; }

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

  startEditing(id, column) {
    const row = this.rows.find(r => r.id === id);
    this.editingCell = { id, column };
    this.editingValue = row ? String(row[column]) : '';
  }

  setEditingValue(v) { this.editingValue = v; }

  commitEdit() {
    if (!this.editingCell) return;
    const { id, column } = this.editingCell;
    const row = this.rows.find(r => r.id === id);
    if (row) {
      row[column] = column === 'salary'
        ? parseInt(this.editingValue, 10) || row[column]
        : this.editingValue;
    }
    this.editingCell = null;
    this.editingValue = '';
  }

  cancelEdit() {
    this.editingCell = null;
    this.editingValue = '';
  }

  deleteSelected() {
    this.rows = this.rows.filter(r => !this.selectedIds[r.id]);
    this.selectedIds = {};
    const tp = this.getTotalPages();
    if (this.currentPage > tp) this.currentPage = tp;
  }

  getFiltered() {
    if (!this.filterText) return this.rows;
    const ft = this.filterText.toLowerCase();
    return this.rows.filter(r =>
      r.name.toLowerCase().includes(ft) ||
      r.email.toLowerCase().includes(ft) ||
      r.department.toLowerCase().includes(ft)
    );
  }

  getFilteredSorted() {
    let rows = this.getFiltered();
    if (this.sortColumn && this.sortDirection) {
      const col = this.sortColumn;
      const dir = this.sortDirection;
      rows = [...rows].sort((a, b) => {
        const av = a[col], bv = b[col];
        let cmp = 0;
        if (typeof av === 'string') cmp = av.localeCompare(bv);
        else if (typeof av === 'boolean') cmp = av === bv ? 0 : av ? -1 : 1;
        else cmp = av - bv;
        return dir === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  }

  getPageRows() {
    const all = this.getFilteredSorted();
    const start = (this.currentPage - 1) * ROWS_PER_PAGE;
    return all.slice(start, start + ROWS_PER_PAGE);
  }

  getTotalPages() {
    return Math.max(1, Math.ceil(this.getFilteredSorted().length / ROWS_PER_PAGE));
  }

  getTotalFiltered() {
    return this.getFilteredSorted().length;
  }

  getSelectedCount() {
    return Object.keys(this.selectedIds).length;
  }
}
