// Arm 7 server tree. Plain function component, no hooks: the view comes from
// build_view() in lib.js and every cell from format_cell(). The browser
// hydrates this HTML with the shared client (../shared-client/App.jsx).
import React from 'react';
import { format_cell, sort_indicator } from './lib.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date' },
  { key: 'salary', label: 'Salary' },
  { key: 'active', label: 'Active' },
];

const noop = () => {};

export default function App({ view }) {
  const { state, pageRows, totalPages, totalFiltered, currentPage, selCount, allVisibleSelected } = view;
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
        <button className="danger" disabled={selCount === 0} data-action="delete-selected">
          Delete selected
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              <input type="checkbox" checked={allVisibleSelected} onChange={noop} data-role="select-all" />
            </th>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key}>
                {col.label}
                <span className={`sort-indicator${state.sortCol === col.key ? ' active' : ''}`}>
                  {sort_indicator(state, col.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map(row => (
            <tr key={row.id} className={state.selected[row.id] ? 'selected' : ''} data-row={row.id}>
              <td>
                <input type="checkbox" checked={!!state.selected[row.id]} onChange={noop} data-role="row-checkbox" />
              </td>
              {COLUMNS.map(col => (
                <td key={col.key} data-column={col.key}>{format_cell(col.key, row[col.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={currentPage <= 1} data-action="prev-page">
          Previous
        </button>
        <span className="page-info" data-role="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button disabled={currentPage >= totalPages} data-action="next-page">
          Next
        </button>
      </div>
    </div>
  );
}
