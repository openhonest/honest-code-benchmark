import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

const ROWS_PER_PAGE = 25;

let domxModule = null;
const stateManifest = {
  categoryFilter: { selector: '#dashboard-state', read: 'data:categoryFilter', write: 'data:categoryFilter' },
  statusFilter:   { selector: '#dashboard-state', read: 'data:statusFilter',   write: 'data:statusFilter' },
  dateFrom:       { selector: '#dashboard-state', read: 'data:dateFrom',       write: 'data:dateFrom' },
  dateTo:         { selector: '#dashboard-state', read: 'data:dateTo',         write: 'data:dateTo' },
  sortCol:        { selector: '#dashboard-state', read: 'data:sortCol',        write: 'data:sortCol' },
  sortDir:        { selector: '#dashboard-state', read: 'data:sortDir',        write: 'data:sortDir' },
  page:           { selector: '#dashboard-state', read: 'data:page',           write: 'data:page' },
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

let rowData = [];

export default function App({ initialData }) {
  const { domState, ready } = useDomStateSSR(stateManifest);
  const hydrated = useRef(false);

  if (initialData && !hydrated.current) {
    rowData = initialData;
    hydrated.current = true;
  }

  const categoryFilter = ready ? (domState.categoryFilter || 'All') : 'All';
  const statusFilter = ready ? (domState.statusFilter || 'All') : 'All';
  const dateFrom = ready ? (domState.dateFrom || '') : '';
  const dateTo = ready ? (domState.dateTo || '') : '';
  const sortCol = ready ? (domState.sortCol || null) : null;
  const sortDir = ready ? (domState.sortDir || null) : null;
  const currentPage = ready ? (parseInt(domState.page, 10) || 1) : 1;

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { rowData = data; });
    }
  }, [initialData]);

  useEffect(() => {
    if (ready && rowData.length > 0) {
      writeState({ page: '1' });
    }
  }, [ready]);

  const categories = useMemo(() => [...new Set(rowData.map(r => r.category))].sort(), [rowData.length]);
  const statuses = useMemo(() => [...new Set(rowData.map(r => r.status))].sort(), [rowData.length]);

  const filtered = useMemo(() => {
    let rows = rowData;
    if (categoryFilter !== 'All') rows = rows.filter(r => r.category === categoryFilter);
    if (statusFilter !== 'All') rows = rows.filter(r => r.status === statusFilter);
    if (dateFrom) rows = rows.filter(r => r.date >= dateFrom);
    if (dateTo) rows = rows.filter(r => r.date <= dateTo);
    return rows;
  }, [categoryFilter, statusFilter, dateFrom, dateTo, rowData.length]);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      let cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const pageRows = sorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totalRevenue = filtered.reduce((s, r) => s + r.amount, 0);
  const avgOrder = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const uniqueCustomers = new Set(filtered.map(r => r.customerName)).size;

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
      <div id="dashboard-state"
        data-category-filter="All" data-status-filter="All"
        data-date-from="" data-date-to=""
        data-sort-col="" data-sort-dir="" data-page="1"
        style={{ display: 'none' }}
      />

      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{filtered.length}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{uniqueCustomers}</div></div>
      </div>

      <div className="filter-bar">
        <select value={categoryFilter} onChange={e => writeState({ categoryFilter: e.target.value, page: '1' })} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => writeState({ statusFilter: e.target.value, page: '1' })} data-role="status-filter">
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => writeState({ dateFrom: e.target.value, page: '1' })} data-role="date-from" />
        <input type="date" value={dateTo} onChange={e => writeState({ dateTo: e.target.value, page: '1' })} data-role="date-to" />
      </div>

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
            <tr key={row.id} data-row={row.id}>
              <td>{row.id}</td>
              <td>{row.date}</td>
              <td>{row.customerName}</td>
              <td>{row.category}</td>
              <td>${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td><span className={`status-badge status-${row.status}`}>{row.status}</span></td>
              <td>{row.items}</td>
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
  );
}
