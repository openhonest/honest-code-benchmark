// node --test tests/
import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parseSalary, parseMoneyCents, parsePositiveInt } from '../lib/value-rules.js';

const cases = JSON.parse(readFileSync(new URL('./value-rules-cases.json', import.meta.url), 'utf-8'));
const FNS = { salary: parseSalary, money: parseMoneyCents, positiveInt: parsePositiveInt };

for (const [kind, list] of Object.entries(cases)) {
  describe(`value rule: ${kind}`, () => {
    for (const [input, expected] of list) {
      it(JSON.stringify(input), () => strictEqual(FNS[kind](input), expected));
    }
  });
}
