import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { buildFlowModel, extractGoal } from '../lib/uxflow-engine';
import {
  loadUxflowSessions,
  persistUxflowSessions,
  nextUxflowSessionId,
  UXFLOW_HISTORY_LIMIT,
} from '../lib/uxflow-storage';
import {
  LINEA_OPTIONS,
  COUNTRY_FLAGS,
  COUNTRY_PHONES,
  UXFLOW_TEMPLATES_KEY,
} from '../types/uxflow';
import type { FlowModel, UxflowSession, UxflowTemplate } from '../types/uxflow';

const STATIC_UXFLOW_URL = 'uxflow.html#historial';
const UXFLOW_SCREENSHOT_MAX_DIM = 1200;

/* ─── Flow Document component ─────────────────────────────── */
function FlowDocument({ flow, titulo }: { flow: FlowModel; titulo: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'criteria' | 'analytics'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'flow' as const, label: `Flujo (${flow.steps.length})` },
    { id: 'criteria' as const, label: `Criterios (${flow.criteria.length})` },
    { id: 'analytics' as const, label: `Edge Cases (${flow.edgeCases.length})` },
  ];

  return (
    <div className="flow-doc">
      <div className="flow-doc-header">
        <h2 className="flow-doc-title">{titulo}</h2>
        <div className="flow-doc-meta">
          <span className="flow-linea">{flow.linea}</span>
          {flow.countries.map((c) => (
            <span key={c} className="flow-country">{COUNTRY_FLAGS[c]} {c}</span>
          ))}
        </div>
      </div>

      <div className="flow-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`flow-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tabs.find((t) => t.id === activeTab)?.label}>
        {activeTab === 'overview' && (
          <div className="flow-overview">
            <div className="flow-overview-grid">
              <div className="flow-kv">
                <span className="flow-kv-label">Actor principal</span>
                <span className="flow-kv-value">{flow.actor}</span>
              </div>
              <div className="flow-kv">
                <span className="flow-kv-label">Objetivo</span>
                <span className="flow-kv-value">{flow.goal}</span>
              </div>
              <div className="flow-kv">
                <span className="flow-kv-label">Línea de negocio</span>
                <span className="flow-kv-value">{flow.linea}</span>
              </div>
              <div className="flow-kv">
                <span className="flow-kv-label">Países</span>
                <span className="flow-kv-value">
                  {flow.countries.map((c) => `${COUNTRY_FLAGS[c]} ${c}`).join(' · ')}
                </span>
              </div>
              <div className="flow-kv">
                <span className="flow-kv-label">Pasos</span>
                <span className="flow-kv-value">{flow.steps.length}</span>
              </div>
              <div className="flow-kv">
                <span className="flow-kv-label">Edge cases</span>
                <span className="flow-kv-value">{flow.edgeCases.length}</span>
              </div>
            </div>
            {COUNTRY_PHONES[flow.countries[0]] === null && (
              <div className="flow-alert">
                ⚠ El país seleccionado ({flow.countries[0]}) no tiene formato de teléfono definido — manejar como edge case.
              </div>
            )}
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="flow-steps">
            <table className="flow-table" aria-label="Pasos del flujo">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Actor</th>
                  <th>Acción</th>
                  <th>Canal</th>
                  <th>Decisión / Condición</th>
                </tr>
              </thead>
              <tbody>
                {flow.steps.map((step) => (
                  <tr key={step.id}>
                    <td><span className="step-num">{step.id}</span></td>
                    <td><span className={`step-actor ${step.actor === 'Sistema' ? 'sistema' : 'user'}`}>{step.actor}</span></td>
                    <td>{step.action}</td>
                    <td><span className="step-channel">{step.channel}</span></td>
                    <td className="step-decision">{step.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'criteria' && (
          <div className="flow-criteria">
            <table className="flow-table" aria-label="Criterios de aceptación">
              <thead>
                <tr><th>Categoría</th><th>Criterio</th></tr>
              </thead>
              <tbody>
                {flow.criteria.map((c) => (
                  <tr key={c.id}>
                    <td><span className="criterion-cat">{c.category}</span></td>
                    <td>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flow-edge-cases">
            {flow.edgeCases.map((ec) => (
              <div key={ec.id} className={`edge-case impact-${ec.impact}`}>
                <div className="edge-case-header">
                  <strong>{ec.trigger}</strong>
                  <span className={`impact-badge ${ec.impact}`}>{ec.impact.toUpperCase()}</span>
                </div>
                <p className="edge-case-mitigation">Mitigación: {ec.mitigation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryGrid({
  sessions,
  onLoad,
  onDelete,
}: {
  sessions: UxflowSession[];
  onLoad: (s: UxflowSession) => void;
  onDelete: (id: number) => void;
}) {
  if (!sessions.length) {
    return (
      <div className="empty-history">
        Sin activos guardados aún. Genera y guarda tu primer documento.
      </div>
    );
  }

  return (
    <>
      {sessions.map((s) => {
        const steps = s.flow?.steps?.length ?? 0;
        const edgeCases = s.flow?.edgeCases?.length ?? 0;
        return (
          <div key={s.id} className="history-card-wrap">
            <button
              type="button"
              className="history-card"
              onClick={() => onLoad(s)}
              title={`Cargar: ${s.titulo}`}
            >
              <div className="history-card-title">{s.titulo}</div>
              <div className="history-card-date">{s.linea} · {s.fecha}</div>
              <div className="history-card-meta">
                <span className="history-chip">{steps} pasos</span>
                <span className="history-chip">{edgeCases} casos borde</span>
                {s.screenshot && <span className="history-chip">📷 captura</span>}
              </div>
            </button>
            <button
              type="button"
              className="history-card-delete"
              onClick={() => onDelete(s.id)}
              aria-label={`Eliminar ${s.titulo}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}

/* ─── Main UxFlow page ────────────────────────────────────── */
export default function UxFlow() {
  const [sessions, setSessions] = useState<UxflowSession[]>(() => loadUxflowSessions());
  const [templates, setTemplates] = useLocalStorage<UxflowTemplate[]>(UXFLOW_TEMPLATES_KEY, []);
  const { showToast, toasts, dismissToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [titulo, setTitulo] = useState('');
  const [linea, setLinea] = useState<string>(LINEA_OPTIONS[0]);
  const [paises, setPaises] = useState('Chile, Colombia, México, Perú');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentFlow, setCurrentFlow] = useState<FlowModel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const updateSessions = (next: UxflowSession[]) => {
    const capped = next.slice(0, UXFLOW_HISTORY_LIMIT);
    setSessions(capped);
    persistUxflowSessions(capped);
  };

  const handleGenerar = () => {
    if (!prompt.trim()) {
      showToast('Escribe un prompt para generar el flujo.');
      return;
    }
    const flow = buildFlowModel(prompt, linea, paises);
    setCurrentFlow(flow);
    showToast('⚡ Documentación generada');
  };

  const handleGuardar = () => {
    if (!currentFlow) return;
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    const session: UxflowSession = {
      id: nextUxflowSessionId(sessions),
      titulo: titulo.trim() || extractGoal(prompt).slice(0, 60),
      linea: currentFlow.linea,
      fecha,
      prompt,
      paises,
      screenshot,
      flow: currentFlow,
    };
    updateSessions([session, ...sessions]);
    showToast('💾 Activo guardado en historial');
  };

  const handleGuardarTemplate = () => {
    if (!prompt.trim()) return;
    const t: UxflowTemplate = {
      id: Date.now(),
      nombre: titulo.trim() || `Template ${templates.length + 1}`,
      prompt,
      fecha: new Date().toLocaleDateString('es-CL'),
    };
    setTemplates((prev) => [t, ...prev]);
    showToast('✓ Template guardado');
  };

  const handleLoadTemplate = (id: string) => {
    const t = templates.find((x) => String(x.id) === id);
    if (t) {
      setPrompt(t.prompt);
      setSelectedTemplate('');
    }
  };

  const handleLoadSession = (s: UxflowSession) => {
    setCurrentFlow(s.flow);
    setTitulo(s.titulo);
    setLinea(s.linea);
    setPrompt(s.prompt);
    setPaises(s.paises ?? s.flow.countries.join(', '));
    setScreenshot(s.screenshot ?? null);
    showToast(`📂 Flujo restaurado: ${s.titulo}`);
    document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScreenshot = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, UXFLOW_SCREENSHOT_MAX_DIM / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setScreenshot(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const scrollToHistorial = () => {
    document.getElementById('historial')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="uxflow-main" id="main" tabIndex={-1}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="uxflow-mode-banner" role="note">
        <span>
          <strong>UXFLOW React</strong> — editor rápido integrado en el hub.
          Comparte historial con la versión estática.
        </span>
        <a className="uxflow-mode-link" href={STATIC_UXFLOW_URL}>
          Abrir editor completo (PNG/PDF) →
        </a>
      </div>

      <div className="uxflow-header">
        <div>
          <h1 className="uxflow-title">UXFLOW — Auto-Doc Engine</h1>
          <p className="uxflow-sub">
            Describe el flujo en lenguaje natural y genera documentación técnica UX lista para QA y Figma.
          </p>
        </div>
        <div className="uxflow-header-actions">
          <button className="tab-pill active" type="button">
            Nuevo flujo
          </button>
          <button className="tab-pill" onClick={scrollToHistorial} type="button">
            Historial ({sessions.length})
          </button>
        </div>
      </div>

      <div className="uxflow-body" id="editor">
        <div className="uxflow-form-col">
          <div className="form-group">
            <label htmlFor="ux-titulo" className="form-label">Título del documento</label>
            <input
              id="ux-titulo"
              type="text"
              className="form-input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Onboarding Investor Digital"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ux-linea" className="form-label">Línea de negocio</label>
            <select
              id="ux-linea"
              className="form-input"
              value={linea}
              onChange={(e) => setLinea(e.target.value)}
            >
              {LINEA_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ux-paises" className="form-label">Países activos (separados por coma)</label>
            <input
              id="ux-paises"
              type="text"
              className="form-input"
              value={paises}
              onChange={(e) => setPaises(e.target.value)}
              placeholder="Chile, Colombia, México"
            />
          </div>

          {templates.length > 0 && (
            <div className="form-group">
              <label htmlFor="ux-template" className="form-label">Cargar template</label>
              <select
                id="ux-template"
                className="form-input"
                value={selectedTemplate}
                onChange={(e) => { setSelectedTemplate(e.target.value); handleLoadTemplate(e.target.value); }}
              >
                <option value="">— seleccionar —</option>
                {templates.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="ux-prompt" className="form-label">Criterios de aceptación (prompt) *</label>
            <textarea
              id="ux-prompt"
              className="form-input form-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Yo como negocio quiero actualizar la presentación del contacto filtrando por línea de negocio y país..."
              rows={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ux-screenshot" className="form-label">Captura de pantalla del flujo</label>
            <input
              id="ux-screenshot"
              type="file"
              accept="image/*"
              className="form-input"
              onChange={(e) => handleScreenshot(e.target.files?.[0])}
            />
            {screenshot && (
              <div className="uxflow-screenshot-preview">
                <img src={screenshot} alt="Vista previa de captura del flujo" />
                <button type="button" className="btn-outline btn-sm" onClick={() => setScreenshot(null)}>
                  Quitar captura
                </button>
              </div>
            )}
          </div>

          <div className="form-actions-row">
            <button className="btn-cyan" onClick={handleGenerar} type="button">
              ⚡ Generar documentación
            </button>
            <button className="btn-outline btn-sm" onClick={handleGuardarTemplate} type="button">
              Guardar como template
            </button>
          </div>
        </div>

        <div className="uxflow-result-col">
          {currentFlow ? (
            <>
              <FlowDocument flow={currentFlow} titulo={titulo || extractGoal(prompt)} />
              {screenshot && (
                <div className="uxflow-screenshot-display">
                  <img src={screenshot} alt="Captura adjunta al documento" />
                </div>
              )}
              <div className="form-actions-row" style={{ marginTop: 16 }}>
                <button className="btn-cyan" onClick={handleGuardar} type="button">
                  💾 Guardar en historial
                </button>
              </div>
            </>
          ) : (
            <div className="flow-empty">
              <div className="flow-empty-icon" aria-hidden="true">⚡</div>
              <p>Describe el flujo y presiona <strong>Generar documentación</strong>.</p>
            </div>
          )}
        </div>
      </div>

      <section className="history-section" id="historial" aria-labelledby="historial-heading">
        <div className="history-label" id="historial-heading">
          Historial de activos
          <span className="history-shared-note">compartido con uxflow.html</span>
        </div>
        <div className="history-grid">
          <HistoryGrid
            sessions={sessions}
            onLoad={handleLoadSession}
            onDelete={(id) => {
              updateSessions(sessions.filter((s) => s.id !== id));
              showToast('🗑 Documento eliminado');
            }}
          />
        </div>
      </section>
    </main>
  );
}