import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { find_record } from '../lib.js';

const row = (id) => ({
  id, name: `Row ${id}`, status: 'active', createdDate: '2024-01-01', value: 100,
});

describe('find_record', () => {
  const rows = [row(1), row(2), row(3)];

  it('returns the record when id exists', () => {
    deepStrictEqual(find_record(rows, 2), rows[1]);
  });

  it('returns undefined when id does not exist', () => {
    strictEqual(find_record(rows, 99), undefined);
  });

  it('returns undefined when id is null', () => {
    strictEqual(find_record(rows, null), undefined);
  });
});
