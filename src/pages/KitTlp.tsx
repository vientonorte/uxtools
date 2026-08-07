import { useState } from 'react';
import { ToastContainer } from '../components/Toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import {
  KIT_TLP_STORAGE_KEY,
  createKitTlpSession,
  type HelpChannel,
  type KitTlpSession,
} from '../types/metodo-ro';

type Tab = 'protocolo' | 'historial';

const HELP_OPTIONS: { id: HelpChannel; label: string; color: string }[] = [
  { id: 'vinculos', label: 'Vínculos', color: 'rosa' },
  { id: 'comunidad', label: 'Comunidad', color: 'gris' },
  { id: 'terapias', label: 'Terapias', color: 'verde' },
  { id: 'naturaleza', label: 'Naturaleza', color: 'naranja' },
];

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function KitTlp() {
  const [sessions, setSessions] = useLocalStorage<KitTlpSession[]>(
    KIT_TLP_STORAGE_KEY,
    [createKitTlpSession()]
  );
  const lista = sessions.length ? sessions : [createKitTlpSession()];
  const [activeId, setActiveId] = useState(lista[0].id);
  const [tab, setTab] = useState<Tab>('protocolo');
  const { toasts, showToast, dismissToast } = useToast();

  const active = lista.find((s) => s.id === activeId) ?? lista[0];

  function patch(partial: Partial<KitTlpSession>) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? { ...s, ...partial, updatedAt: Date.now() }
          : s
      )
    );
  }

  function toggleHelp(ch: HelpChannel) {
    const set = new Set(active.helpChannels);
    if (set.has(ch)) set.delete(ch);
    else set.add(ch);
    patch({ helpChannels: Array.from(set) });
  }

  function nueva() {
    const s = createKitTlpSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setTab('protocolo');
    showToast('Nueva entrada Kit TLP');
  }

  function eliminar() {
    if (lista.length <= 1) {
      const s = createKitTlpSession();
      setSessions([s]);
      setActiveId(s.id);
      showToast('Entrada reiniciada');
      return;
    }
    const next = lista.filter((s) => s.id !== active.id);
    setSessions(next);
    setActiveId(next[0].id);
    showToast('Entrada eliminada');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(active, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit-tlp-${active.date || 'sesion'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON exportado');
  }

  return (
    <main className="mr-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">Método Ro · DBT/TCC adaptado · no improvisación</div>
        <h1 className="mr-title">Kit TLP</h1>
        <p className="mr-sub">
          Protocolo en crisis o desregulación: 1→8 en orden. No es diagnóstico. Es trazo —
          antecedente → afecto → cognición → conducta → STOP → C → distinto → ayuda.
        </p>
      </header>

      <div className="mr-toolbar">
        <button type="button" className="mr-btn mr-btn--primary" onClick={nueva}>
          Nueva entrada
        </button>
        <button type="button" className="mr-btn mr-btn--ghost" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" className="mr-btn mr-btn--ghost" onClick={() => window.print()}>
          Imprimir
        </button>
        <button type="button" className="mr-btn mr-btn--danger" onClick={eliminar}>
          Eliminar
        </button>
      </div>

      <div className="mr-tabs" role="tablist" aria-label="Secciones Kit TLP">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'protocolo'}
          className={`mr-tab${tab === 'protocolo' ? ' mr-tab--active' : ''}`}
          onClick={() => setTab('protocolo')}
        >
          Protocolo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'historial'}
          className={`mr-tab${tab === 'historial' ? ' mr-tab--active' : ''}`}
          onClick={() => setTab('historial')}
        >
          Historial
        </button>
      </div>

      {tab === 'protocolo' && (
        <>
          <div className="mr-card">
            <h2 className="mr-card__title">Cuándo usarlo</h2>
            <p className="mr-card__hint" style={{ marginBottom: 0 }}>
              Ante crisis, impulso alto, desregulación o después de un evento que te movió.
              Completa 1→8. Hermano: Self Radar (semanal). Si hay riesgo, priorizar paso 8 y red
              real.
            </p>
          </div>

          <div className="mr-grid-meta">
            <div className="mr-field">
              <label htmlFor="tlp-date">Fecha</label>
              <input
                id="tlp-date"
                type="date"
                value={active.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div className="mr-field">
              <label htmlFor="tlp-time">Hora</label>
              <input
                id="tlp-time"
                type="time"
                value={active.time}
                onChange={(e) => patch({ time: e.target.value })}
              />
            </div>
            <div className="mr-field">
              <label htmlFor="tlp-page">Página Bullet #</label>
              <input
                id="tlp-page"
                type="text"
                value={active.bulletPage}
                onChange={(e) => patch({ bulletPage: e.target.value })}
              />
            </div>
            <div className="mr-field">
              <label htmlFor="tlp-int">Intensidad 1–10</label>
              <div className="mr-intensity">
                <input
                  id="tlp-int"
                  type="range"
                  min={1}
                  max={10}
                  value={active.intensity}
                  onChange={(e) => patch({ intensity: Number(e.target.value) })}
                />
                <span className="mr-intensity-val" aria-live="polite">
                  {active.intensity}
                </span>
              </div>
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--rosa">1</span>
              <h3>¿Qué sucedió?</h3>
            </div>
            <p className="mr-card__hint">Antecedente — hechos, sin juicios aún</p>
            <div className="mr-field">
              <label htmlFor="s1" className="visually-hidden">
                Qué sucedió
              </label>
              <textarea
                id="s1"
                value={active.sucedio}
                onChange={(e) => patch({ sucedio: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--rosa">2</span>
              <h3>¿Qué sentí?</h3>
            </div>
            <p className="mr-card__hint">Afecto — emociones, sensaciones en el cuerpo</p>
            <div className="mr-field">
              <label htmlFor="s2" className="visually-hidden">
                Qué sentí
              </label>
              <textarea
                id="s2"
                value={active.senti}
                onChange={(e) => patch({ senti: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--naranja">3</span>
              <h3>¿Qué lo gatilló?</h3>
            </div>
            <p className="mr-card__hint">Cognición — pensamiento, interpretación, trigger</p>
            <div className="mr-field">
              <label htmlFor="s3" className="visually-hidden">
                Qué lo gatilló
              </label>
              <textarea
                id="s3"
                value={active.gatillo}
                onChange={(e) => patch({ gatillo: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--naranja">4</span>
              <h3>¿Qué acciones tomé?</h3>
            </div>
            <p className="mr-card__hint">Conducta — lo que hice / dije / evité</p>
            <div className="mr-field">
              <label htmlFor="s4" className="visually-hidden">
                Qué acciones tomé
              </label>
              <textarea
                id="s4"
                value={active.acciones}
                onChange={(e) => patch({ acciones: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-stop">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--stop">5</span>
              <h3 className="mr-stop__title" style={{ margin: 0 }}>
                STOP
              </h3>
            </div>
            <p className="mr-stop__hint">DBT · no actuar en automático</p>
            <div className="mr-three-col">
              <div className="mr-field">
                <label htmlFor="st1">Respira</label>
                <textarea
                  id="st1"
                  placeholder="aire · cuerpo · 4-6-8 o conteo"
                  value={active.stopRespira}
                  onChange={(e) => patch({ stopRespira: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="st2">Observa</label>
                <textarea
                  id="st2"
                  placeholder="nombra sin juzgar lo que hay"
                  value={active.stopObserva}
                  onChange={(e) => patch({ stopObserva: e.target.value })}
                />
              </div>
              <div className="mr-field">
                <label htmlFor="st3">Procesa</label>
                <textarea
                  id="st3"
                  placeholder="¿qué necesito ahora, 1 cosa?"
                  value={active.stopProcesa}
                  onChange={(e) => patch({ stopProcesa: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--azul">6</span>
              <h3>C — Reestructuración / coping</h3>
            </div>
            <p className="mr-card__hint">
              Frases que sostienen · no pelear con el pensamiento, reencuadrar
            </p>
            <div className="mr-field">
              <label htmlFor="s6" className="visually-hidden">
                Coping
              </label>
              <textarea
                id="s6"
                value={active.coping}
                onChange={(e) => patch({ coping: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--verde">7</span>
              <h3>¿Qué haría distinto?</h3>
            </div>
            <p className="mr-card__hint">
              Mecanismos de regulación · 1–3 opciones concretas (no castigo, no “debería”)
            </p>
            <div className="mr-field">
              <label htmlFor="s7" className="visually-hidden">
                Qué haría distinto
              </label>
              <textarea
                id="s7"
                value={active.distinto}
                onChange={(e) => patch({ distinto: e.target.value })}
              />
            </div>
          </div>

          <div className="mr-card">
            <div className="mr-step-head">
              <span className="mr-step-num mr-step-num--verde">8</span>
              <h3>Buscar ayuda</h3>
            </div>
            <p className="mr-card__hint">
              Marca canal + anota a quién / qué · un canal basta
            </p>
            <div className="mr-help-grid">
              {HELP_OPTIONS.map((opt) => (
                <label key={opt.id} className="mr-check">
                  <input
                    type="checkbox"
                    checked={active.helpChannels.includes(opt.id)}
                    onChange={() => toggleHelp(opt.id)}
                  />
                  <span className={`mr-dot mr-dot--${opt.color}`} />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="mr-field" style={{ marginTop: 16 }}>
              <label htmlFor="s8">Notas (persona / grupo / sesión / lugar)</label>
              <textarea
                id="s8"
                value={active.helpNotes}
                onChange={(e) => patch({ helpNotes: e.target.value })}
              />
            </div>
            <label className="mr-check" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={active.linkedSelfradar}
                onChange={(e) => patch({ linkedSelfradar: e.target.checked })}
              />
              Vinculado a Selfradar de esta semana
            </label>
          </div>
        </>
      )}

      {tab === 'historial' && (
        <div className="mr-card">
          <h2 className="mr-card__title">Entradas guardadas</h2>
          <p className="mr-card__hint">localStorage · 100% en tu dispositivo</p>
          <ul className="mr-history-list">
            {lista.map((s) => (
              <li
                key={s.id}
                className={`mr-history-item${
                  s.id === active.id ? ' mr-history-item--active' : ''
                }`}
              >
                <div className="mr-history-meta">
                  <strong>
                    {s.date || 'Sin fecha'} {s.time}
                  </strong>
                  {' · '}
                  intensidad {s.intensity}/10 · {fmtDate(s.updatedAt)}
                </div>
                <button
                  type="button"
                  className="mr-btn mr-btn--ghost"
                  onClick={() => {
                    setActiveId(s.id);
                    setTab('protocolo');
                  }}
                >
                  Abrir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mr-privacy">
        Anti: no diagnosticar · no moralizar · no reescribir la voz. Privacidad local — sin
        servidores.
      </p>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
