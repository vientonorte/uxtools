import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { injectCSPMeta, vientonorteCSP } from '@vientonorte/security';
import '@vientonorte/tokens/css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/nav.css';
import './styles/dashboard.css';
import './styles/benchmark.css';
import './styles/uxflow.css';
import './styles/admin.css';
import './styles/brief.css';
import App from './App';

// CSP — uxtools sólo usa localStorage, sin APIs externas
injectCSPMeta({
  ...vientonorteCSP,
  // Permite fonts.googleapis.com y fonts.gstatic.com
  styleSrc: [...(vientonorteCSP.styleSrc ?? []), 'https://fonts.googleapis.com'],
  fontSrc: [...(vientonorteCSP.fontSrc ?? []), 'https://fonts.gstatic.com'],
  // Permite blob: para exportaciones CSV/JSON
  connectSrc: [...(vientonorteCSP.connectSrc ?? []), 'blob:'],
});

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró #root en el DOM');

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
