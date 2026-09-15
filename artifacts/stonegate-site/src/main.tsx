import { createRoot } from 'react-dom/client';

import App from './App';
import { initializeAnalytics } from './lib/analytics';

import './index.css';

initializeAnalytics();

createRoot(document.getElementById('root')!).render(<App />);
