import { useMemo, useState } from 'react';
import { MrButton } from '../components/metodo-ro/MrButton';
import { MrCard } from '../components/metodo-ro/MrCard';
import { MrConfirmModal } from '../components/metodo-ro/MrConfirmModal';
import { MrExportModal } from '../components/metodo-ro/MrExportModal';
import { MrField } from '../components/metodo-ro/MrField';
import { MrImportModal } from '../components/metodo-ro/MrImportModal';
import { MrScorePills } from '../components/metodo-ro/MrScorePills';
import { MrTabs } from '../components/metodo-ro/MrTabs';
import { RadarSvg } from '../components/metodo-ro/RadarSvg';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  loadSelfradarSessions,
  MR_LIMITS,
  saveSelfradarSessions,
  sanitizeSelfradarSession,
} from '../lib/metodo-ro-storage';
import {
  SELFRADAR_AXES,
  createSelfradarSession,
  type SelfradarSession,
} from '../types/metodo-ro';

const TABS = [
  { id: 'radar', label: 'Radar' },
  { id: 'preguntas', label: 'Preguntas' },
  { id: 'cierre', label: 'Cierre' },
  { id: 'historial', label: 'Historial' },
];

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
  const [sessions, setSessionsState] = useState<SelfradarSession[]>(() =>
    loadSelfradarSessions()
  );
  const lista = sessions.length ? sessions : [createSelfradarSession()];
  const [activeId, setActiveId] = useState(lista[0].id);
  const [tab, setTab] = useState('radar');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const active = lista.find((s) => s.id === activeId) ?? lista[0];

  function commitSessions(next: SelfradarSession[]) {
    const cleaned = next
      .map(sanitizeSelfradarSession)
      .filter((s): s is SelfradarSession => s !== null)
      .slice(0, MR_LIMITS.sessions);
    const final = cleaned.length ? cleaned : [createSelfradarSession()];
    const ok = saveSelfradarSessions(final);
    setSessionsState(final);
    if (!ok) showToast('No se pudo guardar (cuota localStorage)');
    return final;
  }

  function patch(partial: Partial<SelfradarSession>) {
    commitSessions(
      lista.map((s) =>
        s.id === active.id ? { ...s, ...partial, updatedAt: Date.now() } : s
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
          action:
            next > 0 && next <= 5 ? active.scores[axisId]?.action ?? '' : '',
        },
      },
    });
  }

  function setAction(axisId: string, action: string) {
    patch({
      scores: {
        ...active.scores,
        [axisId]: {
          ...active.scores[axisId],
          action: action.slice(0, MR_LIMITS.action),
        },
      },
    });
  }

  function nueva() {
    const s = createSelfradarSession();
    commitSessions([s, ...lista].slice(0, MR_LIMITS.sessions));
    setActiveId(s.id);
    setTab('radar');
    showToast('Nueva sesión Selfradar');
  }

  function doEliminar() {
    setConfirmDelete(false);
    if (lista.length <= 1) {
      const s = createSelfradarSession();
      commitSessions([s]);
      setActiveId(s.id);
      showToast('Sesión reiniciada');
      return;
    }
    const next = lista.filter((s) => s.id !== active.id);
    commitSessions(next);
    setActiveId(next[0].id);
    showToast('Sesión eliminada');
  }

  function handleImport(data: unknown) {
    const session = sanitizeSelfradarSession(data);
    if (!session) {
      showToast('Sesión Selfradar inválida o corrupta');
      return;
    }
    session.id = createSelfradarSession().id;
    session.updatedAt = Date.now();
    commitSessions([session, ...lista].slice(0, MR_LIMITS.sessions));
    setActiveId(session.id);
    setTab('radar');
    showToast('Sesión importada');
  }

  const bajos = useMemo(() => lowAxes(active), [active]);

  return (
    <main className="mr-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">Método Ro · Bullet Ro · Clave A · local-first</div>
        <h1 className="mr-title">Self Radar</h1>
        <p className="mr-sub">
          Review semanal: 7 dimensiones fijas (1–10), buen vivir y máx. 3 acciones.
          Todo en localStorage validado — sin servidores.
        </p>
      </header>

      <div className="mr-toolbar">
        <MrButton variant="primary" onClick={nueva}>
          Nueva sesión
        </MrButton>
        <MrButton onClick={() => setExportOpen(true)}>Exportar</MrButton>
        <MrButton onClick={() => setImportOpen(true)}>Importar</MrButton>
        <MrButton onClick={() => window.print()}>Imprimir</MrButton>
        <MrButton variant="danger" onClick={() => setConfirmDelete(true)}>
          Eliminar
        </MrButton>
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
        <MrField
          id="sr-date"
          label="Fecha"
          type="date"
          value={active.date}
          onChange={(v) => patch({ date: v })}
          maxLength={16}
          showCount={false}
        />
        <MrField
          id="sr-from"
          label="Semana del"
          type="date"
          value={active.weekFrom}
          onChange={(v) => patch({ weekFrom: v })}
          maxLength={16}
          showCount={false}
        />
        <MrField
          id="sr-to"
          label="al"
          type="date"
          value={active.weekTo}
          onChange={(v) => patch({ weekTo: v })}
          maxLength={16}
          showCount={false}
        />
        <MrField
          id="sr-page"
          label="Página Bullet #"
          value={active.bulletPage}
          onChange={(v) => patch({ bulletPage: v })}
          placeholder="ej. 87"
          maxLength={MR_LIMITS.short}
          showCount={false}
        />
      </div>

      <MrTabs
        items={TABS}
        activeId={tab}
        onChange={setTab}
        label="Secciones Selfradar"
      >
        {(activeTab) => (
          <>
            {activeTab === 'radar' && (
              <>
                <MrCard title="Cómo usar">
                  <ol className="mr-rules">
                    <li>Dimensiones fijas (estas 7). No reinventar cada semana.</li>
                    <li>Escala 1–10. Sin moralizar el score.</li>
                    <li>Una acción por eje bajo (≤5) → máx. 3 bloques Calendar.</li>
                    <li>Cadencia: domingo o fin de mes. No diario.</li>
                  </ol>
                </MrCard>

                <div className="mr-radar-layout">
                  <div className="mr-radar-svg-wrap">
                    <RadarSvg scores={active.scores} />
                  </div>
                  <div>
                    {SELFRADAR_AXES.map((axis) => {
                      const entry = active.scores[axis.id] ?? {
                        score: 0,
                        action: '',
                      };
                      const low = entry.score > 0 && entry.score <= 5;
                      return (
                        <div className="mr-axis-row" key={axis.id}>
                          <div className="mr-axis-label">
                            <span className={`mr-dot mr-dot--${axis.color}`} />
                            {axis.label}
                          </div>
                          <MrScorePills
                            label={axis.label}
                            value={entry.score}
                            onChange={(n) => setScore(axis.id, n)}
                          />
                          <div className="mr-axis-action">
                            <MrField
                              id={`act-${axis.id}`}
                              label={`Acción si bajo: ${axis.label}`}
                              hideLabel
                              value={entry.action}
                              onChange={(v) => setAction(axis.id, v)}
                              placeholder={low ? '1 acción si score ≤5' : '—'}
                              disabled={!low}
                              maxLength={MR_LIMITS.action}
                              showCount={false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {bajos.length > 0 && (
                  <MrCard
                    title="Ejes bajos (≤5) → Calendar"
                    hint="Máx. 3 bloques. No inventar eventos Camila."
                  >
                    <ul className="mr-rules">
                      {bajos.map((a) => (
                        <li key={a.id}>
                          <strong>{a.label}</strong> ({active.scores[a.id].score}
                          /10)
                          {active.scores[a.id].action
                            ? ` — ${active.scores[a.id].action}`
                            : ' — sin acción aún'}
                        </li>
                      ))}
                    </ul>
                  </MrCard>
                )}
              </>
            )}

            {activeTab === 'preguntas' && (
              <>
                <MrCard
                  title="Preguntas × un buen vivir"
                  hint="Estilo p.87 Bullet Ro"
                >
                  <MrField
                    id="q1"
                    as="textarea"
                    label="¿Qué quiero conseguir esta semana que inicia?"
                    value={active.qConseguir}
                    onChange={(v) => patch({ qConseguir: v })}
                    className="mr-field--stack"
                  />
                  <MrField
                    id="q2"
                    as="textarea"
                    label="¿Qué he observado? ¿Qué he sentido?"
                    value={active.qObservado}
                    onChange={(v) => patch({ qObservado: v })}
                    className="mr-field--stack"
                  />
                  <MrField
                    id="q3"
                    as="textarea"
                    label="¿Qué he aprendido? ¿Qué quiero compartir?"
                    value={active.qAprendido}
                    onChange={(v) => patch({ qAprendido: v })}
                    className="mr-field--stack"
                  />
                  <MrField
                    id="q4"
                    as="textarea"
                    label="¿Qué necesito? ¿A quiénes puedo pedir ayuda?"
                    value={active.qNecesito}
                    onChange={(v) => patch({ qNecesito: v })}
                  />
                </MrCard>

                <MrCard title="Reflexiones">
                  <MrField
                    id="ref"
                    as="textarea"
                    label="Anota con color de dominio"
                    value={active.reflexiones}
                    onChange={(v) => patch({ reflexiones: v })}
                    className="mr-field--stack"
                  />
                  <div className="mr-two-col">
                    <MrField
                      id="apr"
                      as="textarea"
                      label="Estoy aprendiendo"
                      value={active.aprendiendo}
                      onChange={(v) => patch({ aprendiendo: v })}
                    />
                    <MrField
                      id="nec"
                      as="textarea"
                      label="Necesito / pedir ayuda"
                      value={active.necesito}
                      onChange={(v) => patch({ necesito: v })}
                    />
                  </div>
                  <MrField
                    id="obs"
                    as="textarea"
                    label="Observo (estabilidad, impulsos, a raya)"
                    value={active.observo}
                    onChange={(v) => patch({ observo: v })}
                    className="mr-field--stack-top"
                  />
                </MrCard>
              </>
            )}

            {activeTab === 'cierre' && (
              <>
                <MrCard title="Qué me ha sacado una sonrisa">
                  <div className="mr-three-col">
                    <MrField
                      id="sp"
                      as="textarea"
                      label={
                        <>
                          <span className="mr-dot mr-dot--rosa" /> Personal / cuerpo
                        </>
                      }
                      value={active.sonrisaPersonal}
                      onChange={(v) => patch({ sonrisaPersonal: v })}
                    />
                    <MrField
                      id="sc"
                      as="textarea"
                      label={
                        <>
                          <span className="mr-dot mr-dot--verde" /> Camila / vínculos
                        </>
                      }
                      value={active.sonrisaCamila}
                      onChange={(v) => patch({ sonrisaCamila: v })}
                    />
                    <MrField
                      id="sl"
                      as="textarea"
                      label={
                        <>
                          <span className="mr-dot mr-dot--naranja" /> Laboral / VN
                        </>
                      }
                      value={active.sonrisaLaboral}
                      onChange={(v) => patch({ sonrisaLaboral: v })}
                    />
                  </div>
                </MrCard>

                <MrCard title="Review semana pasada">
                  <div className="mr-three-col">
                    <MrField
                      id="rp"
                      as="textarea"
                      label="Personal / bienestar"
                      value={active.reviewPersonal}
                      onChange={(v) => patch({ reviewPersonal: v })}
                    />
                    <MrField
                      id="rl"
                      as="textarea"
                      label="VN / trabajo / estudio"
                      value={active.reviewLaboral}
                      onChange={(v) => patch({ reviewLaboral: v })}
                    />
                    <MrField
                      id="rc"
                      as="textarea"
                      label="Camila / juntos"
                      value={active.reviewCamila}
                      onChange={(v) => patch({ reviewCamila: v })}
                    />
                  </div>
                </MrCard>

                <MrCard
                  title="Acciones importantes"
                  hint="1 por eje bajo · máx 3 a Calendar"
                >
                  <div className="mr-three-col">
                    <MrField
                      id="ap"
                      as="textarea"
                      label="Personal ○"
                      value={active.accionesPersonal}
                      onChange={(v) => patch({ accionesPersonal: v })}
                    />
                    <MrField
                      id="al"
                      as="textarea"
                      label="Laboral / $ *"
                      value={active.accionesLaboral}
                      onChange={(v) => patch({ accionesLaboral: v })}
                    />
                    <MrField
                      id="ac"
                      as="textarea"
                      label="Camila / vínculos >"
                      value={active.accionesCamila}
                      onChange={(v) => patch({ accionesCamila: v })}
                    />
                  </div>
                </MrCard>

                <MrCard title="Nota de cierre">
                  <MrField
                    id="nc"
                    as="textarea"
                    label="Lo que falta actualizar"
                    value={active.notaCierre}
                    onChange={(v) => patch({ notaCierre: v })}
                  />
                </MrCard>
              </>
            )}

            {activeTab === 'historial' && (
              <MrCard
                title="Sesiones guardadas"
                hint="localStorage sanitizado · no salen del dispositivo"
              >
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
                        <MrButton
                          onClick={() => {
                            setActiveId(s.id);
                            setTab('radar');
                          }}
                        >
                          Abrir
                        </MrButton>
                      </li>
                    );
                  })}
                </ul>
              </MrCard>
            )}
          </>
        )}
      </MrTabs>

      <p className="mr-privacy">
        Security by design: validación al cargar/guardar, límites de texto, export
        cifrado opcional (AES-GCM), sin red. No diagnosticar desde el score — solo trazar.
      </p>

      <MrConfirmModal
        open={confirmDelete}
        title="Eliminar sesión"
        description="¿Eliminar esta sesión de Selfradar? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={doEliminar}
        onCancel={() => setConfirmDelete(false)}
      />
      <MrExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        payload={active}
        tool="selfradar"
        filenameBase={`selfradar-${active.date || 'sesion'}`}
        preferEncrypted={false}
        onDone={showToast}
        onError={showToast}
      />
      <MrImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        toolLabel="Self Radar"
        onImport={handleImport}
        onError={showToast}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
