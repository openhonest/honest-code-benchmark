import { parseSalary } from '../../lib/value-rules.js';

const ROWS_PER_PAGE = 25;

class Employee {
  constructor(raw) {
    this.id = raw.id;
    this.name = raw.name;
    this.email = raw.email;
    this.department = raw.department;
    this.hireDate = raw.hireDate;
    this.salary = raw.salary;
    this.active = raw.active;
  }

  static fromJSON(raw) {
    return new Employee(raw);
  }

  matches(lowerText) {
    return this.name.toLowerCase().includes(lowerText)
      || this.email.toLowerCase().includes(lowerText)
      || this.department.toLowerCase().includes(lowerText);
  }

  display(column) {
    if (column === 'salary') return `$${this.salary.toLocaleString('en-US')}`;
    if (column === 'active') return this.active ? 'Yes' : 'No';
    return String(this[column]);
  }

  with(column, raw) {
    const copy = Employee.fromJSON(this);
    copy[column] = column === 'salary' ? (parseSalary(raw) ?? this.salary) : raw;
    return copy;
  }
}

export function toEmployees(rows) {
  return rows.map(Employee.fromJSON);
}

export { Employee, ROWS_PER_PAGE };
