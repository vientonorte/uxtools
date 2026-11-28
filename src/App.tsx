import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { RoutePrivacy } from './components/RoutePrivacy';
import { BenchmarkProvider } from './contexts/BenchmarkContext';
import Dashboard from './pages/Dashboard';
import Benchmark from './pages/Benchmark';
import UxFlow from './pages/UxFlow';
import Admin from './pages/Admin';
import Brief from './pages/Brief';
import Selfradar from './pages/Selfradar';
import KitTlp from './pages/KitTlp';
import Onboarding from './pages/Onboarding';
import Polijuego from './pages/Polijuego';
import { ToolGate } from './components/ToolGate';

const Medicinal = lazy(() => import('./pages/Medicinal'));
const Instafotos = lazy(() => import('./pages/Instafotos'));

function PageFallback() {
  return (
    <main id="main" tabIndex={-1}>
      <p role="status">Cargando…</p>
    </main>
  );
}

class MedicinalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main id="main" tabIndex={-1}>
          <p role="alert">No se pudo abrir esta herramienta.</p>
          <button type="button" className="route-fallback__reload" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BenchmarkProvider>
      <a href="#main" className="vn-skip-link">
        Saltar al contenido principal
      </a>
      <Nav />
      <RoutePrivacy />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/benchmark"
          element={
            <ToolGate id="benchmark">
              <Benchmark />
            </ToolGate>
          }
        />
        <Route
          path="/uxflow"
          element={
            <ToolGate id="uxflow">
              <UxFlow />
            </ToolGate>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/brief"
          element={
            <ToolGate id="brief">
              <Brief />
            </ToolGate>
          }
        />
        <Route
          path="/medicinal"
          element={
            <MedicinalBoundary>
              <Suspense fallback={<PageFallback />}>
                <Medicinal />
              </Suspense>
            </MedicinalBoundary>
          }
        />
        <Route
          path="/selfradar"
          element={
            <ToolGate id="selfradar">
              <Selfradar />
            </ToolGate>
          }
        />
        <Route
          path="/kit-tlp"
          element={
            <ToolGate id="tlp">
              <KitTlp />
            </ToolGate>
          }
        />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/polijuego"
          element={
            <ToolGate id="poliradar">
              <Polijuego />
            </ToolGate>
          }
        />
        <Route
          path="/poliradar"
          element={
            <ToolGate id="poliradar">
              <Polijuego />
            </ToolGate>
          }
        />
        <Route
          path="/instafotos-app"
          element={
            <Suspense fallback={<PageFallback />}>
              <Instafotos />
            </Suspense>
          }
        />
        <Route
          path="/instafotos-app/*"
          element={
            <Suspense fallback={<PageFallback />}>
              <Instafotos />
            </Suspense>
          }
        />
      </Routes>
      <Footer />
    </BenchmarkProvider>
  );
}
