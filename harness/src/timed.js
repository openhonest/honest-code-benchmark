// Instrumentation wrapper for timing levels.
//
// Level 0: identity (no overhead). Used for end-to-end measurement.
// Level 1: records performance.mark/measure per call. Used for pipeline timing.
// Level 2: records marks and logs arguments. Used for atomic timing.
//
// Usage in application code:
//   import { timed } from './timed.js';
//   const filterRows = timed(rawFilterRows, 'filter');
//
// The timing level is set once at startup. Changing it requires a new process.

let currentLevel = 0;

export function setTimingLevel(level) {
  currentLevel = level;
}

export function getTimingLevel() {
  return currentLevel;
}

export function timed(fn, label) {
  if (currentLevel < 1) return fn;
  return function (...args) {
    const startMark = `${label}:start`;
    const endMark = `${label}:end`;
    performance.mark(startMark);
    const result = fn.apply(this, args);
    performance.mark(endMark);
    performance.measure(label, startMark, endMark);
    return result;
  };
}

export function timedAsync(fn, label) {
  if (currentLevel < 1) return fn;
  return async function (...args) {
    const startMark = `${label}:start`;
    const endMark = `${label}:end`;
    performance.mark(startMark);
    const result = await fn.apply(this, args);
    performance.mark(endMark);
    performance.measure(label, startMark, endMark);
    return result;
  };
}
