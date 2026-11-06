import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';

// Arm 6 renders the first page that the server read from SQLite. There is
// no map phase: the rows go to the tree as SQLite returned them.
export function render(initialPage) {
  return renderToString(<App initialPage={initialPage} />);
}
