// Server-Timing helper shared by every Node arm (Python mirror: lib/timing.py).
//
// Phase names are fixed across both runtimes:
//   load       read rows from SQLite or the in-memory cache
//   map        turn rows into the shape the tree renders (Arms 7-9 only)
//   render     build the HTML string (React, EJS, or Jinja)
//   serialize  wrap the HTML in a page and write __SSR_DATA__ (Arms 6-9 only)
// A phase an arm does not have is left out of the header; it is never sent
// as a zero. Setup outside the request (opening a working copy) is not timed.

export function createTimer() {
  const phases = [];
  return {
    // Runs fn, records its duration under name, and returns its result.
    time(name, fn) {
      const start = performance.now();
      const result = fn();
      phases.push([name, performance.now() - start]);
      return result;
    },
    async timeAsync(name, fn) {
      const start = performance.now();
      const result = await fn();
      phases.push([name, performance.now() - start]);
      return result;
    },
    add(name, ms) {
      phases.push([name, ms]);
    },
    // One entry per phase; a phase timed more than once (for example, the
    // content partial and the page shell both render) is summed.
    header() {
      const sums = new Map();
      for (const [name, ms] of phases) sums.set(name, (sums.get(name) ?? 0) + ms);
      return [...sums].map(([name, ms]) => `${name};dur=${ms.toFixed(2)}`).join(', ');
    },
  };
}
