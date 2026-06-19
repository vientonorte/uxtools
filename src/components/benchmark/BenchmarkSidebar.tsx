import { useMemo } from 'react';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../Toast';
import { countUniqueBenchmarkNames, summarizeSession } from '../../lib/benchmark-utils';
import type { BenchmarkSession } from '../../types/benchmark';

const STEP_LABELS = ['Configuración', 'Evaluación', 'Resultados'] as const;

type BenchmarkSidebarProps = {
  onAdvance?: () => boolean;
};

function SavedSessionItem({
  session,
  onLoad,
}: {
  session: BenchmarkSession;
  onLoad: (session: BenchmarkSession) => void;
}) {
  const summary = summarizeSession(session);
  const versionTag =
    session.version != null ? (
      <span className="bm-saved-item-version">v{session.version}</span>
    ) : null;

  return (
    <button
      type="button"
      className="bm-saved-item"
      onClick={() => onLoad(session)}
      title={`Cargar sesión: ${session.nombre}`}
    >
      <div className="bm-saved-item-top">
        <div className="bm-saved-item-name">
          {session.nombre}
          {versionTag}
        </div>
        <div className="bm-saved-item-score">
          {summary.leaderTotal}/{summary.maxScore}
        </div>
      </div>
      <div className="bm-saved-item-date">
        {session.fecha}
        {session.analista ? ` · ${session.analista}` : ''}
      </div>
      <div className="bm-saved-item-meta">
        <span className="bm-saved-item-chip">
          {summary.productos} {summary.productos === 1 ? 'producto' : 'productos'}
        </span>
        <span className="bm-saved-item-chip">{summary.dimensiones} dim.</span>
        <span className="bm-saved-item-chip">Líder: {summary.leaderName}</span>
      </div>
    </button>
  );
}

export function BenchmarkSidebar({ onAdvance }: BenchmarkSidebarProps) {
  const { state, setPaso, guardarSesion, cargarSesion, nuevoBenchmark } = useBenchmark();
  const { showToast, toasts, dismissToast } = useToast();

  const historyStats = useMemo(() => {
    if (!state.historial.length) return null;

    type BestEntry = { session: BenchmarkSession; summary: ReturnType<typeof summarizeSession> };
    let best: BestEntry | null = null;

    for (const session of state.historial) {
      const summary = summarizeSession(session);
      if (!best || summary.leaderTotal > best.summary.leaderTotal) {
        best = { session, summary };
      }
    }

    const latest = state.historial[0];
    if (!latest) return null;

    return {
      total: state.historial.length,
      uniqueNames: countUniqueBenchmarkNames(state.historial),
      best,
      latest,
    };
  }, [state.historial]);

  const handleSave = () => {
    const version = guardarSesion();
    showToast(`💾 Sesión guardada: ${state.config.nombre || 'Benchmark'} v${version}`);
  };

  const handleLoad = (session: BenchmarkSession) => {
    cargarSesion(session);
    showToast(`📂 Sesión cargada: ${session.nombre}`);
  };

  const handleNext = () => {
    if (onAdvance && !onAdvance()) return;
    if (state.paso < 3) setPaso((state.paso + 1) as 1 | 2 | 3);
  };

  return (
    <aside className="bm-panel" aria-label="Flujo de trabajo y sesiones guardadas">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="bm-panel-label">Flujo de trabajo</div>

      <div className="bm-step-list">
        {([1, 2, 3] as const).map((step, index) => (
          <div key={step}>
            {index > 0 && <div className="bm-step-connector" aria-hidden="true" />}
            <button
              type="button"
              className={`bm-step-item${state.paso === step ? ' active' : ''}${state.paso > step ? ' done' : ''}`}
              onClick={() => setPaso(step)}
              aria-label={`Ir al paso ${step}: ${STEP_LABELS[step - 1]}`}
              aria-current={state.paso === step ? 'step' : undefined}
            >
              <div className="bm-step-num">{String(step).padStart(2, '0')}</div>
              <div>
                <div className="bm-step-name">{STEP_LABELS[step - 1]}</div>
                <div className="bm-step-desc">
                  {step === 1 ? 'Productos y alcance' : step === 2 ? 'Puntuar por dimensión' : 'Comparativa y exportar'}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="bm-panel-divider" />

      <button
        type="button"
        className="bm-btn-generate"
        onClick={handleNext}
        disabled={state.paso >= 3}
      >
        Siguiente →
      </button>
      <button type="button" className="bm-btn-export" onClick={handleSave}>
        💾 Guardar sesión
      </button>
      <button type="button" className="bm-btn-export" onClick={nuevoBenchmark}>
        ✕ Reiniciar
      </button>

      <div className="bm-panel-divider" />

      <div className="bm-panel-label">Sesiones guardadas</div>

      {historyStats ? (
        <div className="bm-saved-history-summary" aria-live="polite">
          <div className="bm-saved-summary-grid">
            <div className="bm-saved-summary-card">
              <div className="bm-saved-summary-label">Sesiones</div>
              <div className="bm-saved-summary-value">{historyStats.total}</div>
              <div className="bm-saved-summary-meta">Snapshots listos para reabrir</div>
            </div>
            <div className="bm-saved-summary-card">
              <div className="bm-saved-summary-label">Benchmarks</div>
              <div className="bm-saved-summary-value">{historyStats.uniqueNames}</div>
              <div className="bm-saved-summary-meta">Nombres distintos guardados</div>
            </div>
            <div className="bm-saved-summary-card">
              <div className="bm-saved-summary-label">Mejor score</div>
              <div className="bm-saved-summary-value">
                {historyStats.best?.summary.leaderTotal}/{historyStats.best?.summary.maxScore}
              </div>
              <div className="bm-saved-summary-meta">{historyStats.best?.summary.leaderName}</div>
            </div>
          </div>
          <div className="bm-saved-summary-foot">
            Última sesión: {historyStats.latest.nombre} · {historyStats.latest.fecha}
          </div>
        </div>
      ) : null}

      <div className="bm-saved-list">
        {state.historial.length === 0 ? (
          <div className="bm-empty-saved">Sin sesiones guardadas.</div>
        ) : (
          state.historial.map((session) => (
            <SavedSessionItem key={session.id} session={session} onLoad={handleLoad} />
          ))
        )}
      </div>
    </aside>
  );
}