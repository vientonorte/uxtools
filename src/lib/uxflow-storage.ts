import { buildFlowModel } from './uxflow-engine';
import { UXFLOW_STORAGE_KEY } from '../types/uxflow';
import type { FlowModel, UxflowSession } from '../types/uxflow';

export const UXFLOW_HISTORY_LIMIT = 20;

/** Formato almacenado compatible con uxflow.html + React. */
export type StoredUxflowRecord = {
  id: number;
  titulo: string;
  linea: string;
  fecha: string;
  prompt: string;
  criterios: string;
  paises: string;
  screenshot?: string | null;
  flow: FlowModel;
  model?: Record<string, unknown>;
};

type LegacyFlow = Partial<FlowModel> & {
  steps?: FlowModel['steps'];
  criteria?: FlowModel['criteria'];
  edgeCases?: FlowModel['edgeCases'];
};

function parseCountries(entry: Record<string, unknown>, flow: LegacyFlow): string[] {
  if (Array.isArray(flow.countries) && flow.countries.length) return flow.countries;
  const paises = String(entry.paises ?? '');
  if (paises) {
    return paises.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const model = entry.model as { countries?: string[] } | undefined;
  if (Array.isArray(model?.countries) && model.countries.length) return model.countries;
  return ['Chile'];
}

export function sanitizeUxflowSession(entry: unknown): UxflowSession | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  const model = e.model as Record<string, unknown> | undefined;
  const prompt = String(e.prompt ?? e.criterios ?? model?.prompt ?? '').trim();
  const titulo = String(e.titulo ?? model?.title ?? 'Proyecto UX').trim();
  const linea = String(e.linea ?? model?.linea ?? 'Otro');
  const fecha = String(e.fecha ?? '');
  const id = Number(e.id) || Date.now();
  const legacyFlow = (e.flow ?? {}) as LegacyFlow;

  let flow: FlowModel | null = null;

  if (
    Array.isArray(legacyFlow.steps) &&
    legacyFlow.steps.length &&
    Array.isArray(legacyFlow.criteria)
  ) {
    flow = {
      actor: String(legacyFlow.actor ?? model?.actor ?? 'Usuario autenticado'),
      goal: String(legacyFlow.goal ?? model?.goal ?? extractGoalFallback(prompt)),
      linea,
      countries: parseCountries(e, legacyFlow),
      steps: legacyFlow.steps,
      criteria: legacyFlow.criteria,
      edgeCases: Array.isArray(legacyFlow.edgeCases) ? legacyFlow.edgeCases : [],
    };
  } else if (prompt) {
    flow = buildFlowModel(prompt, linea, String(e.paises ?? ''));
    flow.linea = linea;
  }

  if (!flow) return null;

  return {
    id,
    titulo,
    linea: flow.linea || linea,
    fecha,
    prompt,
    paises: String(e.paises ?? flow.countries.join(', ')),
    screenshot: (e.screenshot as string | null | undefined) ?? null,
    flow,
  };
}

function extractGoalFallback(prompt: string): string {
  return prompt.slice(0, 80) || 'Flujo UX';
}

export function loadUxflowSessions(): UxflowSession[] {
  try {
    const raw = localStorage.getItem(UXFLOW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeUxflowSession).filter((s): s is UxflowSession => Boolean(s));
  } catch {
    return [];
  }
}

export function persistUxflowSessions(sessions: UxflowSession[]): void {
  const capped = sessions.slice(0, UXFLOW_HISTORY_LIMIT);
  const stored: StoredUxflowRecord[] = capped.map((session) => toStoredRecord(session));
  try {
    localStorage.setItem(UXFLOW_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // quota exceeded
  }
}

export function toStoredRecord(session: UxflowSession): StoredUxflowRecord {
  const { flow } = session;
  return {
    id: session.id,
    titulo: session.titulo,
    linea: session.linea,
    fecha: session.fecha,
    prompt: session.prompt,
    criterios: session.prompt,
    paises: session.paises ?? flow.countries.join(', '),
    screenshot: session.screenshot ?? null,
    model: {
      title: session.titulo,
      linea: flow.linea,
      prompt: session.prompt,
      actor: flow.actor,
      goal: flow.goal,
      countries: flow.countries,
      steps: flow.steps,
      criteria: flow.criteria,
      edgeCases: flow.edgeCases,
    },
    flow,
  };
}

export function nextUxflowSessionId(sessions: UxflowSession[]): number {
  const maxId = sessions.reduce((acc, item) => Math.max(acc, Number(item.id) || 0), 0);
  return Math.max(maxId + 1, Date.now());
}