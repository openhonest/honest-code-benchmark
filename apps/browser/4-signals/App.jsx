import React, { useEffect, useCallback, useRef } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  data, filteredSorted, pageRows, totalPages,
  currentPage, sortColumn, sortDirection, statusFilter, selectedId,
  setData, doSetSearch, doSetStatusFilter, doSort, setPage, doSetSelectedId,
} from './store.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

export default function App() {
  useSignals();
  const searchTimeout = useRef(null);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl).then(r => r.json()).then(rows => setData(rows));
  }, []);

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSetSearch(value), 300);
  }, []);

  const rows = pageRows.value;
  const sf = statusFilter.value;
  const sc = sortColumn.value;
  const sd = sortDirection.value;
  const cp = currentPage.value;
  const tp = totalPages.value;
  const sid = selectedId.value;
  const selectedRecord = sid != null ? data.value.find(r => r.id === sid) : null;

  return (
    <div className="app">
      <div className="filter-bar">
        <input type="text" placeholder="Search by name..." onChange={handleSearch} data-role="search-input" />
      </div>

      <div className="toolbar">
        <button className={sf === 'all' ? 'active' : ''} onClick={() => doSetStatusFilter('all')} data-role="status-filter" data-status="all">All</button>
        {STATUSES.map(s => (
          <button key={s} className={sf === s ? 'active' : ''} onClick={() => doSetStatusFilter(s)} data-role="status-filter" data-status={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>{filteredSorted.value.length} records</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} data-column={col.key} onClick={() => doSort(col.key)}>
                    {col.label}
                    <span className={`sort-indicator${sc === col.key ? ' active' : ''}`}>
                      {sc !== col.key ? '↕' : sd === 'asc' ? '↑' : '↓'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} data-row={row.id} className={sid === row.id ? 'selected' : ''} onClick={() => doSetSelectedId(row.id)} style={{ cursor: 'pointer' }}>
                  <td data-column="name">{row.name}</td>
                  <td data-column="status"><span className={`badge badge-${row.status}`}>{row.status}</span></td>
                  <td data-column="createdDate">{row.createdDate}</td>
                  <td data-column="value">${row.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button onClick={() => setPage(cp - 1)} disabled={cp <= 1} data-action="prev-page">Previous</button>
            <span className="page-info" data-role="page-info">Page {cp} of {tp}</span>
            <button onClick={() => setPage(cp + 1)} disabled={cp >= tp} data-action="next-page">Next</button>
          </div>
        </div>

        {selectedRecord && (
          <div className="detail-panel" data-role="detail-panel" style={{ width: 300, padding: '1rem', border: '1px solid #ccc', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <strong>Record #{selectedRecord.id}</strong>
              <button onClick={() => doSetSelectedId(null)} data-role="detail-close">&times;</button>
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
