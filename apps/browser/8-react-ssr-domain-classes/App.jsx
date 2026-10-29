import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserModel } from './domain.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

export default function App({ initialData }) {
  const [model] = useState(() => BrowserModel.fromData(initialData || []));
  const [, forceUpdate] = useState(0);
  const searchTimeout = useRef(null);

  const update = useCallback(() => forceUpdate(c => c + 1), []);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { model.records = data; update(); });
    }
  }, [initialData, model, update]);

  const pageRows = model.getPageRows();
  const totalPages = model.getTotalPages();
  const selectedRecord = model.getSelectedRecord();

  return (
    <div className="app">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name..."
          onChange={e => {
            const value = e.target.value;
            clearTimeout(searchTimeout.current);
            searchTimeout.current = setTimeout(() => { model.setSearch(value); update(); }, 300);
          }}
          data-role="search-input"
        />
      </div>

      <div className="toolbar">
        <button
          className={model.statusFilter === 'all' ? 'active' : ''}
          onClick={() => { model.setStatusFilter('all'); update(); }}
          data-role="status-filter"
          data-status="all"
        >
          All
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            className={model.statusFilter === s ? 'active' : ''}
            onClick={() => { model.setStatusFilter(s); update(); }}
            data-role="status-filter"
            data-status={s}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>{model.getTotalFiltered()} records</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} data-column={col.key} onClick={() => { model.sort(col.key); update(); }}>
                    {col.label}
                    <span className={`sort-indicator${model.sortColumn === col.key ? ' active' : ''}`}>
                      {model.sortColumn !== col.key ? '↕' : model.sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => (
                <tr
                  key={row.id}
                  data-row={row.id}
                  className={model.selectedId === row.id ? 'selected' : ''}
                  onClick={() => { model.selectRecord(row.id); update(); }}
                  style={{ cursor: 'pointer' }}
                >
                  <td data-column="name">{row.name}</td>
                  <td data-column="status"><span className={`badge badge-${row.status}`}>{row.status}</span></td>
                  <td data-column="createdDate">{row.createdDate}</td>
                  <td data-column="value">${row.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button onClick={() => { model.setPage(model.currentPage - 1); update(); }} disabled={model.currentPage <= 1} data-action="prev-page">Previous</button>
            <span className="page-info" data-role="page-info">Page {model.currentPage} of {totalPages}</span>
            <button onClick={() => { model.setPage(model.currentPage + 1); update(); }} disabled={model.currentPage >= totalPages} data-action="next-page">Next</button>
          </div>
        </div>

        {selectedRecord && (
          <div className="detail-panel" data-role="detail-panel" style={{ width: 300, padding: '1rem', border: '1px solid #ccc', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <strong>Record #{selectedRecord.id}</strong>
              <button onClick={() => { model.clearSelection(); update(); }} data-role="detail-close">&times;</button>
            </div>
            <dl>
              <dt>Name</dt><dd>{selectedRecord.name}</dd>
              <dt>Status</dt><dd><span className={`badge badge-${selectedRecord.status}`}>{selectedRecord.status}</span></dd>
              <dt>Created</dt><dd>{selectedRecord.createdDate}</dd>
              <dt>Value</dt><dd>${selectedRecord.value.toLocaleString()}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
