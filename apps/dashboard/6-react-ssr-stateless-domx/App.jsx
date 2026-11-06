import React, { useState, useEffect, useCallback } from 'react';
import { useServerPage } from '../../lib/arm6-client.js';
import { formatUpdated, subscribeRefresh } from '../../lib/dashboard-refresh.js';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

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

const INITIAL_QUERY = { category: 'All', status: 'All', dateFrom: '', dateTo: '', col: '', dir: '', page: '1' };

function money(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App({ initialPage }) {
  const { domState, ready } = useDomStateSSR(stateManifest);

  const categoryFilter = ready ? (domState.categoryFilter || 'All') : 'All';
  const statusFilter = ready ? (domState.statusFilter || 'All') : 'All';
  const dateFrom = ready ? (domState.dateFrom || '') : '';
  const dateTo = ready ? (domState.dateTo || '') : '';
  const sortCol = ready ? (domState.sortCol || null) : null;
  const sortDir = ready ? (domState.sortDir || null) : null;
  const requestedPage = ready ? (parseInt(domState.page, 10) || 1) : 1;

  // Auto-refresh re-reads the current query from SQLite. The tick only
  // forces the refetch; filters, sort and page stay in the DOM.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => subscribeRefresh(() => setRefreshTick(t => t + 1)), []);

  const pageData = useServerPage(initialPage, {
    category: categoryFilter, status: statusFilter, dateFrom, dateTo,
    col: sortCol || '', dir: sortDir || '', page: String(requestedPage),
  }, INITIAL_QUERY, refreshTick);

  useEffect(() => {
    if (ready) writeState({ page: '1' });
  }, [ready]);

  const { categories, statuses, rows: pageRows, page: currentPage, totalPages } = pageData;
  const totalOrders = pageData.total;
  const totalRevenue = pageData.totalRevenue;
  const avgOrder = pageData.avgOrder;
  const uniqueCustomers = pageData.uniqueCustomers;
  const lastUpdated = pageData.loadedAt || '';

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

      <div className="last-updated">Last updated <time data-role="last-updated" dateTime={lastUpdated}>{formatUpdated(lastUpdated)}</time></div>
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{totalOrders}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${money(totalRevenue)}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${money(avgOrder)}</div></div>
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
              <td>${money(row.amount)}</td>
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
