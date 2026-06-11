import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

interface BriefInputs {
  servicio: string;
  precioSet: number;
  setsPerDia: number;
  diasSemana: number;
  fechaInicio: string;
  fechaFin: string;
  presupuestoIG: number;
  cpResultado: number;
  targetAudience: string;
  objetivo: string;
}

interface BriefScenario extends BriefInputs {
  id: string;
  nombre: string;
}

interface Proyeccion {
  diasCampana: number;
  semanas: number;
  setsTotal: number;
  ingresosBrutos: number;
  alcanceEstimado: number;
  impresiones: number;
  clientesPotenciales: number;
  roiEstimado: number;
  ingresoPorDia: number;
}

const STORAGE_KEY = 'uxtools-brief-scenarios';

function calcularProyeccion(inputs: BriefInputs): Proyeccion {
  const { precioSet, setsPerDia, diasSemana, fechaInicio, fechaFin, presupuestoIG, cpResultado } = inputs;

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diasCalendario = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const semanas = diasCalendario / 7;
  const diasTrabajo = semanas * diasSemana;
  const setsTotal = diasTrabajo * setsPerDia;
  const ingresosBrutos = setsTotal * precioSet;
  const ingresoPorDia = ingresosBrutos / diasCalendario;

  const alcanceEstimado = cpResultado > 0 ? Math.round((presupuestoIG / cpResultado) * 10) : 0;
  const impresiones = alcanceEstimado * 3;
  const clientesPotenciales = Math.round(alcanceEstimado * 0.02);
  const roiEstimado = presupuestoIG > 0 ? ((clientesPotenciales * precioSet - presupuestoIG) / presupuestoIG) * 100 : 0;

  return { diasCampana: diasCalendario, semanas, setsTotal, ingresosBrutos, alcanceEstimado, impresiones, clientesPotenciales, roiEstimado, ingresoPorDia };
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

const HOY = new Date().toISOString().split('T')[0];
const EN_MES = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function generarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `esc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function crearEscenario(nombre: string): BriefScenario {
  return {
    id: generarId(),
    nombre,
    servicio: 'Estilismo de uñas',
    precioSet: 15000,
    setsPerDia: 1,
    diasSemana: 5,
    fechaInicio: HOY,
    fechaFin: EN_MES,
    presupuestoIG: 50000,
    cpResultado: 150,
    targetAudience: 'Mujeres 18–35, Santiago, interesadas en belleza y cuidado personal',
    objetivo: 'Aumentar clientes y reservas para servicios de uñas',
  };
}

export default function Brief() {
  const [scenarios, setScenarios] = useLocalStorage<BriefScenario[]>(STORAGE_KEY, [crearEscenario('Escenario 1')]);
  const [activeId, setActiveId] = useState<string>(() => scenarios[0]?.id ?? '');
  const [generado, setGenerado] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const lista = scenarios.length ? scenarios : [crearEscenario('Escenario 1')];
  const active = lista.find((s) => s.id === activeId) ?? lista[0];

  function update<K extends keyof BriefInputs>(key: K, val: BriefInputs[K]) {
    setScenarios((prev) => prev.map((s) => (s.id === active.id ? { ...s, [key]: val } : s)));
    setGenerado(false);
  }

  function renombrar(nombre: string) {
    setScenarios((prev) => prev.map((s) => (s.id === active.id ? { ...s, nombre } : s)));
  }

  function agregarEscenario() {
    const nuevo = crearEscenario(`Escenario ${scenarios.length + 1}`);
    setScenarios((prev) => [...prev, nuevo]);
    setActiveId(nuevo.id);
    showToast('✓ Escenario agregado');
  }

  function duplicarEscenario() {
    const copia: BriefScenario = { ...active, id: generarId(), nombre: `${active.nombre} (copia)` };
    setScenarios((prev) => [...prev, copia]);
    setActiveId(copia.id);
    showToast('✓ Escenario duplicado');
  }

  function eliminarEscenario(id: string) {
    if (scenarios.length <= 1) return;
    const next = scenarios.filter((s) => s.id !== id);
    setScenarios(next);
    if (activeId === id) setActiveId(next[0].id);
    showToast('✓ Escenario eliminado');
  }

  function handleTabKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + dir + scenarios.length) % scenarios.length;
    const next = scenarios[nextIndex];
    setActiveId(next.id);
    document.getElementById(`brief-tab-${next.id}`)?.focus();
  }

  const fechaError =
    active.fechaInicio && active.fechaFin && active.fechaFin <= active.fechaInicio
      ? 'La fecha de fin debe ser posterior al inicio'
      : null;

  const proy = calcularProyeccion(active);

  function handleCopiar() {
    if (fechaError) return;
    const texto = generarTexto(active, proy);
    navigator.clipboard.writeText(texto).catch(() => {});
    setGenerado(true);
    showToast('✓ Brief copiado al portapapeles');
    setTimeout(() => setGenerado(false), 2000);
  }

  function handleExportarPDF() {
    window.print();
  }

  function handleExportarComparacion() {
    const f = (n: number) => Math.round(n);
    const rows = [
      ['Escenario', 'Servicio', 'Ingresos brutos', 'Promedio diario', 'Sets totales', 'Alcance estimado', 'Impresiones', 'Clientes potenciales', 'ROI %'].join(';'),
      ...scenarios.map((s) => {
        const p = calcularProyeccion(s);
        return [
          s.nombre,
          s.servicio,
          f(p.ingresosBrutos),
          f(p.ingresoPorDia),
          f(p.setsTotal),
          p.alcanceEstimado,
          p.impresiones,
          p.clientesPotenciales,
          p.roiEstimado.toFixed(0),
        ].join(';');
      }),
    ].join('\n');
    const blob = new Blob(['﻿' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brief-comparacion-escenarios.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ Comparación exportada (CSV)');
  }

  return (
    <main className="brief-main" id="main" tabIndex={-1}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="brief-header">
        <div className="brief-eyebrow">UX Tools Suite · SURA Investments</div>
        <h1 className="brief-title">Brief de Campaña</h1>
        <p className="brief-sub">Proyección de ingresos y configuración de pauta para Instagram. Tus escenarios se guardan automáticamente en este navegador.</p>
      </div>

      {/* Tabs de escenarios */}
      <div className="brief-scenarios no-print">
        <div role="tablist" aria-label="Escenarios de campaña" className="brief-tabs">
          {scenarios.map((s, i) => (
            <div key={s.id} className="brief-tab-wrap">
              <button
                role="tab"
                id={`brief-tab-${s.id}`}
                aria-selected={s.id === active.id}
                aria-controls={`brief-panel-${s.id}`}
                tabIndex={s.id === active.id ? 0 : -1}
                className={`brief-tab${s.id === active.id ? ' brief-tab--active' : ''}`}
                onClick={() => setActiveId(s.id)}
                onKeyDown={(e) => handleTabKeyDown(e, i)}
                type="button"
              >
                {s.nombre}
              </button>
              {scenarios.length > 1 && (
                <button
                  className="brief-tab-close"
                  aria-label={`Eliminar ${s.nombre}`}
                  onClick={() => eliminarEscenario(s.id)}
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="brief-tab brief-tab-add" onClick={agregarEscenario} type="button">
            + Escenario
          </button>
        </div>
      </div>

      <div
        className="brief-body"
        role="tabpanel"
        id={`brief-panel-${active.id}`}
        aria-labelledby={`brief-tab-${active.id}`}
      >
        {/* Columna izquierda: formulario */}
        <section className="brief-form-col" aria-label="Configuración del brief">
          <div className="brief-card">
            <h2 className="brief-card-title">Escenario</h2>
            <div className="brief-field">
              <label className="brief-label" htmlFor="nombreEscenario">Nombre del escenario</label>
              <input id="nombreEscenario" className="brief-input" value={active.nombre}
                onChange={(e) => renombrar(e.target.value)} />
            </div>
            <div className="brief-actions-row">
              <button className="btn-brief-secondary" onClick={duplicarEscenario} type="button">
                Duplicar escenario
              </button>
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Servicio</h2>
            <div className="brief-field">
              <label className="brief-label" htmlFor="servicio">Nombre del servicio</label>
              <input id="servicio" className="brief-input" value={active.servicio}
                onChange={(e) => update('servicio', e.target.value)} />
            </div>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="precio">Precio por set (CLP)</label>
                <input id="precio" className="brief-input" type="number" min={0}
                  value={active.precioSet} onChange={(e) => update('precioSet', Number(e.target.value))} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="sets">Sets por día</label>
                <input id="sets" className="brief-input" type="number" min={0} max={24}
                  value={active.setsPerDia} onChange={(e) => update('setsPerDia', Number(e.target.value))} />
              </div>
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="diasSem">Días de trabajo por semana</label>
              <input id="diasSem" className="brief-input" type="number" min={1} max={7}
                value={active.diasSemana} onChange={(e) => update('diasSemana', Number(e.target.value))} />
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Período</h2>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="fechaIni">Inicio campaña</label>
                <input id="fechaIni" className="brief-input" type="date"
                  value={active.fechaInicio} onChange={(e) => update('fechaInicio', e.target.value)} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="fechaFin">Fin campaña</label>
                <input id="fechaFin"
                  className={`brief-input${fechaError ? ' brief-input--error' : ''}`}
                  type="date"
                  value={active.fechaFin}
                  onChange={(e) => update('fechaFin', e.target.value)}
                  aria-describedby={fechaError ? 'fechaFin-error' : undefined} />
                {fechaError && (
                  <span id="fechaFin-error" className="brief-error" role="alert">{fechaError}</span>
                )}
              </div>
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Pauta Instagram</h2>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="presup">Presupuesto total (CLP)</label>
                <input id="presup" className="brief-input" type="number" min={0}
                  value={active.presupuestoIG} onChange={(e) => update('presupuestoIG', Number(e.target.value))} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="cpr">Costo por resultado (CLP)</label>
                <input id="cpr" className="brief-input" type="number" min={0}
                  value={active.cpResultado} onChange={(e) => update('cpResultado', Number(e.target.value))} />
              </div>
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="audience">Audiencia objetivo</label>
              <textarea id="audience" className="brief-input brief-textarea" value={active.targetAudience}
                onChange={(e) => update('targetAudience', e.target.value)} rows={2} />
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="objetivo">Objetivo de campaña</label>
              <textarea id="objetivo" className="brief-input brief-textarea" value={active.objetivo}
                onChange={(e) => update('objetivo', e.target.value)} rows={2} />
            </div>
          </div>
        </section>

        {/* Columna derecha: proyección */}
        <section className="brief-results-col" aria-label="Proyección de resultados">
          <div className="brief-card brief-card-highlight">
            <h2 className="brief-card-title">Proyección de ingresos</h2>
            <div className="proy-grid">
              <div className="proy-kpi">
                <div className="proy-val">{fmt(proy.ingresosBrutos)}</div>
                <div className="proy-lbl">Ingresos brutos estimados</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{fmt(proy.ingresoPorDia)}</div>
                <div className="proy-lbl">Promedio por día</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{Math.round(proy.setsTotal)}</div>
                <div className="proy-lbl">Sets totales en el período</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{proy.diasCampana} días</div>
                <div className="proy-lbl">Duración de campaña</div>
              </div>
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Estimación pauta IG</h2>
            <div className="proy-grid">
              <div className="proy-kpi">
                <div className="proy-val">{proy.alcanceEstimado.toLocaleString('es-CL')}</div>
                <div className="proy-lbl">Alcance estimado</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{proy.impresiones.toLocaleString('es-CL')}</div>
                <div className="proy-lbl">Impresiones</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{proy.clientesPotenciales}</div>
                <div className="proy-lbl">Clientes potenciales (2% CTR)</div>
              </div>
              <div className="proy-kpi proy-kpi-roi" data-positive={proy.roiEstimado >= 0}>
                <div className="proy-val">
                  {active.presupuestoIG > 0
                    ? `${proy.roiEstimado >= 0 ? '↑' : '↓'} ${proy.roiEstimado.toFixed(0)}%`
                    : '—'}
                </div>
                <div className="proy-lbl">ROI estimado</div>
              </div>
            </div>
            <p className="brief-disclaimer">
              Estimación basada en CTR promedio del 2% para servicios de belleza en Instagram. Los valores reales dependen del contenido y segmentación.
            </p>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Brief generado</h2>
            <pre className="brief-preview">{generarTexto(active, proy)}</pre>
            <div className="brief-export-row">
              <button className="btn-brief-copy" onClick={handleCopiar} disabled={!!fechaError}>
                <span aria-live="polite">{generado ? '✓ Copiado' : 'Copiar brief al portapapeles'}</span>
              </button>
              <button className="btn-brief-secondary no-print" onClick={handleExportarPDF} type="button">
                Exportar PDF
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Comparación de escenarios */}
      {scenarios.length > 1 && (
        <section className="brief-card brief-comparison" aria-label="Comparación de escenarios">
          <div className="brief-comparison-header">
            <h2 className="brief-card-title">Comparación de escenarios</h2>
            <button className="btn-brief-secondary no-print" onClick={handleExportarComparacion} type="button">
              Exportar CSV
            </button>
          </div>
          <div className="brief-table-wrap">
            <table className="brief-table">
              <thead>
                <tr>
                  <th scope="col">Escenario</th>
                  <th scope="col">Ingresos brutos</th>
                  <th scope="col">Promedio/día</th>
                  <th scope="col">Sets totales</th>
                  <th scope="col">Alcance</th>
                  <th scope="col">ROI</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const p = calcularProyeccion(s);
                  return (
                    <tr key={s.id} className={s.id === active.id ? 'brief-table-row--active' : ''}>
                      <th scope="row">{s.nombre}</th>
                      <td>{fmt(p.ingresosBrutos)}</td>
                      <td>{fmt(p.ingresoPorDia)}</td>
                      <td>{Math.round(p.setsTotal)}</td>
                      <td>{p.alcanceEstimado.toLocaleString('es-CL')}</td>
                      <td data-positive={p.roiEstimado >= 0}>
                        {s.presupuestoIG > 0 ? `${p.roiEstimado >= 0 ? '↑' : '↓'} ${p.roiEstimado.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function generarTexto(scenario: BriefScenario, proy: Proyeccion): string {
  const f = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  return `BRIEF DE CAMPAÑA INSTAGRAM — ${scenario.nombre}
=============================
Servicio: ${scenario.servicio}
Período: ${scenario.fechaInicio} → ${scenario.fechaFin} (${proy.diasCampana} días)
Audiencia: ${scenario.targetAudience}
Objetivo: ${scenario.objetivo}

PROYECCIÓN DE INGRESOS
• Precio por set: ${f(scenario.precioSet)}
• Sets por día: ${scenario.setsPerDia} · ${scenario.diasSemana} días/semana
• Sets totales estimados: ${Math.round(proy.setsTotal)}
• Ingresos brutos: ${f(proy.ingresosBrutos)}
• Promedio diario: ${f(proy.ingresoPorDia)}

PAUTA INSTAGRAM
• Presupuesto: ${f(scenario.presupuestoIG)}
• Costo por resultado: ${f(scenario.cpResultado)}
• Alcance estimado: ${proy.alcanceEstimado.toLocaleString('es-CL')} personas
• Impresiones estimadas: ${proy.impresiones.toLocaleString('es-CL')}
• Clientes potenciales: ${proy.clientesPotenciales}
• ROI estimado: ${proy.roiEstimado.toFixed(0)}%

Generado con UX Tools Suite · SURA Investments`;
}
