import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BENCHMARK_STORAGE_KEY, DIMENSIONES_DEFAULT } from '../types/benchmark';
import type { BenchmarkState, BenchmarkSession } from '../types/benchmark';
import { loadUxflowSessions } from '../lib/uxflow-storage';
import type { UxflowSession } from '../types/uxflow';
import {
  loadKitTlpSessions,
  loadSelfradarSessions,
} from '../lib/metodo-ro-storage';
import type { KitTlpSession, SelfradarSession } from '../types/metodo-ro';
import { isOnboardDone } from '../lib/onboarding-storage';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function greeting() {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const now = new Date();
  return `${saludo} · ${dias[now.getDay()]} ${now.getDate()} ${meses[now.getMonth()]}`;
}

interface ActivityItem {
  id: number;
  type: 'bm' | 'uxf';
  title: string;
  sub: string;
  date: string;
}

interface RecentArtifact {
  id: string;
  sort: number;
  type: 'bm' | 'uxf' | 'sr' | 'tlp';
  title: string;
  subtitle: string;
  date: string;
  score: string;
  meta: string;
  href: string;
}

function summarizeBm(session: BenchmarkSession): RecentArtifact {
  const dims = Array.isArray(session.dimensiones) ? session.dimensiones : DIMENSIONES_DEFAULT;
  const prods = Array.isArray(session.productos) ? session.productos : [];
  const maxScore = dims.length * 5;
  let leaderName = 'Sin datos';
  let leaderTotal = 0;
  prods.forEach((p) => {
    const total = dims.reduce((acc, dim) => {
      const entry = session.scores?.[dim.id]?.[String(p.id)];
      return acc + (entry ? (entry.val ?? 0) : 0);
    }, 0);
    if (total >= leaderTotal) { leaderTotal = total; leaderName = p.nombre; }
  });
  return {
    id: `bm-${session.id}`,
    sort: session.id,
    type: 'bm',
    title: session.nombre || 'Benchmark sin título',
    subtitle: session.analista ? `Analista: ${session.analista}` : 'Benchmark',
    date: session.fecha || '',
    score: leaderTotal && maxScore ? `${leaderTotal}/${maxScore}` : `${prods.length} productos`,
    meta: leaderName,
    href: '/benchmark',
  };
}

function summarizeUxf(session: UxflowSession): RecentArtifact {
  const steps = Array.isArray(session.flow?.steps) ? session.flow.steps.length : 0;
  const edgeCases = Array.isArray(session.flow?.edgeCases) ? session.flow.edgeCases.length : 0;
  return {
    id: `uxf-${session.id}`,
    sort: session.id,
    type: 'uxf',
    title: session.titulo || 'Documento UXFlow',
    subtitle: session.linea || 'UXFlow',
    date: session.fecha || '',
    score: steps ? `${steps} pasos` : 'Documento',
    meta: edgeCases ? `${edgeCases} casos borde` : 'Sin casos borde',
    href: '/uxflow',
  };
}

function isLiveSelfradar(s: SelfradarSession): boolean {
  return Object.values(s.scores).some((x) => x.score > 0) || s.qConseguir.trim().length > 0;
}

function isLiveKit(s: KitTlpSession): boolean {
  return s.sucedio.trim().length > 0 || s.intensity > 0;
}

function summarizeSr(session: SelfradarSession): RecentArtifact {
  return {
    id: session.id,
    sort: session.updatedAt || session.createdAt,
    type: 'sr',
    title: `Self Radar · ${session.date || 'sesión'}`,
    subtitle: 'Método Ro',
    date: session.date || '',
    score: 'Radar',
    meta: 'local',
    href: '/selfradar',
  };
}

function summarizeTlp(session: KitTlpSession): RecentArtifact {
  return {
    id: session.id,
    sort: session.updatedAt || session.createdAt,
    type: 'tlp',
    title: `Kit TLP · ${session.date || 'sesión'}`,
    subtitle: 'Método Ro',
    date: session.date || '',
    score: session.intensity ? `${session.intensity}/10` : 'TLP',
    meta: 'local',
    href: '/kit-tlp',
  };
}

