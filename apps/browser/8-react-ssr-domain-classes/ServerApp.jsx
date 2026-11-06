import React from 'react';
import { ROWS_PER_PAGE } from './domain.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

export default function ServerApp({ records }) {
  const totalPages = Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE));
  const currentPage = 1;
  const pageRows = records.slice(0, ROWS_PER_PAGE);

  return (
    <div className="app">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name..."
          data-role="search-input"
        />
      </div>

      <div className="toolbar">
        <button
          className="active"
          data-role="status-filter"
          data-status="all"
        >
          All
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            className=""
            data-role="status-filter"
            data-status={s}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          {records.length} records
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
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
              {pageRows.map(rec => (
                <tr
                  key={rec.id}
                  data-row={rec.id}
                  className=""
                  style={{ cursor: 'pointer' }}
                >
                  <td data-column="name">{rec.name}</td>
                  <td data-column="status">
                    <span className={`badge badge-${rec.status}`}>{rec.status}</span>
                  </td>
                  <td data-column="createdDate">{rec.createdDate}</td>
                  <td data-column="value">${rec.value.toLocaleString('en-US')}</td>
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
      </div>
    </div>
  );
}
