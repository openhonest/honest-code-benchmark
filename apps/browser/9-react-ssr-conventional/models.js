import { sortBy } from './patterns.jsx';

export const ROWS_PER_PAGE = 25;
export const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

const COLUMN_TYPES = { name: 'string', status: 'string', createdDate: 'string', value: 'number' };

export class BrowserRecord {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.status = row.status;
    this.createdDate = row.createdDate;
    this.value = row.value;
  }

  matches({ search, status }) {
    if (search && !this.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== 'all' && this.status !== status) return false;
    return true;
  }
}

export class RecordBrowser {
  static fromRows(rows) {
    return new RecordBrowser(rows.map(r => new BrowserRecord(r)));
  }

  constructor(records) {
    this.records = records;
  }

  find(id) {
    return id == null ? null : this.records.find(r => r.id === id) ?? null;
  }

  view(filters) {
    const filtered = this.records.filter(r => r.matches(filters));
    const sorted = sortBy(filtered, COLUMN_TYPES, filters.sortCol, filters.sortDir);
    const start = (filters.currentPage - 1) * ROWS_PER_PAGE;
    return {
      pageRows: sorted.slice(start, start + ROWS_PER_PAGE),
      totalFiltered: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE)),
      selected: this.find(filters.selectedId),
    };
  }
}
