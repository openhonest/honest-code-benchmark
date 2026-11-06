import React from 'react';
import { renderToString } from 'react-dom/server';
import { toOrders } from './domain.js';
import ServerApp from './ServerApp.jsx';

export function render(data, { loadedAt = '' } = {}) {
  const mapStart = performance.now();
  const orders = toOrders(data);
  const mapMs = performance.now() - mapStart;

  const renderStart = performance.now();
  const html = renderToString(<ServerApp orders={orders} loadedAt={loadedAt} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { map: mapMs, render: renderMs } };
}
