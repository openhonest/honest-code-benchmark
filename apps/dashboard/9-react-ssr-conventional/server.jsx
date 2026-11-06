import React from 'react';
import { renderToString } from 'react-dom/server';
import { OrderBook } from './models.js';
import App from './App.jsx';

export function render(data, { loadedAt = '' } = {}) {
  const mapStart = performance.now();
  const book = OrderBook.fromRows(data);
  const mapMs = performance.now() - mapStart;

  const renderStart = performance.now();
  const html = renderToString(<App book={book} loadedAt={loadedAt} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { map: mapMs, render: renderMs } };
}
