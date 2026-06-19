import { useState, useRef, useEffect } from 'react';
import { useBenchmark } from '../contexts/BenchmarkContext';
import { RadarChart } from '../components/benchmark/RadarChart';
import { BenchmarkSidebar } from '../components/benchmark/BenchmarkSidebar';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { COLORES } from '../types/benchmark';
import type { Product, ScoreEntry } from '../types/benchmark';

/* ─── Step 1: Config + Products ──────────────────────────── */
function Step1({
  advanceValidateRef,
}: {
  advanceValidateRef: React.MutableRefObject<() => boolean>;
}) {
  const { state, dimensiones, setConfig, setProductos, setPaso } = useBenchmark();
  const [nombre, setNombre] = useState(state.config.nombre);
  const [analista, setAnalista] = useState(state.config.analista);
  const [productos, setLocalProductos] = useState<Product[]>(
    state.productos.length > 0 ? state.productos : []
  );
  const [newProd, setNewProd] = useState('');
  const activeDims = dimensiones.filter((d) => d.active);

  const addProducto = () => {
    const trimmed = newProd.trim();
    if (!trimmed) return;
    const next: Product = { id: Date.now(), nombre: trimmed, imagen: null };
    setLocalProductos((prev) => [...prev, next]);
    setNewProd('');
  };

  const removeProducto = (id: number) =>
    setLocalProductos((prev) => prev.filter((p) => p.id !== id));

  const validateAndSync = () => {
    if (!nombre.trim()) {
      alert('El nombre del benchmark es requerido.');
      return false;
    }
    if (productos.length < 2) {
      alert('Agrega al menos 2 productos para comparar.');
      return false;
    }
    setConfig({ nombre: nombre.trim(), analista: analista.trim() });
    setProductos(productos);
    return true;
  };

  useEffect(() => {
    advanceValidateRef.current = validateAndSync;
  });

  const handleContinuar = () => {
    if (!validateAndSync()) return;
    setPaso(2);
  };

  return (
    <div className="bm-step-wrap">
      <div className="bm-step-header">
        <div className="bm-step-number">01</div>
        <div>
          <h2 className="bm-step-title">Configuración</h2>
          <p className="bm-step-sub">Define el benchmark y agrega los productos a evaluar.</p>
        </div>
      </div>

      <div className="bm-config-grid">
        <div className="form-group">
          <label htmlFor="bm-nombre" className="form-label">Nombre del benchmark *</label>
          <input
            id="bm-nombre"
            type="text"
            className="form-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Onboarding Q2 2026"
          />
        </div>
        <div className="form-group">
          <label htmlFor="bm-analista" className="form-label">Analista</label>
          <input
            id="bm-analista"
            type="text"
            className="form-input"
            value={analista}
            onChange={(e) => setAnalista(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
      </div>

      <div className="bm-dims-preview">
        <div className="form-label">Dimensiones activas ({activeDims.length})</div>
        <div className="dim-tags">
          {activeDims.map((d) => (
            <span key={d.id} className="dim-tag">{d.label}</span>
          ))}
        </div>
        <p className="form-hint">Edita las dimensiones en el panel Admin.</p>
      </div>

      <div className="bm-products-section">
        <div className="form-label">Productos a evaluar</div>
        <div className="prod-add-row">
          <input
            type="text"
            className="form-input"
            value={newProd}
            onChange={(e) => setNewProd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProducto()}
            placeholder="Nombre del producto o sitio"
            aria-label="Nombre del producto"
          />
          <button className="btn-cyan" onClick={addProducto} type="button">
            + Agregar
          </button>
        </div>
        {productos.length > 0 && (
          <ul className="prod-list" aria-label="Productos agregados">
            {productos.map((p, idx) => (
              <li key={p.id} className="prod-item">
                <span className="prod-dot" style={{ background: COLORES[idx % COLORES.length] }} aria-hidden="true" />
                <span className="prod-name">{p.nombre}</span>
                <button
                  className="prod-remove"
                  onClick={() => removeProducto(p.id)}
                  aria-label={`Eliminar ${p.nombre}`}
                  type="button"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bm-step-actions">
        <button className="btn-cyan btn-lg" onClick={handleContinuar} type="button">
          Continuar a evaluación →
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: Evaluation ──────────────────────────────────── */
function Step2() {
  const { state, dimensiones, setPaso, setScore, setNota, guardarSesion } = useBenchmark();
  const { showToast, toasts, dismissToast } = useToast();
  const activeDims = dimensiones.filter((d) => d.active);
  const [activeDimIdx, setActiveDimIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved');
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDim = activeDims[activeDimIdx];

  const handleScore = (dimId: string, prodId: number, val: number) => {
    const existing = state.scores[dimId]?.[String(prodId)];
    const entry: ScoreEntry = { val, screenshot: existing?.screenshot ?? null };
    setScore(dimId, prodId, entry);
    setSaveStatus('unsaved');
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => setSaveStatus('saved'), 2000);
  };

  const handleNota = (dimId: string, prodId: number, nota: string) => {
    setNota(dimId, prodId, nota);
    setSaveStatus('unsaved');
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => setSaveStatus('saved'), 2000);
  };

  const handleGuardar = () => {
    const version = guardarSesion();
    showToast(`✓ Sesión guardada en el historial (v${version})`);
    setPaso(3);
  };

  const getScore = (dimId: string, prodId: number) =>
    state.scores[dimId]?.[String(prodId)]?.val ?? 0;

  const getNota = (dimId: string, prodId: number) =>
    state.notas[dimId]?.[String(prodId)] ?? '';

  if (!currentDim) return null;

  return (
    <div className="bm-step-wrap">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="bm-step-header">
        <div className="bm-step-number">02</div>
        <div>
          <h2 className="bm-step-title">Evaluación</h2>
          <p className="bm-step-sub">
            {state.config.nombre} · {activeDims.length} dimensiones · {state.productos.length} productos
          </p>
        </div>
        <span className={`nav-save-status${saveStatus === 'unsaved' ? ' unsaved' : ''}`} style={{ marginLeft: 'auto' }}>
          {saveStatus === 'saved' ? '✓ Guardado' : '● Sin guardar'}
        </span>
      </div>

      <div className="dim-tabs" role="tablist" aria-label="Dimensiones">
        {activeDims.map((dim, i) => {
          const filled = state.productos.filter(
            (p) => (state.scores[dim.id]?.[String(p.id)]?.val ?? 0) > 0
          ).length;
          return (
            <button
              key={dim.id}
              role="tab"
              aria-selected={i === activeDimIdx}
              className={`dim-tab${i === activeDimIdx ? ' active' : ''}`}
              onClick={() => setActiveDimIdx(i)}
              type="button"
            >
              {dim.label}
              {filled > 0 && (
                <span className="dim-tab-progress" aria-label={`${filled} de ${state.productos.length} evaluados`}>
                  {filled}/{state.productos.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="eval-panel" role="tabpanel" aria-label={currentDim.label}>
        <h3 className="eval-dim-title">{currentDim.label}</h3>
        <div className="eval-products">
          {state.productos.map((prod, idx) => (
            <div key={prod.id} className="eval-product-card">
              <div className="eval-product-header">
                <span
                  className="prod-dot"
                  style={{ background: COLORES[idx % COLORES.length] }}
                  aria-hidden="true"
                />
                <strong className="eval-product-name">{prod.nombre}</strong>
                <span className="eval-score-display" aria-label={`Puntuación actual: ${getScore(currentDim.id, prod.id)}`}>
                  {getScore(currentDim.id, prod.id)}/5
                </span>
              </div>
              <fieldset className="score-selector" aria-label={`Puntuación para ${prod.nombre} en ${currentDim.label}`}>
                <legend className="visually-hidden">Puntuación 1 a 5</legend>
                {[1, 2, 3, 4, 5].map((val) => {
                  const current = getScore(currentDim.id, prod.id);
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`score-btn${current === val ? ' selected' : ''}`}
                      style={current === val ? { background: COLORES[idx % COLORES.length], borderColor: COLORES[idx % COLORES.length] } : {}}
                      onClick={() => handleScore(currentDim.id, prod.id, val)}
                      aria-pressed={current === val}
                      aria-label={`Puntuación ${val}`}
                    >
                      {val}
                    </button>
                  );
                })}
              </fieldset>
              <textarea
                className="eval-nota"
                value={getNota(currentDim.id, prod.id)}
                onChange={(e) => handleNota(currentDim.id, prod.id, e.target.value)}
                placeholder="Nota observación (opcional)"
                aria-label={`Nota para ${prod.nombre}`}
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bm-step-actions">
        <button className="btn-outline" onClick={() => setPaso(1)} type="button">
          ← Volver a configuración
        </button>
        <button className="btn-cyan btn-lg" onClick={handleGuardar} type="button">
          Guardar y ver resultados →
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Results ─────────────────────────────────────── */
function Step3() {
  const { state, dimensiones, setPaso, nuevoBenchmark } = useBenchmark();
  const { showToast, toasts, dismissToast } = useToast();
  const activeDims = dimensiones.filter((d) => d.active);

  const totals = state.productos.map((prod) => ({
    prod,
    total: activeDims.reduce((acc, dim) => {
      return acc + (state.scores[dim.id]?.[String(prod.id)]?.val ?? 0);
    }, 0),
  })).sort((a, b) => b.total - a.total);

  const maxScore = activeDims.length * 5;

  const handleExport = () => {
    const rows = [
      ['Producto', ...activeDims.map((d) => d.label), 'Total', 'Max'].join(';'),
      ...state.productos.map((prod) => {
        const scores = activeDims.map((dim) => state.scores[dim.id]?.[String(prod.id)]?.val ?? 0);
        const total = scores.reduce((a, b) => a + b, 0);
        return [prod.nombre, ...scores, total, maxScore].join(';');
      }),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${state.config.nombre.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ CSV exportado');
  };

  return (
    <div className="bm-step-wrap">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="bm-step-header">
        <div className="bm-step-number">03</div>
        <div>
          <h2 className="bm-step-title">Resultados</h2>
          <p className="bm-step-sub">{state.config.nombre}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button className="btn-outline btn-sm" onClick={handleExport} type="button">
            Exportar CSV
          </button>
          <button className="btn-outline btn-sm" onClick={nuevoBenchmark} type="button">
            Nuevo benchmark
          </button>
        </div>
      </div>

      <div className="results-grid">
        <div className="results-chart-wrap">
          <RadarChart
            dimensiones={dimensiones}
            productos={state.productos}
            scores={state.scores}
            size={280}
          />
          <div className="radar-legend" aria-label="Leyenda del radar">
            {state.productos.map((prod, idx) => (
              <div key={prod.id} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ background: COLORES[idx % COLORES.length] }}
                  aria-hidden="true"
                />
                <span className="legend-label">{prod.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="results-table-wrap">
          <table className="results-table" aria-label="Ranking de productos">
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                {activeDims.map((d) => <th key={d.id}>{d.label}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.map(({ prod, total }, rank) => (
                <tr key={prod.id} className={rank === 0 ? 'results-leader' : ''}>
                  <td>
                    <span
                      className="rank-dot"
                      style={{ background: COLORES[state.productos.indexOf(prod) % COLORES.length] }}
                      aria-hidden="true"
                    />
                    {rank + 1}
                  </td>
                  <td><strong>{prod.nombre}</strong></td>
                  {activeDims.map((dim) => {
                    const val = state.scores[dim.id]?.[String(prod.id)]?.val ?? 0;
                    const cls = val >= 4 ? 'score-hi' : val >= 2.5 ? 'score-mid' : val > 0 ? 'score-lo' : '';
                    return <td key={dim.id} className={cls}>{val || '—'}</td>;
                  })}
                  <td><strong>{total}/{maxScore}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bm-step-actions">
        <button className="btn-outline" onClick={() => setPaso(2)} type="button">
          ← Volver a evaluación
        </button>
      </div>
    </div>
  );
}

/* ─── Main Benchmark page ─────────────────────────────────── */
export default function Benchmark() {
  const { state, setPaso } = useBenchmark();
  const advanceRef = useRef<() => boolean>(() => false);

  const handleAdvance = () => {
    if (state.paso === 1) {
      if (!advanceRef.current()) return false;
    }
    return true;
  };

  const stepLabel = ['Configuración', 'Evaluación', 'Resultados'][state.paso - 1];
  const today = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bm-app-shell">
      <BenchmarkSidebar onAdvance={handleAdvance} />

      <main className="bm-canvas" id="main" tabIndex={-1}>
        <div className="bm-canvas-header">
          <div className="bm-canvas-meta">
            <span className="bm-status-dot" aria-hidden="true" />
            Paso {state.paso} de 3 — {stepLabel}
          </div>
          <div className="bm-canvas-meta">{today}</div>
        </div>

        <div className="bm-progress" role="progressbar" aria-valuenow={state.paso} aria-valuemin={1} aria-valuemax={3} aria-label="Progreso del benchmark">
          {([1, 2, 3] as const).map((step) => (
            <div key={step} className={`bm-progress-step${state.paso >= step ? ' done' : ''}${state.paso === step ? ' active' : ''}`}>
              <div className="bm-progress-dot">{step}</div>
              <div className="bm-progress-label">
                {step === 1 ? 'Configuración' : step === 2 ? 'Evaluación' : 'Resultados'}
              </div>
            </div>
          ))}
          <div className="bm-progress-line" style={{ width: `${((state.paso - 1) / 2) * 100}%` }} aria-hidden="true" />
        </div>

        {state.paso === 1 && <Step1 advanceValidateRef={advanceRef} />}
        {state.paso === 2 && <Step2 />}
        {state.paso === 3 && <Step3 />}
      </main>
    </div>
  );
}