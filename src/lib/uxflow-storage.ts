import { buildFlowModel } from './uxflow-engine';
import { UXFLOW_STORAGE_KEY, UXFLOW_TEMPLATES_KEY } from '../types/uxflow';
import type { Criterion, EdgeCase, FlowModel, FlowStep, UxflowSession, UxflowTemplate } from '../types/uxflow';

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

function normalizeSteps(steps: unknown[], actor: string, goal: string): FlowStep[] {
  return steps.map((raw, index) => {
    if (raw && typeof raw === 'object' && 'action' in raw) {
      const step = raw as FlowStep;
      return {
        id: Number(step.id) || index + 1,
        actor: String(step.actor ?? actor),
        action: String(step.action ?? goal),
        channel: String(step.channel ?? 'UI'),
        decision: String(step.decision ?? '—'),
      };
    }

    const legacy = raw as { label?: string; detail?: string };
    return {
      id: index + 1,
      actor,
      action: String(legacy.detail ?? legacy.label ?? `Paso ${index + 1}`),
      channel: 'UI',
      decision: String(legacy.label ?? '—'),
    };
  });
}

function normalizeCriteria(criteria: unknown[]): Criterion[] {
  return criteria
    .map((raw, index) => {
      if (typeof raw === 'string') {
        return { id: index + 1, category: 'UX', description: raw };
      }
      if (!raw || typeof raw !== 'object') return null;
      const criterion = raw as Criterion;
      const description = String(criterion.description ?? '').trim();
      if (!description) return null;
      return {
        id: Number(criterion.id) || index + 1,
        category: String(criterion.category ?? 'UX'),
        description,
      };
    })
    .filter((item): item is Criterion => Boolean(item));
}

function normalizeEdgeCases(edgeCases: unknown[]): EdgeCase[] {
  return edgeCases.map((raw, index) => {
    if (typeof raw === 'string') {
      return {
        id: index + 1,
        trigger: raw,
        impact: 'medio',
        mitigation: 'Definir manejo en diseño y validar en QA',
      };
    }

    const edgeCase = (raw ?? {}) as Partial<EdgeCase>;
    const impact =
      edgeCase.impact === 'alto' || edgeCase.impact === 'medio' || edgeCase.impact === 'bajo'
        ? edgeCase.impact
        : 'medio';

    return {
      id: Number(edgeCase.id) || index + 1,
      trigger: String(edgeCase.trigger ?? 'Caso borde'),
      impact,
      mitigation: String(edgeCase.mitigation ?? 'Definir manejo en diseño y validar en QA'),
    };
  });
}

function normalizeFlowModel(
  flow: LegacyFlow,
  entry: Record<string, unknown>,
  model: Record<string, unknown> | undefined,
  prompt: string,
  linea: string
): FlowModel {
  const actor = String(flow.actor ?? model?.actor ?? 'Usuario autenticado');
  const goal = String(flow.goal ?? model?.goal ?? extractGoalFallback(prompt));
  const steps = Array.isArray(flow.steps) && flow.steps.length
    ? normalizeSteps(flow.steps, actor, goal)
    : [];
  const criteria = Array.isArray(flow.criteria) && flow.criteria.length
    ? normalizeCriteria(flow.criteria)
    : [];
  const edgeCases = Array.isArray(flow.edgeCases)
    ? normalizeEdgeCases(flow.edgeCases)
    : [];

  if (steps.length && criteria.length) {
    return {
      actor,
      goal,
      linea,
      countries: parseCountries(entry, flow),
      steps,
      criteria,
      edgeCases,
    };
  }

  const rebuilt = buildFlowModel(prompt, linea, String(entry.paises ?? ''));
  rebuilt.linea = linea;
  return rebuilt;
}

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
    flow = normalizeFlowModel(legacyFlow, e, model, prompt, linea);
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

export function loadUxflowTemplates(): UxflowTemplate[] {
  try {
    const raw = localStorage.getItem(UXFLOW_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const template = entry as Partial<UxflowTemplate>;
        const prompt = String(template.prompt ?? '').trim();
        if (!prompt) return null;
        return {
          id: Number(template.id) || Date.now(),
          nombre: String(template.nombre ?? 'Template').trim() || 'Template',
          prompt,
          fecha: String(template.fecha ?? ''),
        };
      })
      .filter((item): item is UxflowTemplate => Boolean(item));
  } catch {
    return [];
  }
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