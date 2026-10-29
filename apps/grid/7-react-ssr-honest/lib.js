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
