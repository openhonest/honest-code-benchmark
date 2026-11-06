// Arm 7 server tree. Plain function components, no hooks: the view comes from
// build_view() in lib.js. The browser hydrates it with ../shared-client/App.jsx.
import React from 'react';
import { STATUSES, format_value_number, sort_indicator, status_label } from './lib.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

function DetailPanel({ record }) {
  return (
    <div className="detail-panel" data-role="detail-panel" style={{ width: 300, padding: '1rem', border: '1px solid #ccc', borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <strong>Record #{record.id}</strong>
        <button data-role="detail-close">&times;</button>
      </div>
      <dl>
        <dt>Name</dt><dd>{record.name}</dd>
        <dt>Status</dt><dd><span className={`badge badge-${record.status}`}>{record.status}</span></dd>
        <dt>Created</dt><dd>{record.createdDate}</dd>
        <dt>Value</dt><dd>${format_value_number(record.value)}</dd>
      </dl>
    </div>
  );
}

export default function App({ view }) {
  const { state, selectedRecord, pageRows, totalPages, totalFiltered } = view;
  const currentPage = state.currentPage;
  return (
    <div className="app">
      <div className="filter-bar">
        <input type="text" placeholder="Search by name..." data-role="search-input" />
      </div>

      <div className="toolbar">
        <button className={state.status === 'all' ? 'active' : ''} data-role="status-filter" data-status="all">
          All
        </button>
        {STATUSES.map(s => (
          <button key={s} className={state.status === s ? 'active' : ''} data-role="status-filter" data-status={s}>
            {status_label(s)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          {totalFiltered} records
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
                    <span className={`sort-indicator${state.sortCol === col.key ? ' active' : ''}`}>
                      {sort_indicator(state, col.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => (
                <tr key={row.id} data-row={row.id} className={state.selectedId === row.id ? 'selected' : ''} style={{ cursor: 'pointer' }}>
                  <td data-column="name">{row.name}</td>
                  <td data-column="status">
                    <span className={`badge badge-${row.status}`}>{row.status}</span>
                  </td>
                  <td data-column="createdDate">{row.createdDate}</td>
                  <td data-column="value">${format_value_number(row.value)}</td>
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

        {selectedRecord && <DetailPanel record={selectedRecord} />}
      </div>
    </div>
  );
}
