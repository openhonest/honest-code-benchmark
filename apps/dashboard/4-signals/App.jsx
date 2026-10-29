import React, { useEffect, useMemo } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  data, categoryFilter, statusFilter, dateFrom, dateTo,
  sortColumn, sortDirection, currentPage,
  filtered, pageRows, totalPages,
  setData, doSort,
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
  useSignals();

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl).then(r => r.json()).then(setData);
  }, []);

  const categories = useMemo(() => [...new Set(data.value.map(r => r.category))].sort(), [data.value]);
  const statuses = useMemo(() => [...new Set(data.value.map(r => r.status))].sort(), [data.value]);

  const f = filtered.value;
  const totalRevenue = f.reduce((s, r) => s + r.amount, 0);
  const avgOrder = f.length > 0 ? totalRevenue / f.length : 0;
  const uniqueCustomers = new Set(f.map(r => r.customerName)).size;

  const rows = pageRows.value;
  const sc = sortColumn.value;
  const sd = sortDirection.value;
  const cp = currentPage.value;
  const tp = totalPages.value;

  return (
    <div className="app">
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{f.length}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{uniqueCustomers}</div></div>
      </div>

      <div className="filter-bar">
        <select value={categoryFilter.value} onChange={e => { categoryFilter.value = e.target.value; currentPage.value = 1; }} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter.value} onChange={e => { statusFilter.value = e.target.value; currentPage.value = 1; }} data-role="status-filter">
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom.value} onChange={e => { dateFrom.value = e.target.value; currentPage.value = 1; }} data-role="date-from" />
        <input type="date" value={dateTo.value} onChange={e => { dateTo.value = e.target.value; currentPage.value = 1; }} data-role="date-to" />
      </div>

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
        <button onClick={() => { currentPage.value = cp - 1; }} disabled={cp <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {cp} of {tp}</span>
        <button onClick={() => { currentPage.value = cp + 1; }} disabled={cp >= tp} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
