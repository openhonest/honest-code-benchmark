import React from 'react';
import { renderToString } from 'react-dom/server';
import { build_view } from './lib.js';
import App from './App.jsx';

export function render(data) {
  const mapStart = performance.now();
  const view = build_view(data);
  const mapMs = performance.now() - mapStart;

  const renderStart = performance.now();
  const html = renderToString(<App view={view} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { map: mapMs, render: renderMs } };
}
