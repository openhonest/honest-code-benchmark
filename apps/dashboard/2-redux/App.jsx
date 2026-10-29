import React, { useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setData, setCategoryFilter, setStatusFilter, setDateFrom, setDateTo, sort, setPage,
  selectFiltered, selectPageRows, selectTotalPages,
} from './store.js';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

export default function App() {
  const dispatch = useDispatch();
  const data = useSelector(s => s.dashboard.data);
  const categoryFilter = useSelector(s => s.dashboard.categoryFilter);
  const statusFilter = useSelector(s => s.dashboard.statusFilter);
  const dateFrom = useSelector(s => s.dashboard.dateFrom);
  const dateTo = useSelector(s => s.dashboard.dateTo);
  const sortColumn = useSelector(s => s.dashboard.sortColumn);
  const sortDirection = useSelector(s => s.dashboard.sortDirection);
  const currentPage = useSelector(s => s.dashboard.currentPage);
  const filtered = useSelector(selectFiltered);
  const pageRows = useSelector(selectPageRows);
  const totalPages = useSelector(selectTotalPages);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl).then(r => r.json()).then(d => dispatch(setData(d)));
  }, [dispatch]);

  const categories = useMemo(() => [...new Set(data.map(r => r.category))].sort(), [data]);
  const statuses = useMemo(() => [...new Set(data.map(r => r.status))].sort(), [data]);

  const totalRevenue = filtered.reduce((s, r) => s + r.amount, 0);
  const avgOrder = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const uniqueCustomers = new Set(filtered.map(r => r.customerName)).size;

  const handleSort = useCallback((col) => dispatch(sort(col)), [dispatch]);

  return (
    <div className="app">
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{filtered.length}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{uniqueCustomers}</div></div>
      </div>

      <div className="filter-bar">
        <select value={categoryFilter} onChange={e => dispatch(setCategoryFilter(e.target.value))} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => dispatch(setStatusFilter(e.target.value))} data-role="status-filter">
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => dispatch(setDateFrom(e.target.value))} data-role="date-from" />
        <input type="date" value={dateTo} onChange={e => dispatch(setDateTo(e.target.value))} data-role="date-to" />
      </div>

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
        <button onClick={() => dispatch(setPage(currentPage - 1))} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => dispatch(setPage(currentPage + 1))} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
