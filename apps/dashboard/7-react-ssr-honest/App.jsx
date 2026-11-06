// Arm 7 server tree. Plain function component, no hooks: the view comes from
// build_view() in lib.js. The browser hydrates it with ../shared-client/App.jsx.
import React from 'react';
import { format_amount, format_updated, sort_indicator } from './lib.js';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

const noop = () => {};

export default function App({ view, loadedAt = '' }) {
  const { state, kpis, categories, statuses, pageRows, totalPages } = view;
  const currentPage = state.currentPage;
  return (
    <div className="app">
      <div className="last-updated">Last updated <time data-role="last-updated" dateTime={loadedAt}>{format_updated(loadedAt)}</time></div>
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{kpis.totalOrders}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${format_amount(kpis.totalRevenue)}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${format_amount(kpis.avgOrder)}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{kpis.uniqueCustomers}</div></div>
      </div>

      <div className="filter-bar">
        <select value={state.category} onChange={noop} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={state.status} onChange={noop} data-role="status-filter">
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={state.dateFrom} onChange={noop} data-role="date-from" />
        <input type="date" value={state.dateTo} onChange={noop} data-role="date-to" />
      </div>

      <table>
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key}>
                {col.label}
                <span className={`sort-indicator${state.sortCol === col.key ? ' active' : ''}`}>
                  {sort_indicator(state, col.key)}
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
              <td>${format_amount(row.amount)}</td>
              <td><span className={`status-badge status-${row.status}`}>{row.status}</span></td>
              <td>{row.items}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage >= totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
