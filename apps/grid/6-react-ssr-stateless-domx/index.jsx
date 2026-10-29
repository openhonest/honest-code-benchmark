import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App.jsx';

const data = window.__SSR_DATA__;
hydrateRoot(document.getElementById('root'), <App initialData={data} />);
