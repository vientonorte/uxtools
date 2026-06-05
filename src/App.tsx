import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { BenchmarkProvider } from './contexts/BenchmarkContext';
import Dashboard from './pages/Dashboard';
import Benchmark from './pages/Benchmark';
import UxFlow from './pages/UxFlow';
import Admin from './pages/Admin';
import Brief from './pages/Brief';

export default function App() {
  return (
    <BenchmarkProvider>
      <a href="#main" className="vn-skip-link">
        Saltar al contenido principal
      </a>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/benchmark" element={<Benchmark />} />
        <Route path="/uxflow" element={<UxFlow />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/brief" element={<Brief />} />
      </Routes>
      <Footer />
    </BenchmarkProvider>
  );
}
