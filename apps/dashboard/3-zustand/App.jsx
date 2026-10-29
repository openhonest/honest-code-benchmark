import React, { useEffect, useMemo } from 'react';
import { useDashboardStore } from './store.js';

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

export default function App() {
  const data = useDashboardStore(s => s.data);
  const categoryFilter = useDashboardStore(s => s.categoryFilter);
  const statusFilter = useDashboardStore(s => s.statusFilter);
  const dateFrom = useDashboardStore(s => s.dateFrom);
  const dateTo = useDashboardStore(s => s.dateTo);
  const sortColumn = useDashboardStore(s => s.sortColumn);
  const sortDirection = useDashboardStore(s => s.sortDirection);
  const currentPage = useDashboardStore(s => s.currentPage);
  const setData = useDashboardStore(s => s.setData);
  const setCategoryFilter = useDashboardStore(s => s.setCategoryFilter);
  const setStatusFilter = useDashboardStore(s => s.setStatusFilter);
  const setDateFrom = useDashboardStore(s => s.setDateFrom);
  const setDateTo = useDashboardStore(s => s.setDateTo);
  const doSort = useDashboardStore(s => s.sort);
  const setPage = useDashboardStore(s => s.setPage);
  const getFiltered = useDashboardStore(s => s.getFiltered);
  const getSorted = useDashboardStore(s => s.getSorted);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl).then(r => r.json()).then(setData);
  }, [setData]);

  const categories = useMemo(() => [...new Set(data.map(r => r.category))].sort(), [data]);
  const statuses = useMemo(() => [...new Set(data.map(r => r.status))].sort(), [data]);

  const filtered = useMemo(() => getFiltered(), [data, categoryFilter, statusFilter, dateFrom, dateTo]);
  const sorted = useMemo(() => getSorted(), [data, categoryFilter, statusFilter, dateFrom, dateTo, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const pageRows = sorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totalRevenue = filtered.reduce((s, r) => s + r.amount, 0);
  const avgOrder = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const uniqueCustomers = new Set(filtered.map(r => r.customerName)).size;

  return (
    <div className="app">
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{filtered.length}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{uniqueCustomers}</div></div>
      </div>

      <div className="filter-bar">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-role="status-filter">
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-role="date-from" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-role="date-to" />
      </div>

      <table>
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key} onClick={() => doSort(col.key)}>
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
        <button onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
