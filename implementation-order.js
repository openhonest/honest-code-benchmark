#!/usr/bin/env node

// Generate the randomized implementation order for all five archetypes.
// Uses the registered seed so the order is reproducible.
// Output: implementation-order.json

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = '6a1624e0-f793-442a-9f45-a3b80ba2419e';

function seedFromString(str) {
  const hash = createHash('sha256').update(str).digest();
  return [
    hash.readUInt32LE(0),
    hash.readUInt32LE(4),
    hash.readUInt32LE(8),
    hash.readUInt32LE(12),
  ];
}

function xoshiro128ss(state) {
  return function next() {
    const result = Math.imul(rotl(Math.imul(state[1], 5), 7), 9) >>> 0;
    const t = (state[1] << 9) >>> 0;
    state[2] = (state[2] ^ state[0]) >>> 0;
    state[3] = (state[3] ^ state[1]) >>> 0;
    state[1] = (state[1] ^ state[2]) >>> 0;
    state[0] = (state[0] ^ state[3]) >>> 0;
    state[2] = (state[2] ^ t) >>> 0;
    state[3] = rotl(state[3], 11) >>> 0;
    return result / 0x100000000;
  };
}

function rotl(x, k) {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ARMS = [
  '1-useState',
  '2-redux',
  '3-zustand',
  '4-signals',
  '5-stateless-domx',
  '6-react-ssr-stateless-domx',
  '7-react-ssr-honest',
  '8-react-ssr-domain-classes',
  '9-react-ssr-conventional',
  '10-htmx-ejs',
  '11-fastapi-honest-htmx',
];

const ARCHETYPES = ['form', 'table', 'dashboard', 'browser', 'grid'];

const order = {};

for (const archetype of ARCHETYPES) {
  const rng = xoshiro128ss(seedFromString(`${SEED}:order:${archetype}`));
  order[archetype] = shuffle(rng, ARMS);
}

const path = join(__dirname, 'implementation-order.json');
writeFileSync(path, JSON.stringify(order, null, 2) + '\n');

console.log('Implementation order:');
for (const [archetype, arms] of Object.entries(order)) {
  console.log(`\n  ${archetype}:`);
  arms.forEach((arm, i) => console.log(`    ${i + 1}. ${arm}`));
}
console.log(`\nWritten to ${path}`);
