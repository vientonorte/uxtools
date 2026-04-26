import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import {
  LINEA_OPTIONS,
  COUNTRY_FLAGS,
  COUNTRY_PHONES,
  UXFLOW_STORAGE_KEY,
  UXFLOW_TEMPLATES_KEY,
} from '../types/uxflow';
import type { FlowModel, FlowStep, Criterion, EdgeCase, UxflowSession, UxflowTemplate } from '../types/uxflow';

/* ─── Parsing helpers ─────────────────────────────────────── */
const COUNTRIES = Object.keys(COUNTRY_FLAGS);

function extractActor(prompt: string): string {
  const m = prompt.match(/(?:usuario|cliente|usuario\s+\w+|investor|ejecutivo)\s+(\w+)/i);
  if (m) return m[0];
  if (/wealth/i.test(prompt)) return 'Cliente Wealth Management';
  if (/corporate/i.test(prompt)) return 'Ejecutivo corporativo';
  if (/investment/i.test(prompt)) return 'Investor';
  return 'Usuario autenticado';
}

function extractGoal(prompt: string): string {
  const m = prompt.match(/(?:quiere?|necesita?|busca?|desea?)\s+(.+?)(?:\.|,|$)/i);
  return m ? m[1].trim() : prompt.trim().slice(0, 80);
}

function inferLinea(prompt: string): string {
  if (/wealth/i.test(prompt)) return 'Wealth Management';
  if (/corporate/i.test(prompt)) return 'Corporate Solutions';
  if (/investment/i.test(prompt)) return 'Investment Management';
  return 'Otro';
}

function inferCountries(prompt: string): string[] {
  const found = COUNTRIES.filter((c) => new RegExp(c, 'i').test(prompt));
  return found.length > 0 ? found : ['Chile'];
}

function detectEdgeCases(prompt: string): EdgeCase[] {
  const cases: EdgeCase[] = [];
  if (/biométr|faceid|touch id/i.test(prompt))
    cases.push({ id: 1, trigger: 'Fallo de biometría', impact: 'alto', mitigation: 'Fallback a PIN/contraseña' });
  if (/sesión|session|token/i.test(prompt))
    cases.push({ id: 2, trigger: 'Sesión expirada', impact: 'medio', mitigation: 'Redirigir al login con mensaje claro' });
  if (/document|pdf|adjunto/i.test(prompt))
    cases.push({ id: 3, trigger: 'Error de carga de documento', impact: 'alto', mitigation: 'Reintentar con feedback visual' });
  if (/conexión|offline|red/i.test(prompt))
    cases.push({ id: 4, trigger: 'Sin conexión a internet', impact: 'alto', mitigation: 'Modo offline con caché y banner de estado' });
  if (/celular|phone|sms|otp/i.test(prompt))
    cases.push({ id: 5, trigger: 'Número de teléfono null o inválido', impact: 'medio', mitigation: 'Mostrar lista de países disponibles; Perú sin formato definido' });
  if (cases.length === 0)
    cases.push({ id: 1, trigger: 'Error de validación de datos', impact: 'medio', mitigation: 'Mensajes inline con foco en el campo incorrecto' });
  return cases;
}

function detectSteps(prompt: string, actor: string, linea: string): FlowStep[] {
  const steps: FlowStep[] = [
    { id: 1, actor, action: `Accede a la funcionalidad de ${extractGoal(prompt)}`, channel: 'Web / App móvil', decision: 'Autenticado' },
    { id: 2, actor: 'Sistema', action: 'Valida sesión activa y permisos', channel: 'Backend', decision: 'Sesión válida → continúa; Expirada → login' },
    { id: 3, actor, action: 'Completa formulario o selección requerida', channel: 'UI', decision: 'Datos válidos' },
    { id: 4, actor: 'Sistema', action: `Procesa solicitud en plataforma ${linea}`, channel: 'API', decision: 'Exitoso → confirmación; Error → rollback' },
    { id: 5, actor, action: 'Recibe confirmación y puede descargar o exportar', channel: 'UI / Email', decision: 'Fin del flujo' },
  ];

  if (/docum|pdf|adjunt/i.test(prompt)) {
    steps.splice(3, 0, {
      id: 35,
      actor,
      action: 'Adjunta documentos requeridos',
      channel: 'UI — file upload',
      decision: 'Formato válido (PDF, JPG ≤ 10MB)',
    });
  }
  if (/otp|sms|2fa/i.test(prompt)) {
    steps.splice(2, 0, {
      id: 25,
      actor,
      action: 'Ingresa código OTP recibido por SMS',
      channel: 'App móvil',
      decision: 'Código válido → continúa; Expirado → reenviar',
    });
  }

  return steps.map((s, i) => ({ ...s, id: i + 1 }));
}

