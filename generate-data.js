#!/usr/bin/env node

// Seeded data generation for all five archetypes at all five payload sizes.
// Seed: 6a1624e0-f793-442a-9f45-a3b80ba2419e (registered in preregistration.md)
//
// Output: data/<archetype>/<size>.json
//   e.g., data/table/1000.json, data/form/100.json
//
// Run: node generate-data.js

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

const SEED = '6a1624e0-f793-442a-9f45-a3b80ba2419e';
const SIZES = [100, 1000, 10000, 50000, 100000];

// --- Seeded PRNG (xoshiro128** from the seed UUID) ---

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

// Create a new PRNG for each archetype+size to keep them independent
function prngFor(archetype, size) {
  const state = seedFromString(`${SEED}:${archetype}:${size}`);
  return xoshiro128ss(state);
}

// --- Name lists ---

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna',
  'Kenneth', 'Michelle', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
];

const DEPARTMENTS = [
  'Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations', 'Legal', 'Support',
];

const STATUSES = ['active', 'inactive', 'pending', 'archived', 'flagged'];

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Sports'];

const BUDGET_CATEGORIES = [
  'Personnel', 'Equipment', 'Software', 'Travel', 'Training',
  'Marketing', 'Facilities', 'Consulting', 'Insurance', 'Utilities',
  'R&D', 'Contingency',
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const COUNTRIES = [
  'US', 'CA', 'MX', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN',
];

// --- Generators ---

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(rng, min, max, decimals = 2) {
  return parseFloat((rng() * (max - min) + min).toFixed(decimals));
}

function randDate(rng, startYear, endYear) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const d = new Date(start + rng() * (end - start));
  return d.toISOString().split('T')[0];
}

function generateName(rng) {
  return { first: pick(rng, FIRST_NAMES), last: pick(rng, LAST_NAMES) };
}

// --- Archetype generators ---

function generateTableData(rng, count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const name = generateName(rng);
    rows.push({
      id: i + 1,
      name: `${name.first} ${name.last}`,
      email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}${i}@example.com`,
      department: pick(rng, DEPARTMENTS),
      hireDate: randDate(rng, 2015, 2026),
      salary: randInt(rng, 35000, 200000),
      active: rng() > 0.15,
    });
  }
  return rows;
}

function generateFormData(rng, count) {
  // Form archetype uses the same employee-like data for pre-fill scenarios,
  // but the main state is the form itself. We generate a list of "orders"
  // that the form would create, used for testing validation and review.
  const records = [];
  for (let i = 0; i < count; i++) {
    const name = generateName(rng);
    const isBusiness = rng() > 0.7;
    records.push({
      id: i + 1,
      firstName: name.first,
      lastName: name.last,
      email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}${i}@example.com`,
      phone: `${randInt(rng, 200, 999)}${randInt(rng, 200, 999)}${randInt(rng, 1000, 9999)}`,
      accountType: isBusiness ? 'business' : 'individual',
      companyName: isBusiness ? `${name.last} ${pick(rng, ['Inc', 'LLC', 'Corp', 'Ltd'])}` : null,
      taxId: isBusiness ? `${randInt(rng, 10, 99)}-${randInt(rng, 1000000, 9999999)}` : null,
      poNumber: isBusiness && rng() > 0.5 ? `PO-${randInt(rng, 10000, 99999)}` : null,
      street: `${randInt(rng, 100, 9999)} ${pick(rng, ['Main', 'Oak', 'Elm', 'Pine', 'Cedar', 'Maple'])} ${pick(rng, ['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}`,
      city: pick(rng, ['Springfield', 'Portland', 'Franklin', 'Clinton', 'Madison', 'Georgetown', 'Arlington', 'Salem']),
      state: pick(rng, US_STATES),
      zip: String(randInt(rng, 10000, 99999)),
      country: pick(rng, COUNTRIES),
    });
  }
  return records;
}

function generateDashboardData(rng, count) {
  const orders = [];
  for (let i = 0; i < count; i++) {
    const name = generateName(rng);
    orders.push({
      id: `ORD-${String(i + 1).padStart(6, '0')}`,
      date: randDate(rng, 2024, 2026),
      customerName: `${name.first} ${name.last}`,
      category: pick(rng, CATEGORIES),
      amount: randFloat(rng, 5.0, 2000.0),
      status: pick(rng, ['completed', 'pending', 'shipped', 'returned', 'cancelled']),
      items: randInt(rng, 1, 12),
    });
  }
  return orders;
}

function generateBrowserData(rng, count) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const name = generateName(rng);
    records.push({
      id: i + 1,
      name: `${name.first} ${name.last}`,
      status: pick(rng, STATUSES),
      createdDate: randDate(rng, 2020, 2026),
      value: randFloat(rng, 0.01, 99999.99),
    });
  }
  return records;
}

function generateGridData(rng, count) {
  const rows = [];
  // Distribute rows evenly across the 12 budget categories
  for (let i = 0; i < count; i++) {
    const category = BUDGET_CATEGORIES[i % BUDGET_CATEGORIES.length];
    const budgetTarget = randFloat(rng, 10000, 500000);
    const q1 = randFloat(rng, 1000, 150000);
    const q2 = randFloat(rng, 1000, 150000);
    const q3 = randFloat(rng, 1000, 150000);
    const q4 = randFloat(rng, 1000, 150000);
    rows.push({
      id: i + 1,
      category,
      description: `${category} line item ${Math.floor(i / BUDGET_CATEGORIES.length) + 1}`,
      q1,
      q2,
      q3,
      q4,
      budgetTarget,
    });
  }
  return rows;
}

// --- Main ---

const ARCHETYPES = {
  form: generateFormData,
  table: generateTableData,
  dashboard: generateDashboardData,
  browser: generateBrowserData,
  grid: generateGridData,
};

console.log(`Seed: ${SEED}`);
console.log(`Sizes: ${SIZES.join(', ')}`);
console.log('');

let totalFiles = 0;

for (const [archetype, generator] of Object.entries(ARCHETYPES)) {
  for (const size of SIZES) {
    const dir = join(DATA_DIR, archetype);
    mkdirSync(dir, { recursive: true });

    const rng = prngFor(archetype, size);
    const data = generator(rng, size);

    const path = join(dir, `${size}.json`);
    writeFileSync(path, JSON.stringify(data));

    const sizeMB = (Buffer.byteLength(JSON.stringify(data)) / 1024 / 1024).toFixed(2);
    console.log(`  ${archetype}/${size}.json: ${data.length} rows, ${sizeMB} MB`);
    totalFiles++;
  }
}

console.log(`\n${totalFiles} files generated in ${DATA_DIR}`);
