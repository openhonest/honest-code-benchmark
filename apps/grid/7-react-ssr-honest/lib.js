// Server-side pure functions (declared in grid.hd)

export function filter_by_category(rows, category) {
  if (category === 'All') return rows;
  return rows.filter(r => r.category === category);
}

export function paginate(rows, page, perPage) {
  const start = (page - 1) * perPage;
  return {
    pageRows: rows.slice(start, start + perPage),
    totalPages: Math.ceil(rows.length / perPage) || 1,
    totalFiltered: rows.length,
  };
}

export function compute_row_total(row) {
  return row.q1 + row.q2 + row.q3 + row.q4;
}

export function compute_row_variance(row) {
  return compute_row_total(row) - row.budgetTarget;
}

export function compute_totals(rows) {
  const t = { q1: 0, q2: 0, q3: 0, q4: 0, budgetTarget: 0 };
  for (const r of rows) {
    t.q1 += r.q1;
    t.q2 += r.q2;
    t.q3 += r.q3;
    t.q4 += r.q4;
    t.budgetTarget += r.budgetTarget;
  }
  t.total = t.q1 + t.q2 + t.q3 + t.q4;
  t.variance = t.total - t.budgetTarget;
  return t;
}

export function format_number(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Client-side pure functions (post-hydration, not in .hd)

export function commit_cell_edit(rows, id, field, value) {
  return rows.map(r => r.id === id ? { ...r, [field]: value } : r);
}

export function bulk_fill(rows, selected, quarter, value) {
  return rows.map(r => selected[r.id] ? { ...r, [quarter]: value } : r);
}

export function toggle_row(selected, id) {
  const next = { ...selected };
  if (next[id]) delete next[id]; else next[id] = true;
  return next;
}

export function toggle_all_visible(selected, ids) {
  const allIn = ids.every(id => selected[id]);
  const next = { ...selected };
  if (allIn) ids.forEach(id => delete next[id]);
  else ids.forEach(id => { next[id] = true; });
  return next;
}

// Server view: the shared client's first render (all categories, page 1,
// nothing selected, no cell in edit).
export const ROWS_PER_PAGE = 25;
export const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
export const INITIAL_STATE = { category: 'All', currentPage: 1, selected: {}, bulkQuarter: 'q1', bulkValue: '' };

export function variance_class(variance) {
  return variance < 0 ? 'over-budget' : 'under-budget';
}

export function build_view(rows, state = INITIAL_STATE) {
  const filtered = filter_by_category(rows, state.category);
  const page = paginate(filtered, state.currentPage, ROWS_PER_PAGE);
  const visibleIds = page.pageRows.map(r => r.id);
  return {
    ...page,
    state,
    categories: [...new Set(rows.map(r => r.category))].sort(),
    totals: compute_totals(filtered),
    selCount: Object.keys(state.selected).length,
    allVisibleSelected: visibleIds.length > 0 && visibleIds.every(id => state.selected[id]),
  };
}
