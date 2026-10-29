import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';

export function render(data) {
  return renderToString(<App initialData={data} />);
}
