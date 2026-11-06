// Client helpers for arm 6 (React SSR + stateless DOM state).
// Arm 6 keeps its UI state in the DOM and asks the server for one page of
// rows at a time. The server answers from SQLite with LIMIT/OFFSET, so the
// browser never holds the full data set.

import { useEffect, useRef, useState } from 'react';

export function apiBase() {
  const config = window.__BENCHMARK_CONFIG__;
  return `/${config.archetype}/${config.arm}/api`;
}

export function queryKey(query) {
  return new URLSearchParams(query).toString();
}

// Returns the current server page. It starts with the page the server
// rendered and refetches whenever the query changes, or when refreshTick
// changes (the dashboard's auto-refresh re-reads the same query). Responses
// that arrive after a newer request are dropped.
export function useServerPage(initialPage, query, initialQuery, refreshTick = 0) {
  const [page, setPage] = useState(initialPage);
  const key = queryKey(query);
  const lastKey = useRef(queryKey(initialQuery));
  const lastTick = useRef(refreshTick);
  const requestId = useRef(0);

  useEffect(() => {
    if (key === lastKey.current && refreshTick === lastTick.current) return;
    lastKey.current = key;
    lastTick.current = refreshTick;
    const id = ++requestId.current;
    fetch(`${apiBase()}/page?${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((next) => { if (next && id === requestId.current) setPage(next); })
      .catch(() => {});
  }, [key, refreshTick]);

  return page;
}

export async function postJSON(path, body) {
  const r = await fetch(`${apiBase()}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.ok;
}

export async function getJSON(path) {
  const r = await fetch(`${apiBase()}/${path}`);
  return r.ok ? r.json() : null;
}
