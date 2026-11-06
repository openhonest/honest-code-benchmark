#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
// better-sqlite3 is installed with the apps, so resolve it from there.
const require = createRequire(join(__dirname, '..', '..', 'apps', 'package.json'));
const Database = require('better-sqlite3');
// BENCH_DATA_DIR and SQLITE_OUT_DIR let a reproduction build from and into
// scratch directories and diff the result against the checked-in files.
const DATA_DIR = process.env.BENCH_DATA_DIR || join(__dirname, '..');
const OUT_DIR = process.env.SQLITE_OUT_DIR || __dirname;
mkdirSync(OUT_DIR, { recursive: true });
const SIZES = [100, 1000, 10000, 50000, 100000];
const SCHEMA = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function assertAscii(text, label) {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      throw new Error(`Non-ASCII character at position ${i} in ${label}: code point ${text.charCodeAt(i)}`);
    }
  }
}

function toCents(n) {
  return Math.round(n * 100);
}

// The SQLite library version for each runtime that reads these files:
// better-sqlite3 for the Node arms, the stdlib sqlite3 module for arm 11.
function pythonSqliteVersion() {
  const python = join(__dirname, '..', '..', 'apps', '.venv', 'bin', 'python');
  try {
    return execFileSync(python, ['-c', 'import sqlite3; print(sqlite3.sqlite_version)'], { encoding: 'utf-8' }).trim();
  } catch {
    return null; // apps/.venv not set up yet (run `uv sync` in apps/)
  }
}

const manifest = {
  builtAt: new Date().toISOString(),
  sqliteVersion: { betterSqlite3: null, pythonSqlite3: pythonSqliteVersion() },
  databases: {},
};

for (const size of SIZES) {
  const dbPath = join(OUT_DIR, `${size}.sqlite`);
  if (existsSync(dbPath)) unlinkSync(dbPath);

  const db = new Database(dbPath);
  if (!manifest.sqliteVersion.betterSqlite3) {
    manifest.sqliteVersion.betterSqlite3 = db.prepare('SELECT sqlite_version() AS v').get().v;
  }

  db.exec(SCHEMA);

  const sources = {};

  // Table (employees)
  const tableJson = readFileSync(join(DATA_DIR, 'table', `${size}.json`), 'utf-8');
  sources.table = sha256(Buffer.from(tableJson));
  const tableData = JSON.parse(tableJson);
  const insertEmployee = db.prepare(
    'INSERT INTO employees (id, name, email, department, hireDate, salary, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertEmployees = db.transaction((rows) => {
    for (const r of rows) {
      assertAscii(r.name, `table.name id=${r.id}`);
      assertAscii(r.email, `table.email id=${r.id}`);
      assertAscii(r.department, `table.department id=${r.id}`);
      insertEmployee.run(r.id, r.name, r.email, r.department, r.hireDate, r.salary, r.active ? 1 : 0);
    }
  });
  insertEmployees(tableData);

  // Dashboard (orders)
  const dashJson = readFileSync(join(DATA_DIR, 'dashboard', `${size}.json`), 'utf-8');
  sources.dashboard = sha256(Buffer.from(dashJson));
  const dashData = JSON.parse(dashJson);
  const insertOrder = db.prepare(
    'INSERT INTO orders (id, date, customerName, category, amount, status, items) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertOrders = db.transaction((rows) => {
    for (const r of rows) {
      assertAscii(r.customerName, `dashboard.customerName id=${r.id}`);
      assertAscii(r.category, `dashboard.category id=${r.id}`);
      assertAscii(r.status, `dashboard.status id=${r.id}`);
      insertOrder.run(r.id, r.date, r.customerName, r.category, toCents(r.amount), r.status, r.items);
    }
  });
  insertOrders(dashData);

  // Browser (browser_records)
  const browserJson = readFileSync(join(DATA_DIR, 'browser', `${size}.json`), 'utf-8');
  sources.browser = sha256(Buffer.from(browserJson));
  const browserData = JSON.parse(browserJson);
  const insertBrowser = db.prepare(
    'INSERT INTO browser_records (id, name, status, createdDate, value) VALUES (?, ?, ?, ?, ?)'
  );
  const insertBrowserRecords = db.transaction((rows) => {
    for (const r of rows) {
      assertAscii(r.name, `browser.name id=${r.id}`);
      assertAscii(r.status, `browser.status id=${r.id}`);
      insertBrowser.run(r.id, r.name, r.status, r.createdDate, toCents(r.value));
    }
  });
  insertBrowserRecords(browserData);

  // Form (customers)
  const formJson = readFileSync(join(DATA_DIR, 'form', `${size}.json`), 'utf-8');
  sources.form = sha256(Buffer.from(formJson));
  const formData = JSON.parse(formJson);
  const insertCustomer = db.prepare(
    'INSERT INTO customers (id, firstName, lastName, email, phone, accountType, companyName, taxId, poNumber, street, city, state, zip, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCustomers = db.transaction((rows) => {
    for (const r of rows) {
      insertCustomer.run(r.id, r.firstName, r.lastName, r.email, r.phone, r.accountType, r.companyName, r.taxId, r.poNumber, r.street, r.city, r.state, r.zip, r.country);
    }
  });
  insertCustomers(formData);

  // Grid (budget_lines)
  const gridJson = readFileSync(join(DATA_DIR, 'grid', `${size}.json`), 'utf-8');
  sources.grid = sha256(Buffer.from(gridJson));
  const gridData = JSON.parse(gridJson);
  const insertBudget = db.prepare(
    'INSERT INTO budget_lines (id, category, description, q1, q2, q3, q4, budgetTarget) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertBudgetLines = db.transaction((rows) => {
    for (const r of rows) {
      assertAscii(r.category, `grid.category id=${r.id}`);
      assertAscii(r.description, `grid.description id=${r.id}`);
      insertBudget.run(r.id, r.category, r.description, toCents(r.q1), toCents(r.q2), toCents(r.q3), toCents(r.q4), toCents(r.budgetTarget));
    }
  });
  insertBudgetLines(gridData);

  db.exec('ANALYZE');
  db.exec('VACUUM');
  db.pragma('journal_mode = DELETE');

  // Canonical dump hash: all rows in id order, serialized as JSON
  const dumpParts = [];
  for (const row of db.prepare('SELECT * FROM employees ORDER BY id').iterate()) dumpParts.push(JSON.stringify(row));
  for (const row of db.prepare('SELECT * FROM orders ORDER BY id').iterate()) dumpParts.push(JSON.stringify(row));
  for (const row of db.prepare('SELECT * FROM browser_records ORDER BY id').iterate()) dumpParts.push(JSON.stringify(row));
  for (const row of db.prepare('SELECT * FROM customers ORDER BY id').iterate()) dumpParts.push(JSON.stringify(row));
  for (const row of db.prepare('SELECT * FROM budget_lines ORDER BY id').iterate()) dumpParts.push(JSON.stringify(row));
  const dumpHash = sha256(Buffer.from(dumpParts.join('\n')));

  db.close();

  manifest.databases[size] = {
    file: `${size}.sqlite`,
    fileSha256: sha256(readFileSync(dbPath)),
    dumpSha256: dumpHash,
    sources,
    rowCounts: {
      employees: tableData.length,
      orders: dashData.length,
      browser_records: browserData.length,
      customers: formData.length,
      budget_lines: gridData.length,
    },
  };

  console.log(`Built ${size}.sqlite (${(readFileSync(dbPath).length / 1024 / 1024).toFixed(1)} MB)`);
}

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Manifest written to manifest.json');
