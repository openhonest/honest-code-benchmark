const ROWS_PER_PAGE = 25;

class BudgetLine {
  constructor(raw) {
    this.id = raw.id;
    this.category = raw.category;
    this.description = raw.description;
    this.q1 = raw.q1;
    this.q2 = raw.q2;
    this.q3 = raw.q3;
    this.q4 = raw.q4;
    this.budgetTarget = raw.budgetTarget;
  }

  static fromJSON(raw) { return new BudgetLine(raw); }

  total() { return this.q1 + this.q2 + this.q3 + this.q4; }

  variance() { return this.total() - this.budgetTarget; }

  with(field, value) {
    const copy = BudgetLine.fromJSON(this);
    copy[field] = value;
    return copy;
  }
}

export function toLines(rows) { return rows.map(BudgetLine.fromJSON); }

export { BudgetLine, ROWS_PER_PAGE };
