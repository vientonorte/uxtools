import { useMemo, useState } from 'react';
import { RadarSvg } from '../components/metodo-ro/RadarSvg';
import { ToastContainer } from '../components/Toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import {
  SELFRADAR_AXES,
  SELFRADAR_STORAGE_KEY,
  createSelfradarSession,
  type SelfradarSession,
} from '../types/metodo-ro';

type Tab = 'radar' | 'preguntas' | 'cierre' | 'historial';

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function lowAxes(session: SelfradarSession) {
  return SELFRADAR_AXES.filter((a) => {
    const sc = session.scores[a.id]?.score ?? 0;
    return sc > 0 && sc <= 5;
  });
}

export default function Selfradar() {
  const [sessions, setSessions] = useLocalStorage<SelfradarSession[]>(
    SELFRADAR_STORAGE_KEY,
    [createSelfradarSession()]
  );
  const lista = sessions.length ? sessions : [createSelfradarSession()];
  const [activeId, setActiveId] = useState(lista[0].id);
  const [tab, setTab] = useState<Tab>('radar');
  const { toasts, showToast, dismissToast } = useToast();

  const active = lista.find((s) => s.id === activeId) ?? lista[0];

  function patch(partial: Partial<SelfradarSession>) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? { ...s, ...partial, updatedAt: Date.now() }
          : s
      )
    );
  }

  function setScore(axisId: string, score: number) {
    const current = active.scores[axisId]?.score ?? 0;
    const next = current === score ? 0 : score;
    patch({
      scores: {
        ...active.scores,
        [axisId]: {
          score: next,
          action: next > 0 && next <= 5 ? active.scores[axisId]?.action ?? '' : '',
        },
      },
    });
  }

  function setAction(axisId: string, action: string) {
    patch({
      scores: {
        ...active.scores,
        [axisId]: { ...active.scores[axisId], action },
      },
    });
  }

  function nueva() {
    const s = createSelfradarSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setTab('radar');
    showToast('Nueva sesión Selfradar');
  }

  function eliminar() {
    if (lista.length <= 1) {
      const s = createSelfradarSession();
      setSessions([s]);
      setActiveId(s.id);
      showToast('Sesión reiniciada');
      return;
    }
    const next = lista.filter((s) => s.id !== active.id);
    setSessions(next);
    setActiveId(next[0].id);
    showToast('Sesión eliminada');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(active, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selfradar-${active.date || 'sesion'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON exportado');
  }

  function imprimir() {
    window.print();
  }

  const bajos = useMemo(() => lowAxes(active), [active]);

  return (
    <main className="mr-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">Método Ro · Bullet Ro · Clave A</div>
        <h1 className="mr-title">Self Radar</h1>
        <p className="mr-sub">
          Review semanal: mide 7 dimensiones fijas (1–10), responde las preguntas de buen vivir
          y baja máx. 3 acciones de ejes bajos a Calendar. 100% local.
        </p>
      </header>

      <div className="mr-toolbar">
        <button type="button" className="mr-btn mr-btn--primary" onClick={nueva}>
          Nueva sesión
        </button>
        <button type="button" className="mr-btn mr-btn--ghost" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" className="mr-btn mr-btn--ghost" onClick={imprimir}>
          Imprimir
        </button>
        <button type="button" className="mr-btn mr-btn--danger" onClick={eliminar}>
          Eliminar
        </button>
      </div>

      <div className="mr-tabs" role="tablist" aria-label="Secciones Selfradar">
        {(
          [
            ['radar', 'Radar'],
            ['preguntas', 'Preguntas'],
            ['cierre', 'Cierre'],
            ['historial', 'Historial'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`mr-tab${tab === id ? ' mr-tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mr-clave" aria-label="Clave A">
        <span>
          <span className="mr-dot mr-dot--rosa" /> Rosa · Personal
        </span>
        <span>
          <span className="mr-dot mr-dot--gris" /> Gris · Vínculos
        </span>
        <span>
          <span className="mr-dot mr-dot--verde" /> Verde · Camila
        </span>
        <span>
          <span className="mr-dot mr-dot--naranja" /> Naranja · Laboral/VN
        </span>
        <span>
          <span className="mr-dot mr-dot--amarillo" /> Amarillo · Refs/$
        </span>
      </div>

      <div className="mr-grid-meta">
        <div className="mr-field">
          <label htmlFor="sr-date">Fecha</label>
          <input
            id="sr-date"
            type="date"
            value={active.date}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </div>
        <div className="mr-field">
          <label htmlFor="sr-from">Semana del</label>
          <input
            id="sr-from"
            type="date"
            value={active.weekFrom}
            onChange={(e) => patch({ weekFrom: e.target.value })}
          />
        </div>
        <div className="mr-field">
          <label htmlFor="sr-to">al</label>
          <input
            id="sr-to"
            type="date"
            value={active.weekTo}
            onChange={(e) => patch({ weekTo: e.target.value })}
          />
        </div>
        <div className="mr-field">
          <label htmlFor="sr-page">Página Bullet #</label>
          <input
            id="sr-page"
            type="text"
            value={active.bulletPage}
            onChange={(e) => patch({ bulletPage: e.target.value })}
            placeholder="ej. 87"
          />
        </div>
      </div>

      {tab === 'radar' && (
        <>
          <div className="mr-card">
            <h2 className="mr-card__title">Cómo usar</h2>
            <ol className="mr-rules">
              <li>Dimensiones fijas (estas 7). No reinventar el radar cada semana.</li>
              <li>Escala 1–10: marca un círculo. Sin moralizar el score.</li>
              <li>Color = dominio de vida (Clave A), no decoración.</li>
              <li>Una acción por eje bajo (≤5) → máx. 3 bloques la semana siguiente.</li>
              <li>Cadencia: domingo review o fin de mes. No diario.</li>
            </ol>
          </div>

          <div className="mr-radar-layout">
            <div className="mr-radar-svg-wrap">
              <RadarSvg scores={active.scores} />
            </div>
            <div>
              {SELFRADAR_AXES.map((axis) => {
                const entry = active.scores[axis.id] ?? { score: 0, action: '' };
                const low = entry.score > 0 && entry.score <= 5;
                return (
                  <div className="mr-axis-row" key={axis.id}>
                    <div className="mr-axis-label">
                      <span className={`mr-dot mr-dot--${axis.color}`} />
                      {axis.label}
                    </div>
                    <div
                      className="mr-score-pills"
                      role="group"
                      aria-label={`Score ${axis.label}`}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`mr-score-pill${
                            entry.score === n ? ' mr-score-pill--on' : ''
                          }${entry.score === n && n <= 5 ? ' mr-score-pill--low' : ''}`}
                          aria-pressed={entry.score === n}
                          onClick={() => setScore(axis.id, n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="mr-axis-action mr-field">
                      <input
                        type="text"
                        aria-label={`Acción si bajo: ${axis.label}`}
                        placeholder={low ? '1 acción si score ≤5' : '—'}
                        disabled={!low}
                        value={entry.action}
                        onChange={(e) => setAction(axis.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {bajos.length > 0 && (
            <div className="mr-card">
              <h2 className="mr-card__title">Ejes bajos (≤5) → Calendar</h2>
              <p className="mr-card__hint">
                Máx. 3 bloques la próxima semana. No inventar eventos Camila.
              </p>
              <ul className="mr-rules">
                {bajos.map((a) => (
                  <li key={a.id}>
                    <strong>{a.label}</strong> ({active.scores[a.id].score}/10)
                    {active.scores[a.id].action
                      ? ` — ${active.scores[a.id].action}`
                      : ' — sin acción aún'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {tab === 'preguntas' && (
        <>
          <div className="mr-card">
            <h2 className="mr-card__title">Preguntas × un buen vivir</h2>
            <p className="mr-card__hint">Estilo p.87 Bullet Ro · resalta con Clave A si imprime/copia</p>
            <div className="mr-field" style={{ marginBottom: 16 }}>
              <label htmlFor="q1">¿Qué quiero conseguir esta semana que inicia?</label>
              <textarea
                id="q1"
                value={active.qConseguir}
                onChange={(e) => patch({ qConseguir: e.target.value })}
              />
            </div>
            <div className="mr-field" style={{ marginBottom: 16 }}>
              <label htmlFor="q2">¿Qué he observado? ¿Qué he sentido?</label>
              <textarea
                id="q2"
                value={active.qObservado}
                onChange={(e) => patch({ qObservado: e.target.value })}
              />
            </div>
            <div className="mr-field" style={{ marginBottom: 16 }}>
              <label htmlFor="q3">¿Qué he aprendido? ¿Qué quiero compartir?</label>
              <textarea
                id="q3"
                value={active.qAprendido}
                onChange={(e) => patch({ qAprendido: e.target.value })}
              />
            </div>
            <div className="mr-field">
              <label htmlFor="q4">¿Qué necesito? ¿A quiénes puedo pedir ayuda?</label>
              <textarea
                id="q4"
                value={active.qNecesito}
                onChange={(e) => patch({ qNecesito: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-card">
            <h2 className="mr-card__title">Reflexiones</h2>
            <div className="mr-field" style={{ marginBottom: 16 }}>
              <label htmlFor="ref">Anota con color de dominio</label>
              <textarea
                id="ref"
                value={active.reflexiones}
                onChange={(e) => patch({ reflexiones: e.target.value })}
              />
            </div>
            <div className="mr-two-col">
              <div className="mr-field">
                <label htmlFor="apr">Estoy aprendiendo</label>
                <textarea
                  id="apr"
                  value={active.aprendiendo}
                  onChange={(e) => patch({ aprendiendo: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="nec">Necesito / pedir ayuda</label>
                <textarea
                  id="nec"
                  value={active.necesito}
                  onChange={(e) => patch({ necesito: e.target.value })}
                />
              </div>
            </div>
            <div className="mr-field" style={{ marginTop: 16 }}>
              <label htmlFor="obs">Observo (estabilidad, impulsos, a raya)</label>
              <textarea
                id="obs"
                value={active.observo}
                onChange={(e) => patch({ observo: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'cierre' && (
        <>
          <div className="mr-card">
            <h2 className="mr-card__title">Qué me ha sacado una sonrisa</h2>
            <div className="mr-three-col">
              <div className="mr-field">
                <label htmlFor="sp">
                  <span className="mr-dot mr-dot--rosa" /> Personal / cuerpo
                </label>
                <textarea
                  id="sp"
                  value={active.sonrisaPersonal}
                  onChange={(e) => patch({ sonrisaPersonal: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="sc">
                  <span className="mr-dot mr-dot--verde" /> Camila / vínculos
                </label>
                <textarea
                  id="sc"
                  value={active.sonrisaCamila}
                  onChange={(e) => patch({ sonrisaCamila: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="sl">
                  <span className="mr-dot mr-dot--naranja" /> Laboral / VN
                </label>
                <textarea
                  id="sl"
                  value={active.sonrisaLaboral}
                  onChange={(e) => patch({ sonrisaLaboral: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mr-card">
            <h2 className="mr-card__title">Review semana pasada</h2>
            <div className="mr-three-col">
              <div className="mr-field">
                <label htmlFor="rp">Personal / bienestar</label>
                <textarea
                  id="rp"
                  value={active.reviewPersonal}
                  onChange={(e) => patch({ reviewPersonal: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="rl">VN / trabajo / estudio</label>
                <textarea
                  id="rl"
                  value={active.reviewLaboral}
                  onChange={(e) => patch({ reviewLaboral: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="rc">Camila / juntos</label>
                <textarea
                  id="rc"
                  value={active.reviewCamila}
                  onChange={(e) => patch({ reviewCamila: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mr-card">
            <h2 className="mr-card__title">Acciones importantes</h2>
            <p className="mr-card__hint">1 por eje bajo · máx 3 a Calendar</p>
            <div className="mr-three-col">
              <div className="mr-field">
                <label htmlFor="ap">Personal ○</label>
                <textarea
                  id="ap"
                  value={active.accionesPersonal}
                  onChange={(e) => patch({ accionesPersonal: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="al">Laboral / $ *</label>
                <textarea
                  id="al"
                  value={active.accionesLaboral}
                  onChange={(e) => patch({ accionesLaboral: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="ac">Camila / vínculos &gt;</label>
                <textarea
                  id="ac"
                  value={active.accionesCamila}
                  onChange={(e) => patch({ accionesCamila: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mr-card">
            <h2 className="mr-card__title">Nota de cierre</h2>
            <div className="mr-field">
              <label htmlFor="nc">Lo que falta actualizar</label>
              <textarea
                id="nc"
                value={active.notaCierre}
                onChange={(e) => patch({ notaCierre: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'historial' && (
        <div className="mr-card">
          <h2 className="mr-card__title">Sesiones guardadas</h2>
          <p className="mr-card__hint">localStorage · no salen del dispositivo</p>
          <ul className="mr-history-list">
            {lista.map((s) => {
              const filled = SELFRADAR_AXES.filter(
                (a) => (s.scores[a.id]?.score ?? 0) > 0
              ).length;
              return (
                <li
                  key={s.id}
                  className={`mr-history-item${
                    s.id === active.id ? ' mr-history-item--active' : ''
                  }`}
                >
                  <div className="mr-history-meta">
                    <strong>{s.date || 'Sin fecha'}</strong>
                    {' · '}
                    {filled}/7 ejes · act. {fmtDate(s.updatedAt)}
                  </div>
                  <button
                    type="button"
                    className="mr-btn mr-btn--ghost"
                    onClick={() => {
                      setActiveId(s.id);
                      setTab('radar');
                    }}
                  >
                    Abrir
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mr-privacy">
        Privacidad: todo se guarda en tu navegador (localStorage). Sin servidores, sin
        telemetría. No diagnosticar desde el score — solo trazar.
      </p>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
