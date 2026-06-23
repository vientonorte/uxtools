import type { MedicinalIdData } from '../../types/medicinal';

// ── Date helpers ──────────────────────────────────────────────

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function formatDateES(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function calcProximoControl(fechaReceta: string, vigenciaMeses: number): string {
  if (!fechaReceta) return '—';
  const d = new Date(fechaReceta + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  d.setMonth(d.getMonth() + vigenciaMeses);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function isVigente(fechaReceta: string, vigenciaMeses: number): boolean {
  if (!fechaReceta) return false;
  const venc = new Date(fechaReceta + 'T00:00:00');
  if (isNaN(venc.getTime())) return false;
  venc.setMonth(venc.getMonth() + vigenciaMeses);
  return new Date() <= venc;
}

export function buildQrText(data: MedicinalIdData): string {
  return [
    'CARNET MEDICINAL CANNABIS · LEY 20.000 CHILE',
    `Nombre: ${data.nombre}`,
    data.mostrarRut && data.rut ? `RUT: ${data.rut}` : null,
    `Receta: ${formatDateES(data.fechaReceta)}`,
    `Vigencia: ${data.vigenciaMeses} meses`,
    `Control: ${calcProximoControl(data.fechaReceta, data.vigenciaMeses)}`,
    `Dosis diaria: ${data.dosis}`,
    data.cantidadMensual ? `Cantidad autorizada/mes: ${data.cantidadMensual}` : null,
    data.medicoTratante ? `Médico: ${data.medicoTratante}` : null,
    data.organizacion ? `Org: ${data.organizacion}` : null,
    '',
    'Art.4° + Art.50° inc.final Ley 20.000 — Posesión, porte y uso justificados para tratamiento médico',
  ].filter(Boolean).join('\n');
}

export function buildShareText(data: MedicinalIdData): string {
  return [
    '🌿 CARNET MEDICINAL CANNABIS · LEY 20.000 CHILE',
    `Nombre: ${data.nombre}`,
    data.mostrarRut && data.rut ? `RUT: ${data.rut}` : null,
    `Receta: ${formatDateES(data.fechaReceta)}`,
    `Vigencia: ${data.vigenciaMeses} meses`,
    `Control: ${calcProximoControl(data.fechaReceta, data.vigenciaMeses)}`,
    `Dosis diaria: ${data.dosis}`,
    data.cantidadMensual ? `Cantidad autorizada/mes: ${data.cantidadMensual}` : null,
    data.mostrarDiagnostico && data.diagnostico ? `Diagnóstico: ${data.diagnostico}` : null,
    data.medicoTratante ? `Médico: ${data.medicoTratante}` : null,
    '',
    'Art.4° + Art.50° inc.final Ley 20.000 — Posesión, porte y uso justificados para tratamiento médico',
  ].filter(Boolean).join('\n');
}
