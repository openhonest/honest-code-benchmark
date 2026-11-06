// Arm 9 server tree, written the conventional way: context providers, custom
// hooks, a domain model, switch rendering and wrapper components. The browser
// hydrates it with ../shared-client/App.jsx, so the markup must match that
// client's first render.
import React, { useMemo } from 'react';
import { ThemeProvider, ErrorBoundary, Layout, DataLoader, createStore, useFormatters, sortIndicator } from './patterns.jsx';
import { STATUSES } from './models.js';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'createdDate', label: 'Created' },
  { key: 'value', label: 'Value' },
];

const INITIAL_FILTERS = { search: '', status: 'all', sortCol: null, sortDir: null, currentPage: 1, selectedId: null };

const [DataProvider, useRecords] = createStore('RecordData');
const [FilterProvider, useFilters] = createStore('RecordFilters');

function useBrowserView() {
  const records = useRecords();
  const filters = useFilters();
  return useMemo(() => records.view(filters), [records, filters]);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function RecordCell({ record, column }) {
  const fmt = useFormatters();
  switch (column) {
    case 'status':
      return <td data-column="status"><span className={`badge badge-${record.status}`}>{record.status}</span></td>;
    case 'value':
      return <td data-column="value">${fmt.number(record.value)}</td>;
    default:
      return <td data-column={column}>{record[column]}</td>;
  }
}

function StatusToolbar({ totalFiltered }) {
  const { status } = useFilters();
  return (
    <div className="toolbar">
      <button className={status === 'all' ? 'active' : ''} data-role="status-filter" data-status="all">
        All
      </button>
      {STATUSES.map(s => (
        <button key={s} className={status === s ? 'active' : ''} data-role="status-filter" data-status={s}>
          {capitalize(s)}
        </button>
      ))}
      <span style={{ marginLeft: 'auto' }}>
        {totalFiltered} records
      </span>
    </div>
  );
}

function RecordTable({ pageRows }) {
  const { sortCol, sortDir, selectedId } = useFilters();
  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map(col => (
            <th key={col.key} data-column={col.key}>
              {col.label}
              <span className={`sort-indicator${sortCol === col.key ? ' active' : ''}`}>
                {sortIndicator(sortCol, sortDir, col.key)}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pageRows.map(r => (
          <tr key={r.id} data-row={r.id} className={selectedId === r.id ? 'selected' : ''} style={{ cursor: 'pointer' }}>
            {COLUMNS.map(col => <RecordCell key={col.key} record={r} column={col.key} />)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pagination({ totalPages }) {
  const { currentPage } = useFilters();
  return (
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
  );
}

function DetailPanel({ record }) {
  const fmt = useFormatters();
  if (!record) return null;
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
        <dt>Value</dt><dd>${fmt.number(record.value)}</dd>
      </dl>
    </div>
  );
}

function RecordBrowserView() {
  const { pageRows, totalFiltered, totalPages, selected } = useBrowserView();
  return (
    <>
      <div className="filter-bar">
        <input type="text" placeholder="Search by name..." data-role="search-input" />
      </div>
      <StatusToolbar totalFiltered={totalFiltered} />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <RecordTable pageRows={pageRows} />
          <Pagination totalPages={totalPages} />
        </div>
        <DetailPanel record={selected} />
      </div>
    </>
  );
}

export default function App({ records, filters = INITIAL_FILTERS }) {
  return (
    <ErrorBoundary>
      <DataProvider value={records}>
        <FilterProvider value={filters}>
          <ThemeProvider>
            <Layout>
              <DataLoader ready={records != null}>
                <RecordBrowserView />
              </DataLoader>
            </Layout>
          </ThemeProvider>
        </FilterProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}
