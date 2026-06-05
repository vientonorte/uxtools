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
    targetAudience: 'Mujeres 18–35, Santiago, interesadas en belleza y cuidado personal',
    objetivo: 'Aumentar clientes y reservas para servicios de uñas',
  });

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
    setTimeout(() => setGenerado(false), 2000);
  }

  return (
    <main className="brief-main" id="main" tabIndex={-1}>
      <div className="brief-header">
        <div className="brief-eyebrow">UX Tools Suite · SURA Investments</div>
        <h1 className="brief-title">Brief de Campaña</h1>
        <p className="brief-sub">Proyección de ingresos y configuración de pauta para Instagram.</p>
      </div>

      <div className="brief-body">
        {/* Columna izquierda: formulario */}
        <section className="brief-form-col" aria-label="Configuración del brief">
          <div className="brief-card">
            <h2 className="brief-card-title">Servicio</h2>
            <div className="brief-field">
              <label className="brief-label" htmlFor="servicio">Nombre del servicio</label>
              <input id="servicio" className="brief-input" value={inputs.servicio}
                onChange={(e) => set('servicio', e.target.value)} />
            </div>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="precio">Precio por set (CLP)</label>
                <input id="precio" className="brief-input" type="number" min={0}
                  value={inputs.precioSet} onChange={(e) => set('precioSet', Number(e.target.value))} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="sets">Sets por día</label>
                <input id="sets" className="brief-input" type="number" min={0} max={24}
                  value={inputs.setsPerDia} onChange={(e) => set('setsPerDia', Number(e.target.value))} />
              </div>
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="diasSem">Días de trabajo por semana</label>
              <input id="diasSem" className="brief-input" type="number" min={1} max={7}
                value={inputs.diasSemana} onChange={(e) => set('diasSemana', Number(e.target.value))} />
            </div>
          </div>

          <div className="brief-card">
            <h2 className="brief-card-title">Período</h2>
            <div className="brief-row">
              <div className="brief-field">
                <label className="brief-label" htmlFor="fechaIni">Inicio campaña</label>
                <input id="fechaIni" className="brief-input" type="date"
                  value={inputs.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="fechaFin">Fin campaña</label>
                <input id="fechaFin"
                  className={`brief-input${fechaError ? ' brief-input--error' : ''}`}
                  type="date"
                  value={inputs.fechaFin}
                  onChange={(e) => set('fechaFin', e.target.value)}
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
                  value={inputs.presupuestoIG} onChange={(e) => set('presupuestoIG', Number(e.target.value))} />
              </div>
              <div className="brief-field">
                <label className="brief-label" htmlFor="cpr">Costo por resultado (CLP)</label>
                <input id="cpr" className="brief-input" type="number" min={0}
                  value={inputs.cpResultado} onChange={(e) => set('cpResultado', Number(e.target.value))} />
              </div>
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="audience">Audiencia objetivo</label>
              <textarea id="audience" className="brief-input brief-textarea" value={inputs.targetAudience}
                onChange={(e) => set('targetAudience', e.target.value)} rows={2} />
            </div>
            <div className="brief-field">
              <label className="brief-label" htmlFor="objetivo">Objetivo de campaña</label>
              <textarea id="objetivo" className="brief-input brief-textarea" value={inputs.objetivo}
                onChange={(e) => set('objetivo', e.target.value)} rows={2} />
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
                  {inputs.presupuestoIG > 0
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
            <pre className="brief-preview">{generarTexto(inputs, proy)}</pre>
            <button className="btn-brief-copy" onClick={handleCopiar} disabled={!!fechaError}>
              <span aria-live="polite">{generado ? '✓ Copiado' : 'Copiar brief al portapapeles'}</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function generarTexto(inputs: BriefInputs, proy: Proyeccion): string {
  const f = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  return `BRIEF DE CAMPAÑA INSTAGRAM
=============================
Servicio: ${inputs.servicio}
Período: ${inputs.fechaInicio} → ${inputs.fechaFin} (${proy.diasCampana} días)
Audiencia: ${inputs.targetAudience}
Objetivo: ${inputs.objetivo}

PROYECCIÓN DE INGRESOS
• Precio por set: ${f(inputs.precioSet)}
• Sets por día: ${inputs.setsPerDia} · ${inputs.diasSemana} días/semana
• Sets totales estimados: ${Math.round(proy.setsTotal)}
• Ingresos brutos: ${f(proy.ingresosBrutos)}
• Promedio diario: ${f(proy.ingresoPorDia)}

PAUTA INSTAGRAM
• Presupuesto: ${f(inputs.presupuestoIG)}
• Costo por resultado: ${f(inputs.cpResultado)}
• Alcance estimado: ${proy.alcanceEstimado.toLocaleString('es-CL')} personas
• Impresiones estimadas: ${proy.impresiones.toLocaleString('es-CL')}
• Clientes potenciales: ${proy.clientesPotenciales}
• ROI estimado: ${proy.roiEstimado.toFixed(0)}%

Generado con UX Tools Suite · SURA Investments`;
}
