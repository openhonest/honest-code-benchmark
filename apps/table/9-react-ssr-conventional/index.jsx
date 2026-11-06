import { hydrateRoot } from 'react-dom/client';
import App from '../shared-client/App.jsx';

hydrateRoot(document.getElementById('root'), <App initialData={window.__SSR_DATA__} />);

