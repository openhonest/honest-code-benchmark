import React from 'react';
import { ROWS_PER_PAGE } from './domain.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

export default function ServerApp({ employees }) {
  const totalFiltered = employees.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ROWS_PER_PAGE));
  const currentPage = 1;
  const pageRows = employees.slice(0, ROWS_PER_PAGE);
  const selCount = 0;

  return (
    <div className="app">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by name, email, or department..."
          data-role="filter-input"
        />
      </div>

      <div className="toolbar">
        <span className="selection-count">
          {selCount} of {totalFiltered} selected
        </span>
        <button
          className="danger"
          disabled={true}
          data-action="delete-selected"
        >
          Delete selected
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={false}
                onChange={() => {}}
                data-role="select-all"
              />
            </th>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key}>
                {col.label}
                <span className="sort-indicator">
                  {'↕'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map(emp => (
            <tr key={emp.id} className="" data-row={emp.id}>
              <td>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {}}
                  data-role="row-checkbox"
                />
              </td>
              {COLUMNS.map(col => (
                <td key={col.key} data-column={col.key}>{emp.display(col.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          disabled={currentPage <= 1}
          data-action="prev-page"
        >
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage >= totalPages}
          data-action="next-page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
