import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { format_updated } from '../lib.js';

describe('format_updated', () => {
  it('formats a UTC timestamp', () => {
    strictEqual(format_updated('2026-10-30T19:03:12.345Z'), '19:03:12 UTC');
  });

  it('an absent timestamp gives an empty string', () => {
    strictEqual(format_updated(''), '');
  });
});
