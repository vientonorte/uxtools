import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BENCHMARK_STORAGE_KEY, DIMENSIONES_DEFAULT } from '../types/benchmark';
import type { BenchmarkState, BenchmarkSession } from '../types/benchmark';
import { UXFLOW_STORAGE_KEY } from '../types/uxflow';
import type { UxflowSession } from '../types/uxflow';

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
  id: number;
  type: 'bm' | 'uxf';
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
    id: session.id,
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
    id: session.id,
    type: 'uxf',
    title: session.titulo || 'Documento UXFlow',
    subtitle: session.linea || 'UXFlow',
    date: session.fecha || '',
    score: steps ? `${steps} pasos` : 'Documento',
    meta: edgeCases ? `${edgeCases} casos borde` : 'Sin casos borde',
    href: '/uxflow',
  };
}

export default function Dashboard() {
  const bmState = readStorage<BenchmarkState>(BENCHMARK_STORAGE_KEY, {
    paso: 1, config: { nombre: '', analista: '' }, productos: [], scores: {}, notas: {}, historial: [],
  });
  const uxList = readStorage<UxflowSession[]>(UXFLOW_STORAGE_KEY, []);

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
  ].sort((a, b) => b.id - a.id).slice(0, 5);

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
            <div className="dash-eyebrow">UX Tools Suite · SURA Investments</div>
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
        <div className="dash-section-label fade-up">Instrumentos UX</div>

        <div className="modules-grid fade-up delay-1" ref={moduleRef}>
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
                <span className="mod-tag">SURA</span>
              </div>
            </div>
            <div className="module-card-footer">
              <Link className="btn-module-open" to="/uxflow">Abrir UXFLOW →</Link>
              <a className="btn-module-ghost" href="https://github.com/vientonorte/uxtools" target="_blank" rel="noopener noreferrer">Código ↗</a>
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
                <Link className="workspace-action ghost" to="/admin">Abrir admin</Link>
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
                  <div className="activity-empty">Sin artefactos recientes aún.</div>
                ) : (
                  recents
                    .filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()))
                    .map((item) => (
                      <Link key={item.id} className="recent-artifact" to={item.href}>
                        <div className="recent-artifact-icon" aria-hidden="true">
                          {item.type === 'bm' ? '📊' : '⚡'}
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
