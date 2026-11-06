export const ROWS_PER_PAGE = 25;
export const QUARTERS = ['q1', 'q2', 'q3', 'q4'];

export class BudgetLine {
  constructor(row) {
    this.id = row.id;
    this.category = row.category;
    this.description = row.description;
    this.q1 = row.q1;
    this.q2 = row.q2;
    this.q3 = row.q3;
    this.q4 = row.q4;
    this.budgetTarget = row.budgetTarget;
  }

  get total() {
    return this.q1 + this.q2 + this.q3 + this.q4;
  }

  get variance() {
    return this.total - this.budgetTarget;
  }

  get overBudget() {
    return this.variance < 0;
  }
}

export class Budget {
  static fromRows(rows) {
    return new Budget(rows.map(r => new BudgetLine(r)));
  }

  constructor(lines) {
    this.lines = lines;
    this.categories = [...new Set(lines.map(l => l.category))].sort();
  }

  static totals(lines) {
    const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
    for (const l of lines) {
      t.q1 += l.q1; t.q2 += l.q2; t.q3 += l.q3; t.q4 += l.q4;
      t.budgetTarget += l.budgetTarget;
    }
    t.total = t.q1 + t.q2 + t.q3 + t.q4;
    t.variance = t.total - t.budgetTarget;
    return t;
  }

  view({ category, currentPage }) {
    const filtered = category === 'All' ? this.lines : this.lines.filter(l => l.category === category);
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return {
      pageRows: filtered.slice(start, start + ROWS_PER_PAGE),
      totalPages: Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE)),
      totals: Budget.totals(filtered),
    };
  }
}
