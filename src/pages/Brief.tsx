import { useState } from 'react';

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

interface Proyeccion {
  diasCampana: number;
  semanas: number;
  setsTotal: number;
  ingresosBrutos: number;
  ingresosMensual: number;
  alcanceEstimado: number;
  impresiones: number;
  clientesPotenciales: number;
  roiEstimado: number;
  ingresoPorDia: number;
}

function calcularProyeccion(inputs: BriefInputs): Proyeccion {
  const { precioSet, setsPerDia, diasSemana, fechaInicio, fechaFin, presupuestoIG, cpResultado } = inputs;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diasCalendario = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const semanas = diasCalendario / 7;
  const diasTrabajo = semanas * diasSemana;
  const setsTotal = diasTrabajo * setsPerDia;
  const ingresosBrutos = setsTotal * precioSet;
  const ingresosMensual = (ingresosBrutos / diasCalendario) * 30;
  const ingresoPorDia = ingresosBrutos / diasCalendario;
  const alcanceEstimado = cpResultado > 0 ? Math.round((presupuestoIG / cpResultado) * 10) : 0;
  const impresiones = alcanceEstimado * 3;
  const clientesPotenciales = Math.round(alcanceEstimado * 0.02);
  const roiEstimado = presupuestoIG > 0 ? ((clientesPotenciales * precioSet - presupuestoIG) / presupuestoIG) * 100 : 0;
  return { diasCampana: diasCalendario, semanas, setsTotal, ingresosBrutos, ingresosMensual, alcanceEstimado, impresiones, clientesPotenciales, roiEstimado, ingresoPorDia };
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

const HOY = new Date().toISOString().split('T')[0];
const EN_MES = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="brief-tooltip-wrap">
      <button
        className="brief-tooltip-btn"
        type="button"
        aria-label="Más información"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >?</button>
      {open && <span className="brief-tooltip-bubble" role="tooltip">{text}</span>}
    </span>
  );
}

