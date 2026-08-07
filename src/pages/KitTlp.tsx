import { useState } from 'react';
import { MrButton } from '../components/metodo-ro/MrButton';
import { MrCard } from '../components/metodo-ro/MrCard';
import { MrConfirmModal } from '../components/metodo-ro/MrConfirmModal';
import { MrExportModal } from '../components/metodo-ro/MrExportModal';
import { MrField } from '../components/metodo-ro/MrField';
import { MrImportModal } from '../components/metodo-ro/MrImportModal';
import { MrStepHead } from '../components/metodo-ro/MrStepHead';
import { MrTabs } from '../components/metodo-ro/MrTabs';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  loadKitTlpSessions,
  MR_LIMITS,
  saveKitTlpSessions,
  sanitizeKitTlpSession,
} from '../lib/metodo-ro-storage';
import {
  createKitTlpSession,
  type HelpChannel,
  type KitTlpSession,
} from '../types/metodo-ro';

const TABS = [
  { id: 'protocolo', label: 'Protocolo' },
  { id: 'historial', label: 'Historial' },
];

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
  const [sessions, setSessionsState] = useState<KitTlpSession[]>(() =>
    loadKitTlpSessions()
  );
  const lista = sessions.length ? sessions : [createKitTlpSession()];
  const [activeId, setActiveId] = useState(lista[0].id);
  const [tab, setTab] = useState('protocolo');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const active = lista.find((s) => s.id === activeId) ?? lista[0];

  function commitSessions(next: KitTlpSession[]) {
    const cleaned = next
      .map(sanitizeKitTlpSession)
      .filter((s): s is KitTlpSession => s !== null)
      .slice(0, MR_LIMITS.sessions);
    const final = cleaned.length ? cleaned : [createKitTlpSession()];
    const ok = saveKitTlpSessions(final);
    setSessionsState(final);
    if (!ok) showToast('No se pudo guardar (cuota localStorage)');
    return final;
  }

  function patch(partial: Partial<KitTlpSession>) {
    commitSessions(
      lista.map((s) =>
        s.id === active.id ? { ...s, ...partial, updatedAt: Date.now() } : s
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
    commitSessions([s, ...lista].slice(0, MR_LIMITS.sessions));
    setActiveId(s.id);
    setTab('protocolo');
    showToast('Nueva entrada Kit TLP');
  }

  function doEliminar() {
    setConfirmDelete(false);
    if (lista.length <= 1) {
      const s = createKitTlpSession();
      commitSessions([s]);
      setActiveId(s.id);
      showToast('Entrada reiniciada');
      return;
    }
    const next = lista.filter((s) => s.id !== active.id);
    commitSessions(next);
    setActiveId(next[0].id);
    showToast('Entrada eliminada');
  }

  function handleImport(data: unknown) {
    const session = sanitizeKitTlpSession(data);
    if (!session) {
      showToast('Entrada Kit TLP inválida o corrupta');
      return;
    }
    session.id = createKitTlpSession().id;
    session.updatedAt = Date.now();
    commitSessions([session, ...lista].slice(0, MR_LIMITS.sessions));
    setActiveId(session.id);
    setTab('protocolo');
    showToast('Entrada importada');
  }

  return (
    <main className="mr-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">
          Método Ro · DBT/TCC adaptado · security by design
        </div>
        <h1 className="mr-title">Kit TLP</h1>
        <p className="mr-sub">
          Protocolo 1→8 en crisis. No es diagnóstico. Datos solo en tu navegador,
          validados y con límites de tamaño.
        </p>
      </header>

      <div className="mr-toolbar">
        <MrButton variant="primary" onClick={nueva}>
          Nueva entrada
        </MrButton>
        <MrButton onClick={() => setExportOpen(true)}>Exportar</MrButton>
        <MrButton onClick={() => setImportOpen(true)}>Importar</MrButton>
        <MrButton onClick={() => window.print()}>Imprimir</MrButton>
        <MrButton variant="danger" onClick={() => setConfirmDelete(true)}>
          Eliminar
        </MrButton>
      </div>

      <MrTabs
        items={TABS}
        activeId={tab}
        onChange={setTab}
        label="Secciones Kit TLP"
      >
        {(activeTab) => (
          <>
            {activeTab === 'protocolo' && (
              <>
                <MrCard
                  title="Cuándo usarlo"
                  hint="Crisis, impulso alto o desregulación. Si hay riesgo, priorizar paso 8 y red real."
                />

                <div className="mr-grid-meta">
                  <MrField
                    id="tlp-date"
                    label="Fecha"
                    type="date"
                    value={active.date}
                    onChange={(v) => patch({ date: v })}
                    maxLength={16}
                    showCount={false}
                  />
                  <MrField
                    id="tlp-time"
                    label="Hora"
                    type="time"
                    value={active.time}
                    onChange={(v) => patch({ time: v })}
                    maxLength={8}
                    showCount={false}
                  />
                  <MrField
                    id="tlp-page"
                    label="Página Bullet #"
                    value={active.bulletPage}
                    onChange={(v) => patch({ bulletPage: v })}
                    maxLength={MR_LIMITS.short}
                    showCount={false}
                  />
                  <div className="mr-field">
                    <label htmlFor="tlp-int">Intensidad 1–10</label>
                    <div className="mr-intensity">
                      <input
                        id="tlp-int"
                        type="range"
                        min={1}
                        max={10}
                        value={active.intensity}
                        onChange={(e) =>
                          patch({ intensity: Number(e.target.value) })
                        }
                      />
                      <span className="mr-intensity-val" aria-live="polite">
                        {active.intensity}
                      </span>
                    </div>
                  </div>
                </div>

                <MrCard>
                  <MrStepHead num={1} tone="rosa">
                    ¿Qué sucedió?
                  </MrStepHead>
                  <p className="mr-card__hint">Antecedente — hechos, sin juicios aún</p>
                  <MrField
                    id="s1"
                    as="textarea"
                    label="Qué sucedió"
                    hideLabel
                    value={active.sucedio}
                    onChange={(v) => patch({ sucedio: v })}
                  />
                </MrCard>

                <MrCard>
                  <MrStepHead num={2} tone="rosa">
                    ¿Qué sentí?
                  </MrStepHead>
                  <p className="mr-card__hint">
                    Afecto — emociones, sensaciones en el cuerpo
                  </p>
                  <MrField
                    id="s2"
                    as="textarea"
                    label="Qué sentí"
                    hideLabel
                    value={active.senti}
                    onChange={(v) => patch({ senti: v })}
                  />
                </MrCard>

                <MrCard>
                  <MrStepHead num={3} tone="naranja">
                    ¿Qué lo gatilló?
                  </MrStepHead>
                  <p className="mr-card__hint">
                    Cognición — pensamiento, interpretación, trigger
                  </p>
                  <MrField
                    id="s3"
                    as="textarea"
                    label="Qué lo gatilló"
                    hideLabel
                    value={active.gatillo}
                    onChange={(v) => patch({ gatillo: v })}
                  />
                </MrCard>

                <MrCard>
                  <MrStepHead num={4} tone="naranja">
                    ¿Qué acciones tomé?
                  </MrStepHead>
                  <p className="mr-card__hint">
                    Conducta — lo que hice / dije / evité
                  </p>
                  <MrField
                    id="s4"
                    as="textarea"
                    label="Qué acciones tomé"
                    hideLabel
                    value={active.acciones}
                    onChange={(v) => patch({ acciones: v })}
                  />
                </MrCard>

                <div className="mr-stop">
                  <MrStepHead num={5} tone="stop">
                    <span className="mr-stop__title" style={{ margin: 0 }}>
                      STOP
                    </span>
                  </MrStepHead>
                  <p className="mr-stop__hint">DBT · no actuar en automático</p>
                  <div className="mr-three-col">
                    <MrField
                      id="st1"
                      as="textarea"
                      label="Respira"
                      placeholder="aire · cuerpo · 4-6-8 o conteo"
                      value={active.stopRespira}
                      onChange={(v) => patch({ stopRespira: v })}
                    />
                    <MrField
                      id="st2"
                      as="textarea"
                      label="Observa"
                      placeholder="nombra sin juzgar lo que hay"
                      value={active.stopObserva}
                      onChange={(v) => patch({ stopObserva: v })}
                    />
                    <MrField
                      id="st3"
                      as="textarea"
                      label="Procesa"
                      placeholder="¿qué necesito ahora, 1 cosa?"
                      value={active.stopProcesa}
                      onChange={(v) => patch({ stopProcesa: v })}
                    />
                  </div>
                </div>

                <MrCard>
                  <MrStepHead num={6} tone="azul">
                    C — Reestructuración / coping
                  </MrStepHead>
                  <p className="mr-card__hint">
                    Frases que sostienen · reencuadrar sin pelear el pensamiento
                  </p>
                  <MrField
                    id="s6"
                    as="textarea"
                    label="Coping"
                    hideLabel
                    value={active.coping}
                    onChange={(v) => patch({ coping: v })}
                  />
                </MrCard>

                <MrCard>
                  <MrStepHead num={7} tone="verde">
                    ¿Qué haría distinto?
                  </MrStepHead>
                  <p className="mr-card__hint">
                    1–3 opciones concretas (no castigo, no “debería”)
                  </p>
                  <MrField
                    id="s7"
                    as="textarea"
                    label="Qué haría distinto"
                    hideLabel
                    value={active.distinto}
                    onChange={(v) => patch({ distinto: v })}
                  />
                </MrCard>

                <MrCard>
                  <MrStepHead num={8} tone="verde">
                    Buscar ayuda
                  </MrStepHead>
                  <p className="mr-card__hint">
                    Marca canal + anota a quién · un canal basta
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
                  <MrField
                    id="s8"
                    as="textarea"
                    label="Notas (persona / grupo / sesión / lugar)"
                    value={active.helpNotes}
                    onChange={(v) => patch({ helpNotes: v })}
                    className="mr-field--stack-top"
                  />
                  <label className="mr-check" style={{ marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={active.linkedSelfradar}
                      onChange={(e) =>
                        patch({ linkedSelfradar: e.target.checked })
                      }
                    />
                    Vinculado a Selfradar de esta semana
                  </label>
                </MrCard>
              </>
            )}

            {activeTab === 'historial' && (
              <MrCard
                title="Entradas guardadas"
                hint="localStorage sanitizado · 100% en tu dispositivo"
              >
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
                      <MrButton
                        onClick={() => {
                          setActiveId(s.id);
                          setTab('protocolo');
                        }}
                      >
                        Abrir
                      </MrButton>
                    </li>
                  ))}
                </ul>
              </MrCard>
            )}
          </>
        )}
      </MrTabs>

      <p className="mr-privacy">
        Anti: no diagnosticar · no moralizar. Export cifrado recomendado (AES-GCM).
        Sin servidores.
      </p>

      <MrConfirmModal
        open={confirmDelete}
        title="Eliminar entrada Kit TLP"
        description="Contiene notas personales. ¿Eliminar? No se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={doEliminar}
        onCancel={() => setConfirmDelete(false)}
      />
      <MrExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        payload={active}
        tool="kit-tlp"
        filenameBase={`kit-tlp-${active.date || 'sesion'}`}
        preferEncrypted
        onDone={showToast}
        onError={showToast}
      />
      <MrImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        toolLabel="Kit TLP"
        onImport={handleImport}
        onError={showToast}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
