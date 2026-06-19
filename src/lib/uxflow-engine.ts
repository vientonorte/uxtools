import { COUNTRY_FLAGS } from '../types/uxflow';
import type { FlowModel, FlowStep, Criterion, EdgeCase } from '../types/uxflow';

const COUNTRIES = Object.keys(COUNTRY_FLAGS);

export function extractActor(prompt: string): string {
  const m = prompt.match(/(?:usuario|cliente|usuario\s+\w+|investor|ejecutivo)\s+(\w+)/i);
  if (m) return m[0];
  if (/wealth/i.test(prompt)) return 'Cliente Wealth Management';
  if (/corporate/i.test(prompt)) return 'Ejecutivo corporativo';
  if (/investment/i.test(prompt)) return 'Investor';
  return 'Usuario autenticado';
}

export function extractGoal(prompt: string): string {
  const m = prompt.match(/(?:quiere?|necesita?|busca?|desea?)\s+(.+?)(?:\.|,|$)/i);
  return m ? m[1].trim() : prompt.trim().slice(0, 80);
}

export function inferLinea(prompt: string, selected = ''): string {
  if (selected && selected !== 'Otro') return selected;
  if (/wealth/i.test(prompt)) return 'Wealth Management';
  if (/corporate/i.test(prompt)) return 'Corporate Solutions';
  if (/investment/i.test(prompt)) return 'Investment Management';
  return selected || 'Otro';
}

export function inferCountriesFromPrompt(prompt: string): string[] {
  const found = COUNTRIES.filter((c) => new RegExp(c, 'i').test(prompt));
  return found.length > 0 ? found : [];
}

export function parsePaisesInput(raw: string, prompt: string): string[] {
  const fromField = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((c) => COUNTRIES.some((known) => known.toLowerCase() === c.toLowerCase()) || c.length > 2);
  const fromPrompt = inferCountriesFromPrompt(prompt);
  const merged = [...fromField];
  fromPrompt.forEach((c) => {
    if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) merged.push(c);
  });
  return merged.length > 0 ? merged : ['Chile'];
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

export function buildFlowModel(prompt: string, linea = '', paisesRaw = ''): FlowModel {
  const trimmed = prompt.trim();
  const actor = extractActor(trimmed);
  const goal = extractGoal(trimmed);
  const resolvedLinea = inferLinea(trimmed, linea);
  const countries = parsePaisesInput(paisesRaw, trimmed);
  const steps = detectSteps(trimmed, actor, resolvedLinea);
  const criteria = buildCriteria(trimmed, resolvedLinea);
  const edgeCases = detectEdgeCases(trimmed);
  return { actor, goal, linea: resolvedLinea, countries, steps, criteria, edgeCases };
}