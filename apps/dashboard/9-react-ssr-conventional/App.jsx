// Arm 9 server tree, written the conventional way: context providers, custom
// hooks, a domain model, switch rendering and wrapper components. The browser
// hydrates it with ../shared-client/App.jsx, so the markup must match that
// client's first render.
import React, { useMemo } from 'react';
import { formatUpdated } from '../../lib/dashboard-refresh.js';
import { ThemeProvider, ErrorBoundary, Layout, DataLoader, createStore, useFormatters, sortIndicator } from './patterns.jsx';

const COLUMNS = [
  { key: 'id', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'items', label: 'Items' },
];

const INITIAL_FILTERS = { category: 'All', status: 'All', dateFrom: '', dateTo: '', sortCol: null, sortDir: null, currentPage: 1 };
const noop = () => {};

const [DataProvider, useOrderBook] = createStore('OrderData');
const [FilterProvider, useFilters] = createStore('OrderFilters');

function useDashboardView() {
  const book = useOrderBook();
  const filters = useFilters();
  return useMemo(() => book.view(filters), [book, filters]);
}

function KpiValue({ kind, value }) {
  const fmt = useFormatters();
  switch (kind) {
    case 'money':
      return <>${fmt.money(value)}</>;
    default:
      return <>{value}</>;
  }
}

function LastUpdated({ at }) {
  return <div className="last-updated">Last updated <time data-role="last-updated" dateTime={at}>{formatUpdated(at)}</time></div>;
}

function KpiCards({ kpis }) {
  return (
    <div className="dashboard-cards">
      <div className="card"><div className="card-label">Total Orders</div><div className="card-value" data-role="total-orders"><KpiValue kind="count" value={kpis.totalOrders} /></div></div>
      <div className="card"><div className="card-label">Total Revenue</div><div className="card-value" data-role="total-revenue"><KpiValue kind="money" value={kpis.totalRevenue} /></div></div>
      <div className="card"><div className="card-label">Average Order</div><div className="card-value" data-role="avg-order"><KpiValue kind="money" value={kpis.avgOrder} /></div></div>
      <div className="card"><div className="card-label">Unique Customers</div><div className="card-value" data-role="unique-customers"><KpiValue kind="count" value={kpis.uniqueCustomers} /></div></div>
    </div>
  );
}

function Filters() {
  const book = useOrderBook();
  const filters = useFilters();
  return (
    <div className="filter-bar">
      <select value={filters.category} onChange={noop} data-role="category-filter">
        <option value="All">All Categories</option>
        {book.categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filters.status} onChange={noop} data-role="status-filter">
        <option value="All">All Statuses</option>
        {book.statuses.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="date" value={filters.dateFrom} onChange={noop} data-role="date-from" />
      <input type="date" value={filters.dateTo} onChange={noop} data-role="date-to" />
    </div>
  );
}

function OrderRow({ order }) {
  const fmt = useFormatters();
  return (
    <tr data-row={order.id}>
      <td>{order.id}</td>
      <td>{order.date}</td>
      <td>{order.customerName}</td>
      <td>{order.category}</td>
      <td>${fmt.money(order.amount)}</td>
      <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
      <td>{order.items}</td>
    </tr>
  );
}

function OrdersTable({ pageRows }) {
  const { sortCol, sortDir } = useFilters();
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
        {pageRows.map(o => <OrderRow key={o.id} order={o} />)}
      </tbody>
    </table>
  );
}

function Pagination({ totalPages }) {
  const { currentPage } = useFilters();
  return (
    <div className="pagination">
      <button disabled={currentPage <= 1} data-action="prev-page">Previous</button>
      <span className="page-info" data-role="page-info">Page {currentPage} of {totalPages}</span>
      <button disabled={currentPage >= totalPages} data-action="next-page">Next</button>
    </div>
  );
}

function Dashboard({ loadedAt }) {
  const { kpis, pageRows, totalPages } = useDashboardView();
  return (
    <>
      <LastUpdated at={loadedAt} />
      <KpiCards kpis={kpis} />
      <Filters />
      <OrdersTable pageRows={pageRows} />
      <Pagination totalPages={totalPages} />
    </>
  );
}

export default function App({ book, filters = INITIAL_FILTERS, loadedAt = '' }) {
  return (
    <ErrorBoundary>
      <DataProvider value={book}>
        <FilterProvider value={filters}>
          <ThemeProvider>
            <Layout>
              <DataLoader ready={book != null}>
                <Dashboard loadedAt={loadedAt} />
              </DataLoader>
            </Layout>
          </ThemeProvider>
        </FilterProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}
