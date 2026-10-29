import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];
const ROWS_PER_PAGE = 25;

export default function App({ initialData }) {
  const [data, setData] = useState(initialData || []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl).then(r => r.json()).then(rows => setData(rows));
    }
  }, [initialData]);

  const filteredSorted = useMemo(() => {
    let rows = data;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.status === statusFilter);
    }
    if (sortColumn && sortDirection) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortColumn], bv = b[sortColumn];
        let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return sortDirection === 'desc' ? -cmp : cmp;
      });
    }
    return rows;
  }, [data, search, statusFilter, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ROWS_PER_PAGE));
  const pageRows = filteredSorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const selectedRecord = selectedId != null ? data.find(r => r.id === selectedId) : null;

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 300);
  }, []);

  const handleSort = useCallback((col) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDirection(d => {
          if (d === 'asc') return 'desc';
          setSortColumn(null);
          return null;
        });
        return prev;
      }
      setSortDirection('asc');
      return col;
    });
  }, []);

  return (
    <div className="app">
      <div className="filter-bar">
        <input type="text" placeholder="Search by name..." onChange={handleSearch} data-role="search-input" />
      </div>

      <div className="toolbar">
        <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => { setStatusFilter('all'); setCurrentPage(1); }} data-role="status-filter" data-status="all">All</button>
        {STATUSES.map(s => (
          <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => { setStatusFilter(s); setCurrentPage(1); }} data-role="status-filter" data-status={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>{filteredSorted.length} records</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} data-column={col.key} onClick={() => handleSort(col.key)}>
                    {col.label}
                    <span className={`sort-indicator${sortColumn === col.key ? ' active' : ''}`}>
                      {sortColumn !== col.key ? '↕' : sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => (
                <tr key={row.id} data-row={row.id} className={selectedId === row.id ? 'selected' : ''} onClick={() => setSelectedId(row.id)} style={{ cursor: 'pointer' }}>
                  <td data-column="name">{row.name}</td>
                  <td data-column="status"><span className={`badge badge-${row.status}`}>{row.status}</span></td>
                  <td data-column="createdDate">{row.createdDate}</td>
                  <td data-column="value">${row.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
            <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
          </div>
        </div>

        {selectedRecord && (
          <div className="detail-panel" data-role="detail-panel" style={{ width: 300, padding: '1rem', border: '1px solid #ccc', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <strong>Record #{selectedRecord.id}</strong>
              <button onClick={() => setSelectedId(null)} data-role="detail-close">&times;</button>
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
