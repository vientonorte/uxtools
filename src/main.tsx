import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './styles/nav.css';
import './styles/dashboard.css';
import './styles/benchmark.css';
import './styles/uxflow.css';
import './styles/admin.css';
import './styles/brief.css';
import './styles/medicinal.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró #root en el DOM');

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