export default function Brief() {
  const [inputs, setInputs] = useState<BriefInputs>({
    servicio: 'Estilismo de uñas',
    precioSet: 15000,
    setsPerDia: 1,
    diasSemana: 5,
    fechaInicio: HOY,
    fechaFin: EN_MES,
    presupuestoIG: 50000,
    cpResultado: 150,
    targetAudience: 'Mujeres 18–35, interesadas en belleza y cuidado personal',
    objetivo: 'Conseguir más clientas y reservas para mis servicios de uñas',
  });

  const [avanzado, setAvanzado] = useState(false);
  const [generado, setGenerado] = useState(false);

  const fechaError =
    inputs.fechaInicio && inputs.fechaFin && inputs.fechaFin <= inputs.fechaInicio
      ? 'La fecha de fin debe ser posterior al inicio'
      : null;

  function set<K extends keyof BriefInputs>(key: K, val: BriefInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: val }));
    setGenerado(false);
  }

  const proy = calcularProyeccion(inputs);

  function handleCopiar() {
    if (fechaError) return;
    const texto = generarTexto(inputs, proy);
    navigator.clipboard.writeText(texto).catch(() => {});
    setGenerado(true);
    setTimeout(() => setGenerado(false), 2500);
  }

  return (
    <main className="brief-main" id="main" tabIndex={-1}>
      <div className="brief-header">
        <div className="brief-eyebrow">UX Tools Suite · vientonorte</div>
        <h1 className="brief-title">Brief de Campaña</h1>
        <p className="brief-sub">
          Calcula cuánto puedes ganar y qué necesitas invertir en Instagram para llegar a más clientes.
        </p>
      </div>

      <div className="brief-body">
        {/* ── Formulario ── */}
        <section className="brief-form-col" aria-label="Configuración del brief">

          <div className="brief-card">
            <h2 className="brief-card-title">Tu servicio</h2>
            <div className="brief-field">
              <label className="brief-label" htmlFor="servicio">¿Qué servicio ofreces?</label>
              <input id="servicio" className="brief-input" value={inputs.servicio}
                onChange={(e) => set('servicio', e.target.value)}
                placeholder="Ej: Estilismo de uñas" />
            </div>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="precio">¿Cuánto cobras por servicio? (CLP)</label>
                <input id="precio" className="brief-input" type="number" min={0}
                  value={inputs.precioSet} onChange={(e) => set('precioSet', Number(e.target.value))} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="sets">¿Cuántos clientes atiendes por día?</label>
                <input id="sets" className="brief-input" type="number" min={0} max={24}
                  value={inputs.setsPerDia} onChange={(e) => set('setsPerDia', Number(e.target.value))} />
              </div>
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="diasSem">¿Cuántos días a la semana trabajas?</label>
              <input id="diasSem" className="brief-input" type="number" min={1} max={7}
                value={inputs.diasSemana} onChange={(e) => set('diasSemana', Number(e.target.value))} />
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Período de la campaña</h2>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="fechaIni">¿Cuándo empieza?</label>
                <input id="fechaIni" className="brief-input" type="date"
                  value={inputs.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="fechaFin">¿Cuándo termina?</label>
                <input id="fechaFin"
                  className={`brief-input${fechaError ? ' brief-input--error' : ''}`}
                  type="date" value={inputs.fechaFin}
                  onChange={(e) => set('fechaFin', e.target.value)}
                  aria-describedby={fechaError ? 'fechaFin-error' : undefined} />
                {fechaError && (
                  <span id="fechaFin-error" className="brief-error" role="alert">{fechaError}</span>
                )}
              </div>
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Inversión en Instagram</h2>
            <div className="brief-field">
              <label className="brief-label" htmlFor="presup">
                ¿Cuánto quieres gastar en publicidad? (CLP)
              </label>
              <input id="presup" className="brief-input" type="number" min={0}
                value={inputs.presupuestoIG} onChange={(e) => set('presupuestoIG', Number(e.target.value))} />
            </div>

            {/* Opciones avanzadas toggle */}
            <button
              className="brief-toggle-avanzado"
              type="button"
              onClick={() => setAvanzado((v) => !v)}
              aria-expanded={avanzado}
            >
              {avanzado ? '▲ Ocultar opciones avanzadas' : '▼ Opciones avanzadas'}
            </button>

            {avanzado && (
              <>
                <div className="brief-field" style={{ marginTop: 'var(--space-md)' }}>
                  <label className="brief-label" htmlFor="cpr">
                    Costo por resultado (CLP)
                    <Tooltip text="¿Cuánto pagas en promedio por cada persona que reacciona a tu anuncio (clic, mensaje, etc.)? Si no lo sabes, deja $150." />
                  </label>
                  <input id="cpr" className="brief-input" type="number" min={0}
                    value={inputs.cpResultado} onChange={(e) => set('cpResultado', Number(e.target.value))} />
                </div>
                <div className="brief-field">
                  <label className="brief-label" htmlFor="audience">¿A quién le habla tu campaña?</label>
                  <textarea id="audience" className="brief-input brief-textarea" value={inputs.targetAudience}
                    onChange={(e) => set('targetAudience', e.target.value)} rows={2} />
                </div>
                <div className="brief-field">
                  <label className="brief-label" htmlFor="objetivo">Objetivo de la campaña</label>
                  <textarea id="objetivo" className="brief-input brief-textarea" value={inputs.objetivo}
                    onChange={(e) => set('objetivo', e.target.value)} rows={2} />
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Resultados ── */}
        <section className="brief-results-col" aria-label="Proyección de resultados">

          {/* KPI principal: ingreso mensual */}
          <div className="brief-card brief-card-highlight">
            <h2 className="brief-card-title">¿Cuánto puedes ganar?</h2>
            <div className="brief-hero-kpi">
              <div className="brief-hero-val">{fmt(proy.ingresosMensual)}</div>
              <div className="brief-hero-lbl">al mes</div>
            </div>
            <div className="proy-grid proy-grid--3">
              <div className="proy-kpi">
                <div className="proy-val">{fmt(proy.ingresoPorDia)}</div>
                <div className="proy-lbl">por día</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{Math.round(proy.setsTotal)}</div>
                <div className="proy-lbl">servicios en {proy.diasCampana} días</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{fmt(proy.ingresosBrutos)}</div>
                <div className="proy-lbl">total del período</div>
              </div>
            </div>
          </div>

          {/* Pauta IG */}
          <div className="brief-card">
            <h2 className="brief-card-title">
              ¿Qué logra tu inversión en Instagram?
              <Tooltip text="Estimaciones basadas en CTR promedio del 2% para servicios de belleza en Instagram. Los valores reales varían según el contenido y segmentación." />
            </h2>
            <div className="proy-grid">
              <div className="proy-kpi">
                <div className="proy-val">{proy.alcanceEstimado.toLocaleString('es-CL')}</div>
                <div className="proy-lbl">personas te verán</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{proy.clientesPotenciales}</div>
                <div className="proy-lbl">clientes potenciales</div>
              </div>
              <div className="proy-kpi">
                <div className="proy-val">{proy.impresiones.toLocaleString('es-CL')}</div>
                <div className="proy-lbl">impresiones totales</div>
              </div>
              <div className="proy-kpi proy-kpi-roi" data-positive={proy.roiEstimado >= 0}>
                <div className="proy-val">
                  {inputs.presupuestoIG > 0
                    ? `${proy.roiEstimado >= 0 ? '↑' : '↓'} ${Math.abs(proy.roiEstimado).toFixed(0)}%`
                    : '—'}
                </div>
                <div className="proy-lbl">retorno estimado</div>
              </div>
            </div>
          </div>

          {/* Brief exportable */}
          <div className="brief-card">
            <h2 className="brief-card-title">Brief listo para compartir</h2>
            <pre className="brief-preview">{generarTexto(inputs, proy)}</pre>
            <button
              className={`btn-brief-copy${generado ? ' btn-brief-copy--done' : ''}`}
              onClick={handleCopiar}
              disabled={!!fechaError}
            >
              <span aria-live="polite">{generado ? '✓ ¡Copiado!' : '📋 Copiar brief'}</span>
            </button>
          </div>

        </section>
      </div>
    </main>
  );
}

function generarTexto(inputs: BriefInputs, proy: Proyeccion): string {
  const f = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  return `BRIEF DE CAMPAÑA INSTAGRAM
=============================
Servicio: ${inputs.servicio}
Período: ${inputs.fechaInicio} → ${inputs.fechaFin} (${proy.diasCampana} días)
Audiencia: ${inputs.targetAudience}
Objetivo: ${inputs.objetivo}

PROYECCIÓN DE INGRESOS
• Precio por servicio: ${f(inputs.precioSet)}
• Servicios por día: ${inputs.setsPerDia} · ${inputs.diasSemana} días/semana
• Total estimado de servicios: ${Math.round(proy.setsTotal)}
• Ingreso mensual proyectado: ${f(proy.ingresosMensual)}
• Ingresos totales del período: ${f(proy.ingresosBrutos)}
• Promedio diario: ${f(proy.ingresoPorDia)}

PAUTA INSTAGRAM
• Presupuesto: ${f(inputs.presupuestoIG)}
• Costo por resultado: ${f(inputs.cpResultado)}
• Alcance estimado: ${proy.alcanceEstimado.toLocaleString('es-CL')} personas
• Impresiones estimadas: ${proy.impresiones.toLocaleString('es-CL')}
• Clientes potenciales: ${proy.clientesPotenciales}
• Retorno estimado: ${proy.roiEstimado.toFixed(0)}%

Generado con UX Tools Suite · vientonorte`;
}
