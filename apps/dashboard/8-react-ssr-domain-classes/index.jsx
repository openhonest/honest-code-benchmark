import { hydrateRoot } from 'react-dom/client';
import App from '../shared-client/App.jsx';

hydrateRoot(document.getElementById('root'), <App initialData={window.__SSR_DATA__} initialUpdatedAt={window.__BENCHMARK_CONFIG__.loadedAt} />);

