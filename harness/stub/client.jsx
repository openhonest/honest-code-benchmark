import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App.jsx';

const data = JSON.parse(document.getElementById('__DATA__').textContent);
hydrateRoot(document.getElementById('root'), <App rows={data.rows} />);
