// Dashboard auto-refresh, shared by the React arms (1-9).
//
// The interval comes from window.__BENCHMARK_CONFIG__.refreshSeconds, which
// the server sets from the page's ?refresh=N query parameter (default 60;
// 0 turns the timer off). Dispatching REFRESH_EVENT on document.body
// triggers a refresh at once, which is how the harness drives it. The htmx
// arms listen for the same event with hx-trigger="... from:body".

export const REFRESH_EVENT = 'dashboard-refresh';
export const DEFAULT_REFRESH_SECONDS = 60;

// "2026-10-30T19:03:12.345Z" -> "19:03:12 UTC". Fixed format and zone, so the
// server markup and the client's first render agree.
export function formatUpdated(iso) {
  return iso ? `${iso.slice(11, 19)} UTC` : '';
}

export function refreshSeconds() {
  const s = typeof window !== 'undefined' ? window.__BENCHMARK_CONFIG__?.refreshSeconds : undefined;
  return Number.isInteger(s) && s >= 0 ? s : DEFAULT_REFRESH_SECONDS;
}

// Calls onRefresh on every tick and on every REFRESH_EVENT. Returns cleanup.
export function subscribeRefresh(onRefresh) {
  const seconds = refreshSeconds();
  const timer = seconds > 0 ? setInterval(onRefresh, seconds * 1000) : null;
  const handler = () => onRefresh();
  document.body.addEventListener(REFRESH_EVENT, handler);
  return () => {
    if (timer) clearInterval(timer);
    document.body.removeEventListener(REFRESH_EVENT, handler);
  };
}

// Re-reads the data file, bypassing the HTTP cache so every refresh
// downloads and parses the full payload again.
export function refetchRows(url) {
  return fetch(url, { cache: 'no-store' }).then(r => r.json());
}