export default function Dashboard() {
  const bmState = readStorage<BenchmarkState>(BENCHMARK_STORAGE_KEY, {
    paso: 1, config: { nombre: '', analista: '' }, productos: [], scores: {}, notas: {}, historial: [],
  });
  const uxList = loadUxflowSessions();

  const bmSessions = Array.isArray(bmState.historial) ? bmState.historial : [];
  const lastAnalista = bmState.config?.analista ||
    (bmSessions[0]?.analista ?? '—');

  const activity: ActivityItem[] = [
    ...bmSessions.map((h) => ({
      id: h.id, type: 'bm' as const,
      title: h.nombre || 'Benchmark sin título',
      sub: h.analista ? `Analista: ${h.analista}` : 'Benchmark',
      date: h.fecha || '',
    })),
    ...uxList.map((h) => ({
      id: h.id, type: 'uxf' as const,
      title: h.titulo || 'Documento UXFlow',
      sub: h.linea || 'UXFlow',
      date: h.fecha || '',
    })),
  ].sort((a, b) => b.id - a.id).slice(0, 10);

  const recents: RecentArtifact[] = [
    ...bmSessions.map(summarizeBm),
    ...uxList.map(summarizeUxf),
    ...loadSelfradarSessions().filter(isLiveSelfradar).map(summarizeSr),
    ...loadKitTlpSessions().filter(isLiveKit).map(summarizeTlp),
  ]
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 5);

  const [query, setQuery] = useState('');
  const moduleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!moduleRef.current) return;
    moduleRef.current.querySelectorAll<HTMLElement>('.module-card').forEach((card) => {
      card.style.opacity = !q || card.textContent?.toLowerCase().includes(q) ? '' : '0.3';
    });
  }, [query]);

  // Fade-up observer
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.fade-up');
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
      els.forEach((el) => obs.observe(el));
      return () => obs.disconnect();
    } else {
      els.forEach((el) => el.classList.add('visible'));
    }
  }, []);

  const bmMeta = bmSessions.length > 0 ? `Último: ${bmSessions[0].fecha}` : '';
  const uxMeta = uxList.length > 0 ? `Último: ${uxList[0].fecha}` : '';

  return (
    <>
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-greeting-col">
            <div className="dash-eyebrow">UX Tools Suite · vientonorte</div>
            <h1 className="dash-title">{greeting()}</h1>
            <p className="dash-sub">
              Hub de instrumentos UX: benchmark comparativo, documentación automatizada de flujos y gestión de contenido.
            </p>
          </div>
          <div className="dash-search-col">
            <div className="dash-search" role="search" aria-label="Búsqueda de módulos">
              <span className="dash-search-icon" aria-hidden="true">⌕</span>
              <input
                type="text"
                className="dash-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar módulo o sesión…"
                autoComplete="off"
                aria-label="Buscar módulo o sesión"
              />
            </div>
          </div>
        </div>

        <div className="kpi-row" role="list" aria-label="Métricas del sistema">
          <div className="kpi-card" role="listitem">
            <div className="kpi-value">{bmSessions.length}</div>
            <div className="kpi-label">Benchmarks guardados</div>
          </div>
          <div className="kpi-card" role="listitem">
            <div className="kpi-value">{uxList.length}</div>
            <div className="kpi-label">Documentos UXFlow</div>
          </div>
          <div className="kpi-card" role="listitem">
            <div className="kpi-value">
              {lastAnalista.length > 12 ? lastAnalista.slice(0, 12) + '…' : lastAnalista}
            </div>
            <div className="kpi-label">Último analista</div>
          </div>
          <div className="kpi-card kpi-status" role="listitem">
            <div className="kpi-value">
              <span className="kpi-live-dot" aria-hidden="true" /> LIVE
            </div>
            <div className="kpi-label">Estado del sistema</div>
          </div>
        </div>
      </header>

      <main className="dash-main" id="main" tabIndex={-1}>
        <article className="workspace-card workspace-card-primary fade-up dash-sprint" id="mod-sprint">
          <div className="workspace-card-top">
            <div className="workspace-icon" aria-hidden="true">✦</div>
            <span className="workspace-badge">DESIGN SPRINT VN</span>
          </div>
          <h2 className="workspace-title">Juega el sprint. Aprende la suite.</h2>
          <p className="workspace-desc">
            Cinco días: Map → Sketch → Decide → Prototype → Test. Cada día desbloquea
            una herramienta de este hub (Benchmark, UXFlow, DX, VOC, PoliRadar).
          </p>
          <div className="workspace-actions">
            <Link className="workspace-action primary" to="/onboarding">
              {isOnboardDone() ? 'Volver a jugar el sprint' : 'Empezar onboarding'}
            </Link>
            <Link className="workspace-action ghost" to="/poliradar">
              PoliRadar
            </Link>
          </div>
        </article>

        <div className="dash-section-label fade-up">Instrumentos UX</div>

        <div className="modules-grid fade-up delay-1" ref={moduleRef}>
          <article className="module-card" id="mod-onboarding">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">✦</div>
                <span className="badge badge-live module-badge">DS VN</span>
              </div>
              <h2 className="module-title">Onboarding · Sprint</h2>
              <p className="module-desc">
                Design Sprint VN gamificado: Map → Sketch → Decide → Prototype → Test.
                Explica el hub live (Benchmark, UXFlow, DX, VOC, PoliRadar).
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">🧭</span>5 días · 8 herramientas
                </span>
              </div>
              <div className="module-tags" aria-label="Funciones">
                <span className="mod-tag">Design Sprint</span>
                <span className="mod-tag">VOC</span>
                <span className="mod-tag">PoliRadar</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/onboarding">Jugar sprint →</Link>
              <Link className="btn-module-ghost" to="/poliradar">PoliRadar</Link>
            </div>
          </article>

          {/* Benchmark */}
          <article className="module-card" id="mod-benchmark">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">📊</div>
                <span className="badge badge-live module-badge">LIVE</span>
              </div>
              <h2 className="module-title">UX Benchmark</h2>
              <p className="module-desc">
                Análisis comparativo de experiencia de usuario. Evalúa patrones de diseño, métricas de usabilidad y buenas prácticas del mercado financiero.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">💾</span>
                  {bmSessions.length} {bmSessions.length === 1 ? 'sesión' : 'sesiones'}
                </span>
                {bmMeta && (
                  <>
                    <span className="module-meta-sep" aria-hidden="true">·</span>
                    <span className="module-meta-item">
                      <span className="module-meta-icon">🕐</span>{bmMeta}
                    </span>
                  </>
                )}
              </div>
              <div className="module-tags" aria-label="Tecnologías">
                <span className="mod-tag">UX Research</span>
                <span className="mod-tag">Figma</span>
                <span className="mod-tag">PDF Export</span>
                <span className="mod-tag">Screenshots</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/benchmark">Abrir Benchmark →</Link>
              <a className="btn-module-ghost" href="https://touch-swirl-23494733.figma.site" target="_blank" rel="noopener noreferrer">Figma ↗</a>
            </div>
          </article>

          {/* UXFlow */}
          <article className="module-card" id="mod-uxflow">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">⚡</div>
                <span className="badge badge-live module-badge">LIVE</span>
              </div>
              <h2 className="module-title">UXFLOW — Auto-Doc Engine</h2>
              <p className="module-desc">
                Motor de documentación técnica UX asistida: interpreta prompts, propone pasos, decisiones, criterios de aceptación y deja un artefacto editable listo para QA y Figma.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">💾</span>
                  {uxList.length} {uxList.length === 1 ? 'documento' : 'documentos'}
                </span>
                {uxMeta && (
                  <>
                    <span className="module-meta-sep" aria-hidden="true">·</span>
                    <span className="module-meta-item">
                      <span className="module-meta-icon">🕐</span>{uxMeta}
                    </span>
                  </>
                )}
              </div>
              <div className="module-tags" aria-label="Tecnologías">
                <span className="mod-tag">React</span>
                <span className="mod-tag">localStorage</span>
                <span className="mod-tag">PDF Export</span>
                <span className="mod-tag">vientonorte</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/uxflow">Abrir UXFLOW →</Link>
              <a className="btn-module-ghost" href="uxflow.html#historial">Editor completo ↗</a>
            </div>
          </article>

          {/* Brief */}
          <article className="module-card" id="mod-brief">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">📣</div>
                <span className="badge badge-live module-badge">NUEVO</span>
              </div>
              <h2 className="module-title">Brief de Campaña</h2>
              <p className="module-desc">
                Genera briefs para Instagram con proyección matemática de ingresos según precio, capacidad de servicio, fechas y presupuesto de pauta.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">📊</span>Proyección · ROI · Alcance estimado
                </span>
              </div>
              <div className="module-tags" aria-label="Funciones">
                <span className="mod-tag">Instagram Ads</span>
                <span className="mod-tag">ROI</span>
                <span className="mod-tag">Ingresos</span>
                <span className="mod-tag">Export</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/brief">Abrir Brief →</Link>
            </div>
          </article>

          {/* Admin */}
          <article className="module-card module-card-admin" id="mod-admin">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">⚙️</div>
                <span className="badge badge-admin module-badge">ADMIN</span>
              </div>
              <h2 className="module-title">Content Manager</h2>
              <p className="module-desc">
                Gestiona dimensiones de benchmark, templates de UXFlow, sesiones guardadas y exporta datos en CSV o JSON.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">🗂</span>Dimensiones · Templates · Datos
                </span>
              </div>
              <div className="module-tags" aria-label="Funciones">
                <span className="mod-tag">CRUD</span>
                <span className="mod-tag">CSV Export</span>
                <span className="mod-tag">JSON Export</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/admin">Abrir Admin →</Link>
            </div>
          </article>

          {/* Self Radar · Método Ro */}
          <article className="module-card" id="mod-selfradar">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">◎</div>
                <span className="badge badge-live module-badge">MÉTODO RO</span>
              </div>
              <h2 className="module-title">Self Radar</h2>
              <p className="module-desc">
                Review semanal Método Ro: 7 ejes fijos (1–10), preguntas de buen vivir, sonrisas, review y máx. 3 acciones a Calendar. Clave A · localStorage.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">📅</span>Cadencia semanal · no diario
                </span>
              </div>
              <div className="module-tags" aria-label="Funciones">
                <span className="mod-tag">Radar</span>
                <span className="mod-tag">Clave A</span>
                <span className="mod-tag">localStorage</span>
                <span className="mod-tag">Print</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/selfradar">Abrir Self Radar →</Link>
              <Link className="btn-module-ghost" to="/kit-tlp">Kit TLP</Link>
            </div>
          </article>

          {/* Kit TLP · Método Ro */}
          <article className="module-card" id="mod-kit-tlp">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">⏸</div>
                <span className="badge badge-live module-badge">MÉTODO RO</span>
              </div>
              <h2 className="module-title">Kit TLP</h2>
              <p className="module-desc">
                Protocolo DBT/TCC en crisis: 8 pasos (hechos → STOP → coping → ayuda). Sin diagnóstico. 100% local, export JSON e imprimible.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">🛑</span>STOP · Respira · Observa · Procesa
                </span>
              </div>
              <div className="module-tags" aria-label="Funciones">
                <span className="mod-tag">DBT</span>
                <span className="mod-tag">TCC</span>
                <span className="mod-tag">localStorage</span>
                <span className="mod-tag">Print</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/kit-tlp">Abrir Kit TLP →</Link>
              <Link className="btn-module-ghost" to="/selfradar">Self Radar</Link>
            </div>
          </article>

          {/* PoliRadar · RADAR El Polijuego · Método Ro */}
          <article className="module-card" id="mod-polijuego">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">🃏</div>
                <span className="badge badge-live module-badge">MÉTODO RO</span>
              </div>
              <h2 className="module-title">PoliRadar</h2>
              <p className="module-desc">
                RADAR · El Polijuego. Facilitación de vínculos éticos (pareja / grupo).
                Ciclo Rev → Aco → Deb → Acc → Rec. Pantalla completa y QR para compartir.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">◎</span>Pareja · Grupo · Self Radar
                </span>
              </div>
              <div className="module-tags" aria-label="Funciones">
                <span className="mod-tag">PoliRadar</span>
                <span className="mod-tag">Fullscreen</span>
                <span className="mod-tag">QR</span>
                <span className="mod-tag">Open Source</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/poliradar">Abrir PoliRadar →</Link>
              <Link className="btn-module-ghost" to="/selfradar">Self Radar</Link>
            </div>
          </article>

          {/* ID Medicinal */}
          <article className="module-card" id="mod-medicinal">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">🌿</div>
                <span className="badge badge-live module-badge">PERSONAL</span>
              </div>
              <h2 className="module-title">ID Medicinal</h2>
              <p className="module-desc">
                Carnet digital de paciente medicinal de cannabis bajo Ley 20.000. Accesible, privado y offline — tus datos nunca salen de tu dispositivo.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">🔒</span>100% local · Sin servidores
                </span>
              </div>
              <div className="module-tags" aria-label="Características">
                <span className="mod-tag">Ley 20.000</span>
                <span className="mod-tag">QR</span>
                <span className="mod-tag">Privacidad</span>
                <span className="mod-tag">Imprimible</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/medicinal">Abrir ID Medicinal →</Link>
            </div>
          </article>

          {/* VOC */}
          <article className="module-card" id="mod-voc">
            <div className="module-card-inner">
              <div className="module-top">
                <div className="module-icon-wrap" aria-hidden="true">✦</div>
                <span className="badge badge-live module-badge">LIVE</span>
              </div>
              <h2 className="module-title">Mapa Vocacional</h2>
              <p className="module-desc">
                Exploración vocacional interactiva con inferencia semántica local. Diseñado para Martina: 8 preguntas que mapean caminos profesionales según afinidades personales.
              </p>
              <div className="module-meta">
                <span className="module-meta-item">
                  <span className="module-meta-icon">🧭</span>8 preguntas · 24 áreas vocacionales
                </span>
              </div>
              <div className="module-tags" aria-label="Tecnologías">
                <span className="mod-tag">Semántico</span>
                <span className="mod-tag">localStorage</span>
                <span className="mod-tag">PDF Export</span>
                <span className="mod-tag">Offline</span>
              </div>
            </div>
            <div className="module-card-footer">
              <a className="btn-module-open" href="voc.html">Abrir Mapa →</a>
              <a className="btn-module-ghost" href="https://github.com/vientonorte/uxtools" target="_blank" rel="noopener noreferrer">Código ↗</a>
            </div>
          </article>

        </div>

        {/* Workspace */}
        <section className="workspace-section fade-up delay-2" aria-label="Workspace operativo">
          <div className="dash-section-label">Workspace operativo</div>
          <div className="workspace-grid">
            <article className="workspace-card workspace-card-primary">
              <div className="workspace-card-top">
                <div className="workspace-icon" aria-hidden="true">⌘</div>
                <span className="workspace-badge">FOCO</span>
              </div>
              <h3 className="workspace-title">Atajos del sprint</h3>
              <p className="workspace-desc">Abre el flujo de trabajo principal sin perder tiempo entre módulos.</p>
              <div className="workspace-actions">
                <Link className="workspace-action primary" to="/benchmark">Nuevo benchmark</Link>
                <Link className="workspace-action ghost" to="/uxflow">Nuevo UXFlow</Link>
                <Link className="workspace-action ghost" to="/selfradar">Self Radar</Link>
                <Link className="workspace-action ghost" to="/kit-tlp">Kit TLP</Link>
                <Link className="workspace-action ghost" to="/poliradar">PoliRadar</Link>
                <Link className="workspace-action ghost" to="/onboarding">Onboarding</Link>
              </div>
            </article>

            <article className="workspace-card">
              <div className="workspace-card-top">
                <div className="workspace-icon" aria-hidden="true">◉</div>
                <span className="workspace-badge">LIVE</span>
              </div>
              <h3 className="workspace-title">Artefactos recientes</h3>
              <p className="workspace-desc">Sesiones y documentos más recientes para retomar trabajo.</p>
              <div className="recent-artifacts" aria-live="polite">
                {recents.length === 0 ? (
                  <div className="activity-empty">
                    Aún no hay sesiones en este navegador (Benchmark, UXFlow, Self Radar o Kit TLP).
                    <div className="workspace-actions" style={{ marginTop: '0.75rem' }}>
                      <Link className="workspace-action primary" to="/onboarding">
                        Abrir onboarding
                      </Link>
                    </div>
                  </div>
                ) : (
                  recents
                    .filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()))
                    .map((item) => (
                      <Link key={item.id} className="recent-artifact" to={item.href}>
                        <div className="recent-artifact-icon" aria-hidden="true">
                          {item.type === 'bm'
                            ? '📊'
                            : item.type === 'sr'
                              ? '◎'
                              : item.type === 'tlp'
                                ? '⏸'
                                : '⚡'}
                        </div>
                        <div className="recent-artifact-body">
                          <div className="recent-artifact-title">{item.title}</div>
                          <div className="recent-artifact-meta">
                            {item.subtitle} · {item.date} · {item.meta}
                          </div>
                        </div>
                        <div className="recent-artifact-score">{item.score}</div>
                      </Link>
                    ))
                )}
              </div>
            </article>
          </div>
        </section>

        {/* Activity feed */}
        <section className="activity-section fade-up delay-3" aria-label="Actividad reciente">
          <div className="dash-section-label">Actividad reciente</div>
          <div className="activity-list" role="log" aria-live="polite">
            {activity.length === 0 ? (
              <div className="activity-empty">Sin actividad registrada aún.</div>
            ) : (
              activity
                .filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()))
                .map((item) => (
                  <div key={`${item.type}-${item.id}`} className="activity-item">
                    <div className={`activity-dot ${item.type}`} aria-hidden="true" />
                    <div className="activity-body">
                      <div className="activity-title">{item.title}</div>
                      <div className="activity-sub">{item.sub}</div>
                    </div>
                    <span className={`activity-badge ${item.type}`}>
                      {item.type === 'bm' ? 'Benchmark' : 'UXFlow'}
                    </span>
                    <span className="activity-date">{item.date}</span>
                  </div>
                ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
