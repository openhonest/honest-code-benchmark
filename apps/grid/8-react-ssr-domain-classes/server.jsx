import React from 'react';
import { renderToString } from 'react-dom/server';
import { toLines } from './domain.js';
import ServerApp from './ServerApp.jsx';

export function render(data) {
  const mapStart = performance.now();
  const lines = toLines(data);
  const mapMs = performance.now() - mapStart;

  const renderStart = performance.now();
  const html = renderToString(<ServerApp lines={lines} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { map: mapMs, render: renderMs } };
}
