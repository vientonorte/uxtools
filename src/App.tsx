import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { BenchmarkProvider } from './contexts/BenchmarkContext';
import Dashboard from './pages/Dashboard';
import Benchmark from './pages/Benchmark';
import UxFlow from './pages/UxFlow';
import Admin from './pages/Admin';
import Brief from './pages/Brief';
import Medicinal from './pages/Medicinal';
import Selfradar from './pages/Selfradar';
import KitTlp from './pages/KitTlp';
import Onboarding from './pages/Onboarding';
import Polijuego from './pages/Polijuego';
import Camila from './pages/Camila';
import { ToolGate } from './components/ToolGate';

export default function App() {
  return (
    <BenchmarkProvider>
      <a href="#main" className="vn-skip-link">
        Saltar al contenido principal
      </a>
      <Nav />
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
        <Route path="/medicinal" element={<Medicinal />} />
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
        <Route path="/camila" element={<Camila />} />
        <Route path="/camila/*" element={<Camila />} />
        <Route path="/instafotos-app" element={<Camila />} />
        <Route path="/instafotos-app/*" element={<Camila />} />
      </Routes>
      <Footer />
    </BenchmarkProvider>
  );
}
