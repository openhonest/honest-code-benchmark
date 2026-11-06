import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useServerPage, getJSON } from '../../lib/arm6-client.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];
let domxModule = null;
const stateManifest = {
  search:       { selector: '#browser-state', read: 'data:search',       write: 'data:search' },
  statusFilter: { selector: '#browser-state', read: 'data:statusFilter', write: 'data:statusFilter' },
  sortCol:      { selector: '#browser-state', read: 'data:sortCol',      write: 'data:sortCol' },
  sortDir:      { selector: '#browser-state', read: 'data:sortDir',      write: 'data:sortDir' },
  page:         { selector: '#browser-state', read: 'data:page',         write: 'data:page' },
  selectedId:   { selector: '#browser-state', read: 'data:selectedId',   write: 'data:selectedId' },
};

function writeState(updates) {
  if (domxModule) domxModule.apply(stateManifest, updates);
}

function useDomStateSSR(manifest) {
  const [domState, setDomState] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('stateless-dataos').then(mod => {
      domxModule = mod;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !domxModule) return;
    const collect = () => {
      const state = domxModule.collect(manifest);
      setDomState(state);
    };
    collect();
    const unsub = domxModule.observe(manifest, collect);
    return unsub;
  }, [ready]);

  return { domState, ready };
}

const INITIAL_QUERY = { q: '', status: 'all', col: '', dir: '', page: '1' };

export default function App({ initialPage }) {
  const { domState, ready } = useDomStateSSR(stateManifest);
  const searchTimeout = useRef(null);

  const searchText = ready ? (domState.search || '') : '';
  const statusFilter = ready ? (domState.statusFilter || 'all') : 'all';
  const sortCol = ready ? (domState.sortCol || null) : null;
  const sortDir = ready ? (domState.sortDir || null) : null;
  const requestedPage = ready ? (parseInt(domState.page, 10) || 1) : 1;
  const selectedId = ready ? (domState.selectedId ? parseInt(domState.selectedId, 10) : null) : null;

  const pageData = useServerPage(initialPage, {
    q: searchText, status: statusFilter, col: sortCol || '', dir: sortDir || '', page: String(requestedPage),
  }, INITIAL_QUERY);

  useEffect(() => {
    if (ready) writeState({ page: '1', statusFilter: 'all' });
  }, [ready]);

  const { rows: pageRows, page: currentPage, totalPages } = pageData;

  // The selected record may sit on another page, so it comes from the server.
  const [selectedRecord, setSelectedRecord] = useState(null);
  useEffect(() => {
    if (selectedId == null) { setSelectedRecord(null); return; }
    const onPage = pageRows.find(r => r.id === selectedId);
    if (onPage) { setSelectedRecord(onPage); return; }
    let live = true;
    getJSON(`record/${selectedId}`).then(r => { if (live) setSelectedRecord(r); });
    return () => { live = false; };
  }, [selectedId]);

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => writeState({ search: value, page: '1' }), 300);
  }, []);

  const handleSort = useCallback((col) => {
    if (sortCol === col) {
      if (sortDir === 'asc') writeState({ sortDir: 'desc' });
      else writeState({ sortCol: '', sortDir: '' });
    } else {
      writeState({ sortCol: col, sortDir: 'asc' });
    }
  }, [sortCol, sortDir]);

  return (
    <div className="app">
      <div id="browser-state"
        data-search="" data-status-filter="all" data-sort-col="" data-sort-dir=""
        data-page="1" data-selected-id=""
        style={{ display: 'none' }}
      />

      <div className="filter-bar">
        <input type="text" placeholder="Search by name..." onChange={handleSearch} data-role="search-input" />
      </div>

      <div className="toolbar">
        <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => writeState({ statusFilter: 'all', page: '1' })} data-role="status-filter" data-status="all">All</button>
        {STATUSES.map(s => (
          <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => writeState({ statusFilter: s, page: '1' })} data-role="status-filter" data-status={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>{pageData.total} records</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} data-column={col.key} onClick={() => handleSort(col.key)}>
                    {col.label}
                    <span className={`sort-indicator${sortCol === col.key ? ' active' : ''}`}>
                      {sortCol !== col.key ? '↕' : sortDir === 'asc' ? '↑' : '↓'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => (
                <tr key={row.id} data-row={row.id} className={selectedId === row.id ? 'selected' : ''} onClick={() => writeState({ selectedId: String(row.id) })} style={{ cursor: 'pointer' }}>
                  <td data-column="name">{row.name}</td>
                  <td data-column="status"><span className={`badge badge-${row.status}`}>{row.status}</span></td>
                  <td data-column="createdDate">{row.createdDate}</td>
                  <td data-column="value">${row.value.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button onClick={() => writeState({ page: String(currentPage - 1) })} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
            <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
            <button onClick={() => writeState({ page: String(currentPage + 1) })} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
          </div>
        </div>

        {selectedRecord && (
          <div className="detail-panel" data-role="detail-panel" style={{ width: 300, padding: '1rem', border: '1px solid #ccc', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <strong>Record #{selectedRecord.id}</strong>
              <button onClick={() => writeState({ selectedId: '' })} data-role="detail-close">&times;</button>
            </div>
            <dl>
              <dt>Name</dt><dd>{selectedRecord.name}</dd>
              <dt>Status</dt><dd><span className={`badge badge-${selectedRecord.status}`}>{selectedRecord.status}</span></dd>
              <dt>Created</dt><dd>{selectedRecord.createdDate}</dd>
              <dt>Value</dt><dd>${selectedRecord.value.toLocaleString('en-US')}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
