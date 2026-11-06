"""Server-Timing helper for Arm 11. Mirror of lib/timing.js.

Phase names are the same in both runtimes:
  load       read rows from SQLite
  map        turn rows into the shape the tree renders (Arms 7-9 only)
  render     build the HTML string (React, EJS, or Jinja)
  serialize  wrap the HTML in a page and write __SSR_DATA__ (Arms 6-9 only)
A phase an arm does not have is left out of the header; it is never sent as
a zero. Setup outside the request (opening a working copy) is not timed.
"""

import time


class Timer:
    def __init__(self):
        self.phases: list[tuple[str, float]] = []

    def time(self, name, fn):
        """Runs fn, records its duration under name, and returns its result."""
        start = time.perf_counter()
        result = fn()
        self.phases.append((name, (time.perf_counter() - start) * 1000))
        return result

    def add(self, name, ms):
        self.phases.append((name, ms))

    def header(self) -> str:
        """One entry per phase; a phase timed more than once is summed."""
        sums: dict[str, float] = {}
        for name, ms in self.phases:
            sums[name] = sums.get(name, 0.0) + ms
        return ", ".join(f"{name};dur={ms:.2f}" for name, ms in sums.items())
