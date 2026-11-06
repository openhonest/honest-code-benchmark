import React from 'react';
import { renderToString } from 'react-dom/server';
import { EmployeeDirectory } from './models.js';
import App from './App.jsx';

export function render(data) {
  const mapStart = performance.now();
  const directory = EmployeeDirectory.fromRows(data);
  const mapMs = performance.now() - mapStart;

  const renderStart = performance.now();
  const html = renderToString(<App directory={directory} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { map: mapMs, render: renderMs } };
}
