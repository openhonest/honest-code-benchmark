import React from 'react';
import { ROWS_PER_PAGE } from './domain.js';
import { formatUpdated } from '../../lib/dashboard-refresh.js';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

export default function ServerApp({ orders, loadedAt = '' }) {
  const totalPages = Math.max(1, Math.ceil(orders.length / ROWS_PER_PAGE));
  const currentPage = 1;
  const pageRows = orders.slice(0, ROWS_PER_PAGE);

  const categories = [...new Set(orders.map(r => r.category))].sort();
  const statuses = [...new Set(orders.map(r => r.status))].sort();

  const totalRevenue = orders.reduce((s, r) => s + r.amount, 0);
  const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;
  const uniqueCustomers = new Set(orders.map(r => r.customerName)).size;

  return (
    <div className="app">
      <div className="last-updated">Last updated <time data-role="last-updated" dateTime={loadedAt}>{formatUpdated(loadedAt)}</time></div>
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{orders.length}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">${avgOrder.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{uniqueCustomers}</div></div>
      </div>

      <div className="filter-bar">
        <select value="All" onChange={() => {}} data-role="category-filter">
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value="All" onChange={() => {}} data-role="status-filter">
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value="" onChange={() => {}} data-role="date-from" />
        <input type="date" value="" onChange={() => {}} data-role="date-to" />
      </div>

      <table>
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th key={col.key} data-column={col.key}>
                {col.label}
                <span className="sort-indicator">
                  {'↕'}
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
              <td>${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
