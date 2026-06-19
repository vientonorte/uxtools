import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import {
  BENCHMARK_STORAGE_KEY,
  DIMENSIONES_STORAGE_KEY,
  DIMENSIONES_DEFAULT,
} from '../types/benchmark';
import type { BenchmarkState, Dimension, BenchmarkSession } from '../types/benchmark';
import { loadUxflowSessions, persistUxflowSessions } from '../lib/uxflow-storage';
import { UXFLOW_TEMPLATES_KEY } from '../types/uxflow';
import type { UxflowSession, UxflowTemplate } from '../types/uxflow';

const MIN_DIMENSIONS = 2;

type AdminTab = 'dimensiones' | 'templates' | 'bm-sessions' | 'ux-history';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dimensiones');
  const { showToast, toasts, dismissToast } = useToast();

  const [bmState, setBmState] = useLocalStorage<BenchmarkState>(BENCHMARK_STORAGE_KEY, {
    paso: 1, config: { nombre: '', analista: '' }, productos: [], scores: {}, notas: {}, historial: [],
  });
  const [dimensiones, setDimensiones] = useLocalStorage<Dimension[]>(
    DIMENSIONES_STORAGE_KEY, DIMENSIONES_DEFAULT
  );
  const [uxSessions, setUxSessions] = useState<UxflowSession[]>(() => loadUxflowSessions());
  const updateUxSessions = (next: UxflowSession[] | ((prev: UxflowSession[]) => UxflowSession[])) => {
    setUxSessions((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      persistUxflowSessions(resolved);
      return resolved;
    });
  };
  const [templates, setTemplates] = useLocalStorage<UxflowTemplate[]>(UXFLOW_TEMPLATES_KEY, []);

  /* ── Dimensiones ──────────────────────────────────────────── */
  const [newDimLabel, setNewDimLabel] = useState('');

  const toggleDim = (id: string) => {
    const active = dimensiones.filter((d) => d.active);
    const target = dimensiones.find((d) => d.id === id);
    if (target?.active && active.length <= MIN_DIMENSIONS) {
      showToast(`Mínimo ${MIN_DIMENSIONS} dimensiones activas.`); return;
    }
    setDimensiones((prev) => prev.map((d) => d.id === id ? { ...d, active: !d.active } : d));
  };

  const eliminarDim = (id: string) => {
    const active = dimensiones.filter((d) => d.active);
    if (active.length <= MIN_DIMENSIONS) {
      showToast('No se puede eliminar: mínimo de dimensiones activas.'); return;
    }
    setDimensiones((prev) => prev.filter((d) => d.id !== id));
  };

  const agregarDimension = () => {
    const label = newDimLabel.trim();
    if (!label) return;
    const id = `d${Date.now()}`;
    setDimensiones((prev) => [...prev, { id, label, active: true }]);
    setNewDimLabel('');
    showToast(`✓ Dimensión "${label}" agregada`);
  };

  const resetearDimensiones = () => {
    if (!confirm('¿Resetear dimensiones a los valores por defecto?')) return;
    setDimensiones(DIMENSIONES_DEFAULT);
    showToast('✓ Dimensiones reseteadas');
  };

  /* ── Templates ───────────────────────────────────────────── */
  const eliminarTemplate = (id: number) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast('Template eliminado');
  };

  /* ── BM Sessions ─────────────────────────────────────────── */
  const eliminarSesionBm = (id: number) => {
    setBmState((s) => ({ ...s, historial: s.historial.filter((h) => h.id !== id) }));
    showToast('Sesión eliminada');
  };

  /* ── UX History ──────────────────────────────────────────── */
  const eliminarUxDoc = (id: number) => {
    updateUxSessions((prev) => prev.filter((s) => s.id !== id));
    showToast('Documento eliminado');
  };

  /* ── Export ──────────────────────────────────────────────── */
  const exportarJSON = () => {
    const data = {
      'uxbenchmark-state': bmState,
      'uxflow-historial': uxSessions,
      'uxbenchmark-dimensiones': dimensiones,
      'uxflow-templates': templates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uxtools-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ JSON exportado');
  };

  const exportarBmCSV = () => {
    const sessions: BenchmarkSession[] = bmState.historial;
    if (!sessions.length) { showToast('Sin sesiones para exportar.'); return; }
    const rows: string[] = [
      ['ID', 'Nombre', 'Analista', 'Fecha', 'Productos', 'Dimensiones'].join(';'),
    ];
    sessions.forEach((s) => {
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      rows.push([
        s.id,
        esc(s.nombre || ''),
        esc(s.analista || ''),
        esc(s.fecha || ''),
        s.productos.length,
        s.dimensiones?.length ?? 0,
      ].join(';'));
    });
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ CSV exportado');
  };

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'dimensiones', label: `Dimensiones (${dimensiones.length})` },
    { id: 'templates', label: `Templates UXFlow (${templates.length})` },
    { id: 'bm-sessions', label: `Sesiones BM (${bmState.historial.length})` },
    { id: 'ux-history', label: `Historial UX (${uxSessions.length})` },
  ];

  return (
    <main className="admin-main" id="main" tabIndex={-1}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="admin-header">
        <div>
          <h1 className="admin-title">Content Manager</h1>
          <p className="admin-sub">Gestiona dimensiones, templates, sesiones y exporta datos.</p>
        </div>
        <div className="admin-export-actions">
          <button className="btn-outline btn-sm" onClick={exportarBmCSV} type="button">Exportar BM CSV</button>
          <button className="btn-cyan btn-sm" onClick={exportarJSON} type="button">Exportar JSON completo</button>
        </div>
      </div>

      <div className="admin-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`admin-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-panel" role="tabpanel">
        {/* Dimensiones */}
        {activeTab === 'dimensiones' && (
          <div className="admin-section">
            <div className="admin-section-actions">
              <button className="btn-outline btn-sm" onClick={resetearDimensiones} type="button">
                Resetear a valores por defecto
              </button>
            </div>
            <ul className="dim-manager-list" aria-label="Lista de dimensiones">
              {dimensiones.map((dim) => (
                <li key={dim.id} className={`dim-manager-item${dim.active ? '' : ' inactive'}`}>
                  <label className="dim-manager-toggle" aria-label={`${dim.active ? 'Desactivar' : 'Activar'} ${dim.label}`}>
                    <input
                      type="checkbox"
                      checked={dim.active}
                      onChange={() => toggleDim(dim.id)}
                    />
                    <span className="dim-manager-label">{dim.label}</span>
                  </label>
                  <span className={`dim-manager-badge${dim.active ? ' active' : ''}`}>
                    {dim.active ? 'ACTIVA' : 'OFF'}
                  </span>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => eliminarDim(dim.id)}
                    aria-label={`Eliminar dimensión ${dim.label}`}
                    type="button"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="dim-add-row">
              <input
                type="text"
                className="form-input"
                value={newDimLabel}
                onChange={(e) => setNewDimLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarDimension()}
                placeholder="Nueva dimensión…"
                aria-label="Nombre de la nueva dimensión"
              />
              <button className="btn-cyan" onClick={agregarDimension} type="button">
                + Agregar
              </button>
            </div>
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="admin-section">
            {templates.length === 0 ? (
              <p className="admin-empty">Sin templates guardados. Crea uno desde el módulo UXFlow.</p>
            ) : (
              <ul className="admin-list" aria-label="Templates UXFlow">
                {templates.map((t) => (
                  <li key={t.id} className="admin-list-item">
                    <div className="admin-list-body">
                      <strong>{t.nombre}</strong>
                      <span className="historial-meta">{t.fecha}</span>
                      <p className="admin-list-prompt">{t.prompt.slice(0, 100)}…</p>
                    </div>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => eliminarTemplate(t.id)}
                      aria-label={`Eliminar template ${t.nombre}`}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* BM Sessions */}
        {activeTab === 'bm-sessions' && (
          <div className="admin-section">
            {bmState.historial.length === 0 ? (
              <p className="admin-empty">Sin sesiones de benchmark guardadas.</p>
            ) : (
              <ul className="admin-list" aria-label="Sesiones de benchmark">
                {bmState.historial.map((s) => (
                  <li key={s.id} className="admin-list-item">
                    <div className="admin-list-body">
                      <strong>{s.nombre || 'Sin título'}</strong>
                      <span className="historial-meta">
                        {s.analista && `${s.analista} · `}{s.fecha} · {s.productos.length} productos
                      </span>
                    </div>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => eliminarSesionBm(s.id)}
                      aria-label={`Eliminar sesión ${s.nombre}`}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* UX History */}
        {activeTab === 'ux-history' && (
          <div className="admin-section">
            {uxSessions.length === 0 ? (
              <p className="admin-empty">Sin documentos UXFlow guardados.</p>
            ) : (
              <ul className="admin-list" aria-label="Historial UXFlow">
                {uxSessions.map((s) => (
                  <li key={s.id} className="admin-list-item">
                    <div className="admin-list-body">
                      <strong>{s.titulo || 'Sin título'}</strong>
                      <span className="historial-meta">{s.linea} · {s.fecha}</span>
                    </div>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => eliminarUxDoc(s.id)}
                      aria-label={`Eliminar documento ${s.titulo}`}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
