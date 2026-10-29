import express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3999', 10);

// Generate synthetic data matching the preregistration's employee schema
function generateRows(count) {
  const depts = ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance', 'HR', 'Legal', 'Operations'];
  const firstNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Iris', 'Jack'];
  const lastNames = ['Smith', 'Jones', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'White'];

  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: i + 1,
      name: firstNames[i % firstNames.length] + ' ' + lastNames[Math.floor(i / firstNames.length) % lastNames.length],
      department: depts[i % depts.length],
      salary: 40000 + Math.floor(Math.random() * 80000),
      active: Math.random() > 0.2,
    });
  }
  return rows;
}

const app = express();

// Cross-origin isolation for performance.measureUserAgentSpecificMemory()
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve the built client bundle
app.use('/dist', express.static(join(__dirname, 'dist')));

app.get('/', (req, res) => {
  const rowCount = parseInt(req.query.rows || '1000', 10);
  const rows = generateRows(rowCount);

  const serverStart = performance.now();

  // Dynamic import of App won't work with JSX; use a simple inline component
  // for the stub. The real experiment uses built components.
  const tableRows = rows.map(row =>
    React.createElement('tr', { key: row.id },
      React.createElement('td', null, row.id),
      React.createElement('td', null, row.name),
      React.createElement('td', null, row.department),
      React.createElement('td', null, row.salary.toLocaleString()),
      React.createElement('td', null, row.active ? 'Yes' : 'No'),
    )
  );

  const appElement = React.createElement('div', null,
    React.createElement('h1', null, 'Stub Application'),
    React.createElement('p', null, `Rows: ${rows.length} | Clicks: 0 | Sum placeholder`),
    React.createElement('div', null,
      React.createElement('button', { id: 'interact-btn' }, 'Click me'),
      React.createElement('input', { id: 'interact-input', placeholder: 'Type here', defaultValue: '' }),
    ),
    React.createElement('table', null,
      React.createElement('thead', null,
        React.createElement('tr', null,
          React.createElement('th', null, 'ID'),
          React.createElement('th', null, 'Name'),
          React.createElement('th', null, 'Dept'),
          React.createElement('th', null, 'Salary'),
          React.createElement('th', null, 'Active'),
        ),
      ),
      React.createElement('tbody', null, ...tableRows),
    ),
  );

  const html = renderToString(appElement);
  const serverTime = performance.now() - serverStart;

  const dataJson = JSON.stringify({ rows });

  res.setHeader('Server-Timing', `render;dur=${serverTime.toFixed(2)}`);
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stub App</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
    th { background: #f5f5f5; }
    button { padding: 8px 16px; margin-right: 8px; }
    input { padding: 8px; }
  </style>
</head>
<body>
  <div id="root">${html}</div>
  <script id="__DATA__" type="application/json">${dataJson}</script>
  <script src="/dist/client.js"></script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Stub server running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/?rows=100`);
});
