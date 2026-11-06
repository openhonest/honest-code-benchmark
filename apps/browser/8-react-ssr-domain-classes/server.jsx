import React from 'react';
import { renderToString } from 'react-dom/server';
import { toRecords } from './domain.js';
import ServerApp from './ServerApp.jsx';

export function render(data) {
  const mapStart = performance.now();
  const records = toRecords(data);
  const mapMs = performance.now() - mapStart;

  const renderStart = performance.now();
  const html = renderToString(<ServerApp records={records} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { map: mapMs, render: renderMs } };
}
