const ROWS_PER_PAGE = 25;

class Order {
  constructor(raw) {
    this.id = raw.id;
    this.date = raw.date;
    this.customerName = raw.customerName;
    this.category = raw.category;
    this.amount = raw.amount;
    this.status = raw.status;
    this.items = raw.items;
  }

  static fromJSON(raw) {
    return new Order(raw);
  }

  display(column) {
    if (column === 'amount') return `$${this.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return String(this[column]);
  }
}

export function toOrders(rows) {
  return rows.map(Order.fromJSON);
}

export { Order, ROWS_PER_PAGE };
