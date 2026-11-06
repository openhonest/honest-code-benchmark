// Reload persistence for the htmx arms (10 and 11).
//
// Every htmx request on these pages sends the whole page state (the hidden
// inputs), so the last successful request is enough to rebuild the page. It
// is saved in localStorage, one entry per page URL, and replayed once after a
// reload.
//
// A GET is saved. A POST is saved only when its element carries data-replay,
// which marks a POST that changes the view without writing anything (a
// selection toggle, a form step). Writes (delete, edit, bulk fill, submit)
// are never replayed. A request that swaps into a target without an id, such
// as the inline cell editor, is not saved either.
(function () {
  var KEY = 'htmx-replay:' + location.pathname + location.search;
  var replaying = false;

  function load() {
    try {
      var last = JSON.parse(localStorage.getItem(KEY));
      if (last && typeof last.verb === 'string' && typeof last.path === 'string'
        && /^#[\w-]+$/.test(last.target) && typeof last.swap === 'string'
        && last.parameters && typeof last.parameters === 'object') return last;
    } catch (e) { /* corrupt entry or no storage */ }
    return null;
  }

  function save(entry) {
    try { localStorage.setItem(KEY, JSON.stringify(entry)); } catch (e) { /* storage full or blocked */ }
  }

  // Decide before the request goes out: an outerHTML swap removes the
  // element, and htmx:afterRequest then reports a parent in its place.
  document.addEventListener('htmx:beforeRequest', function (e) {
    var elt = e.detail.elt;
    if (e.detail.requestConfig.verb !== 'get' && !elt.hasAttribute('data-replay')) return;
    var swapElt = elt.closest('[hx-swap]');
    e.detail.xhr.htmxReplaySwap = swapElt ? swapElt.getAttribute('hx-swap') : htmx.config.defaultSwapStyle;
  });

  document.addEventListener('htmx:afterSwap', function (e) {
    e.detail.xhr.htmxReplaySwapped = true;
  });

  document.addEventListener('htmx:afterRequest', function (e) {
    var d = e.detail;
    var cfg = d.requestConfig;
    if (replaying || !d.successful || !d.xhr.htmxReplaySwap || !d.xhr.htmxReplaySwapped) return;
    if (!d.target || !d.target.id) return;
    save({
      verb: cfg.verb,
      path: cfg.path,
      parameters: cfg.parameters,
      target: '#' + d.target.id,
      swap: d.xhr.htmxReplaySwap,
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var last = load();
    if (!last || !document.querySelector(last.target)) return;
    replaying = true;
    var done = function () { replaying = false; };
    htmx.ajax(last.verb, last.path, {
      source: last.target, target: last.target, swap: last.swap, values: last.parameters,
    }).then(done, done);
  });
})();
