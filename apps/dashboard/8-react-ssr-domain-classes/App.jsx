import React, { useState, useEffect, useCallback } from 'react';
import { DashboardModel } from './domain.js';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

function fmtCurrency(n) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App({ initialData }) {
  const [model] = useState(() => DashboardModel.fromData(initialData || []));
  const [, forceUpdate] = useState(0);

  const update = useCallback(() => forceUpdate(c => c + 1), []);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { model.orders = data; update(); });
    }
  }, [initialData, model, update]);

  const pageRows = model.getPageRows();
  const totalPages = model.getTotalPages();

  return (
    <div className="app">
      <div className="cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{model.getTotalOrders()}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">{fmtCurrency(model.getTotalRevenue())}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">{fmtCurrency(model.getAvgOrder())}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{model.getUniqueCustomers()}</div></div>
      </div>

      <div className="filter-bar">
        <select value={model.categoryFilter} onChange={e => { model.setCategoryFilter(e.target.value); update(); }} data-role="category-filter">
          <option value="All">All Categories</option>
          {model.getCategories().map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={model.statusFilter} onChange={e => { model.setStatusFilter(e.target.value); update(); }} data-role="status-filter">
          <option value="All">All Statuses</option>
          {model.getStatuses().map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={model.dateFrom} onChange={e => { model.setDateFrom(e.target.value); update(); }} data-role="date-from" />
        <input type="date" value={model.dateTo} onChange={e => { model.setDateTo(e.target.value); update(); }} data-role="date-to" />
      </div>

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
            <tr key={row.id} data-row={row.id}>
              <td>{row.id}</td>
              <td>{row.date}</td>
              <td>{row.customerName}</td>
              <td>{row.category}</td>
              <td>{fmtCurrency(row.amount)}</td>
              <td><span className={`badge badge-${row.status}`}>{row.status}</span></td>
              <td>{row.items}</td>
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
  );
}
