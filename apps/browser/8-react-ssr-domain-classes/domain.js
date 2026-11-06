const ROWS_PER_PAGE = 25;

class BrowserRecord {
  constructor(raw) {
    this.id = raw.id;
    this.name = raw.name;
    this.status = raw.status;
    this.createdDate = raw.createdDate;
    this.value = raw.value;
  }

  static fromJSON(raw) {
    return new BrowserRecord(raw);
  }

  display(column) {
    if (column === 'value') return `$${this.value.toLocaleString('en-US')}`;
    return String(this[column]);
  }
}

export function toRecords(rows) {
  return rows.map(BrowserRecord.fromJSON);
}

export { BrowserRecord, ROWS_PER_PAGE };
