import { sortBy } from './patterns.jsx';

export const ROWS_PER_PAGE = 25;

const COLUMN_TYPES = {
  name: 'string', email: 'string', department: 'string', hireDate: 'string',
  salary: 'number', active: 'boolean',
};

export class Employee {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.department = row.department;
    this.hireDate = row.hireDate;
    this.salary = row.salary;
    this.active = row.active;
  }

  matches(text) {
    const ft = text.toLowerCase();
    return this.name.toLowerCase().includes(ft)
      || this.email.toLowerCase().includes(ft)
      || this.department.toLowerCase().includes(ft);
  }
}

export class EmployeeDirectory {
  static fromRows(rows) {
    return new EmployeeDirectory(rows.map(r => new Employee(r)));
  }

  constructor(employees) {
    this.employees = employees;
  }

  view({ filterText, sortCol, sortDir, currentPage }) {
    const filtered = filterText ? this.employees.filter(e => e.matches(filterText)) : this.employees;
    const sorted = sortBy(filtered, COLUMN_TYPES, sortCol, sortDir);
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return {
      pageRows: sorted.slice(start, start + ROWS_PER_PAGE),
      totalFiltered: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE)),
    };
  }
}