function buildCriteria(prompt: string, linea: string): Criterion[] {
  const base: Criterion[] = [
    { id: 1, category: 'Funcional', description: `El flujo completo se ejecuta sin errores en plataforma ${linea}` },
    { id: 2, category: 'Accesibilidad', description: 'WCAG 2.2 AA: foco visible, etiquetas ARIA, contraste ≥ 4.5:1' },
    { id: 3, category: 'Performance', description: 'Carga inicial < 3s en 4G; LCP < 2.5s' },
    { id: 4, category: 'UX', description: 'Tiempo en tarea ≤ 5 min para usuario objetivo; tasa de error < 5%' },
  ];
  if (/mobil|cel/i.test(prompt))
    base.push({ id: 5, category: 'Mobile', description: 'Touch targets ≥ 44px; funcional desde 360px sin scroll horizontal' });
  if (/segur|auth|login/i.test(prompt))
    base.push({ id: 6, category: 'Seguridad', description: 'Tokens de sesión con expiración; sin datos sensibles en localStorage' });
  return base;
}

function buildFlowModel(prompt: string): FlowModel {
  const actor = extractActor(prompt);
  const goal = extractGoal(prompt);
  const linea = inferLinea(prompt);
  const countries = inferCountries(prompt);
  const steps = detectSteps(prompt, actor, linea);
  const criteria = buildCriteria(prompt, linea);
  const edgeCases = detectEdgeCases(prompt);
  return { actor, goal, linea, countries, steps, criteria, edgeCases };
}

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

/* ─── Main UxFlow page ────────────────────────────────────── */
export default function UxFlow() {
  const [sessions, setSessions] = useLocalStorage<UxflowSession[]>(UXFLOW_STORAGE_KEY, []);
  const [templates, setTemplates] = useLocalStorage<UxflowTemplate[]>(UXFLOW_TEMPLATES_KEY, []);
  const { showToast, toasts, dismissToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [titulo, setTitulo] = useState('');
  const [linea, setLinea] = useState<string>(LINEA_OPTIONS[0]);
  const [currentFlow, setCurrentFlow] = useState<FlowModel | null>(null);
  const [view, setView] = useState<'form' | 'result' | 'history'>('form');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleGenerar = () => {
    if (!prompt.trim()) { showToast('Escribe un prompt para generar el flujo.'); return; }
    const flow = buildFlowModel(prompt);
    flow.linea = linea;
    setCurrentFlow(flow);
    setView('result');
  };

  const handleGuardar = () => {
    if (!currentFlow) return;
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    const session: UxflowSession = {
      id: now.getTime(),
      titulo: titulo.trim() || extractGoal(prompt).slice(0, 60),
      linea,
      fecha,
      prompt,
      flow: currentFlow,
    };
    setSessions((prev) => [session, ...prev]);
    showToast('✓ Documento UXFlow guardado');
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
    if (t) { setPrompt(t.prompt); setSelectedTemplate(''); }
  };

  const handleLoadSession = (s: UxflowSession) => {
    setCurrentFlow(s.flow);
    setTitulo(s.titulo);
    setLinea(s.linea);
    setPrompt(s.prompt);
    setView('result');
  };

  return (
    <main className="uxflow-main" id="main" tabIndex={-1}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="uxflow-header">
        <div>
          <h1 className="uxflow-title">UXFLOW — Auto-Doc Engine</h1>
          <p className="uxflow-sub">Describe el flujo en lenguaje natural y genera documentación técnica UX lista para QA y Figma.</p>
        </div>
        <div className="uxflow-header-actions">
          <button
            className={`tab-pill${view === 'form' || view === 'result' ? ' active' : ''}`}
            onClick={() => setView('form')}
            type="button"
          >
            Nuevo flujo
          </button>
          <button
            className={`tab-pill${view === 'history' ? ' active' : ''}`}
            onClick={() => setView('history')}
            type="button"
          >
            Historial ({sessions.length})
          </button>
        </div>
      </div>

      {(view === 'form' || view === 'result') && (
        <div className="uxflow-body">
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
              <label htmlFor="ux-prompt" className="form-label">Prompt del flujo *</label>
              <textarea
                id="ux-prompt"
                className="form-input form-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: Un cliente Wealth Management en Chile quiere completar su onboarding digital con validación biométrica y firma electrónica de documentos PDF..."
                rows={6}
              />
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
                <div className="form-actions-row" style={{ marginTop: 16 }}>
                  <button className="btn-cyan" onClick={handleGuardar} type="button">
                    💾 Guardar documento
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
      )}

      {view === 'history' && (
        <div className="uxflow-history">
          {sessions.length === 0 ? (
            <div className="flow-empty">
              <p>Sin documentos guardados aún.</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="history-item">
                <div className="history-item-body">
                  <strong>{s.titulo}</strong>
                  <span className="historial-meta">{s.linea} · {s.fecha}</span>
                </div>
                <div className="history-item-actions">
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => handleLoadSession(s)}
                    type="button"
                  >
                    Ver →
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                    type="button"
                    aria-label={`Eliminar ${s.titulo}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
