import React from 'react';
import { renderToString } from 'react-dom/server';
import ServerApp from './ServerApp.jsx';

export function render(data) {
  const renderStart = performance.now();
  const html = renderToString(<ServerApp data={data} />);
  const renderMs = performance.now() - renderStart;

  return { html, timing: { render: renderMs } };
}
