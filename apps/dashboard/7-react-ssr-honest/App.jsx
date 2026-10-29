import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  filter_by_category, filter_by_status, filter_by_date_range,
  sort_rows, paginate, compute_kpis, format_currency,
} from './lib.js';

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

export default function App({ initialData }) {
  const [data, setData] = useState(initialData || []);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl).then(r => r.json()).then(setData);
    }
  }, [initialData]);

  const categories = useMemo(() => [...new Set(data.map(r => r.category))].sort(), [data]);
  const statuses = useMemo(() => [...new Set(data.map(r => r.status))].sort(), [data]);

  const filtered = useMemo(() => {
    let rows = filter_by_category(data, categoryFilter);
    rows = filter_by_status(rows, statusFilter);
    rows = filter_by_date_range(rows, dateFrom, dateTo);
    return rows;
  }, [data, categoryFilter, statusFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    if (!sortColumn || !sortDirection) return filtered;
    return sort_rows(filtered, sortColumn, sortDirection);
  }, [filtered, sortColumn, sortDirection]);

  const page = useMemo(
    () => paginate(sorted, currentPage, ROWS_PER_PAGE),
    [sorted, currentPage],
  );

  const kpis = useMemo(() => compute_kpis(filtered), [filtered]);

  const handleSort = useCallback((col) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDirection(d => {
          if (d === 'asc') return 'desc';
          setSortColumn(null);
          return null;
        });
        return prev;
      }
      setSortDirection('asc');
      return col;
    });
  }, []);

  useEffect(() => { setCurrentPage(1); }, [categoryFilter, statusFilter, dateFrom, dateTo]);

  return (
    <div className="app">
      <div className="dashboard-cards">
        <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders">{kpis.totalOrders}</div></div>
        <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue">{format_currency(kpis.totalRevenue)}</div></div>
        <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order">{format_currency(kpis.avgOrder)}</div></div>
        <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers">{kpis.uniqueCustomers}</div></div>
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
          {page.pageRows.map(row => (
            <tr key={row.id} data-row={row.id}>
              <td>{row.id}</td>
              <td>{row.date}</td>
              <td>{row.customerName}</td>
              <td>{row.category}</td>
              <td>{format_currency(row.amount)}</td>
              <td><span className={`status-badge status-${row.status}`}>{row.status}</span></td>
              <td>{row.items}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1} data-action="prev-page">Previous</button>
        <span className="page-info" data-role="page-info">Page {currentPage} of {page.totalPages}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= page.totalPages} data-action="next-page">Next</button>
      </div>
    </div>
  );
}
