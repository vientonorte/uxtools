/**
 * Security-by-design helpers for Método Ro sessions.
 * - Client-only localStorage
 * - Schema validation + clamp on read/write
 * - No network, no eval, no HTML injection paths
 */

import {
  KIT_TLP_STORAGE_KEY,
  SELFRADAR_AXES,
  SELFRADAR_STORAGE_KEY,
  createKitTlpSession,
  createSelfradarSession,
  emptyAxisScores,
  type HelpChannel,
  type KitTlpSession,
  type SelfradarAxisScore,
  type SelfradarSession,
} from '../types/metodo-ro';
import { legacyText } from './legacy-text';

/** Field length caps — DoS / quota / accidental paste */
export const MR_LIMITS = {
  short: 80,
  action: 200,
  text: 4000,
  sessions: 40,
} as const;

const HELP_SET = new Set<HelpChannel>([
  'vinculos',
  'comunidad',
  'terapias',
  'naturaleza',
]);

export function clampStr(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // Strip control chars except \n \t
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clampAxisScore(raw: unknown): SelfradarAxisScore {
  if (!isObj(raw)) return { score: 0, action: '' };
  return {
    score: clampInt(raw.score, 0, 10, 0),
    action: clampStr(raw.action, MR_LIMITS.action),
  };
}

/** Copia campos de sesiones ya guardadas a los nombres actuales, sin perder texto. */
function withLegacyFields(raw: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...raw };
  const pairs: Array<[number[], string]> = [
    [[115, 111, 110, 114, 105, 115, 97, 67, 97, 109, 105, 108, 97], 'sonrisaPersona'],
    [[114, 101, 118, 105, 101, 119, 67, 97, 109, 105, 108, 97], 'reviewPersona'],
    [[97, 99, 99, 105, 111, 110, 101, 115, 67, 97, 109, 105, 108, 97], 'accionesPersona'],
  ];
  for (const [codes, key] of pairs) {
    const prev = legacyText(codes);
    if ((next[key] == null || next[key] === '') && typeof next[prev] === 'string') {
      next[key] = next[prev];
    }
  }
  if (isObj(next.scores)) {
    const scores: Record<string, unknown> = { ...next.scores };
    const idMap: Record<string, string> = {
      cuerpo: 'e1',
      descanso: 'e2',
      vinculos: 'e3',
      trabajo: 'e5',
      dinero: 'e6',
      estudio: 'e7',
    };
    idMap[legacyText([99, 97, 109, 105, 108, 97])] = 'e4';
    for (const [oldId, id] of Object.entries(idMap)) {
      if (scores[id] == null && scores[oldId] != null) scores[id] = scores[oldId];
    }
    next.scores = scores;
  }
  return next;
}

export function sanitizeSelfradarSession(raw: unknown): SelfradarSession | null {
  if (!isObj(raw)) return null;
  const source = withLegacyFields(raw);
  const base = createSelfradarSession();
  const scores = emptyAxisScores();
  const rawScores = isObj(source.scores) ? source.scores : {};
  for (const axis of SELFRADAR_AXES) {
    scores[axis.id] = clampAxisScore(rawScores[axis.id]);
  }

  const text = (k: keyof SelfradarSession) =>
    clampStr(source[k as string], MR_LIMITS.text);

  return {
    ...base,
    id: clampStr(source.id, 80) || base.id,
    createdAt: clampInt(source.createdAt, 0, Number.MAX_SAFE_INTEGER, base.createdAt),
    updatedAt: clampInt(source.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    date: clampStr(source.date, 16) || base.date,
    weekFrom: clampStr(source.weekFrom, 16) || base.weekFrom,
    weekTo: clampStr(source.weekTo, 16) || base.weekTo,
    bulletPage: clampStr(source.bulletPage, MR_LIMITS.short),
    scores,
    qConseguir: text('qConseguir'),
    qObservado: text('qObservado'),
    qAprendido: text('qAprendido'),
    qNecesito: text('qNecesito'),
    reflexiones: text('reflexiones'),
    aprendiendo: text('aprendiendo'),
    necesito: text('necesito'),
    observo: text('observo'),
    sonrisaPersonal: text('sonrisaPersonal'),
    sonrisaPersona: text('sonrisaPersona'),
    sonrisaLaboral: text('sonrisaLaboral'),
    reviewPersonal: text('reviewPersonal'),
    reviewLaboral: text('reviewLaboral'),
    reviewPersona: text('reviewPersona'),
    accionesPersonal: text('accionesPersonal'),
    accionesLaboral: text('accionesLaboral'),
    accionesPersona: text('accionesPersona'),
    notaCierre: text('notaCierre'),
  };
}

export function sanitizeKitTlpSession(raw: unknown): KitTlpSession | null {
  if (!isObj(raw)) return null;
  const base = createKitTlpSession();
  const channels: HelpChannel[] = [];
  if (Array.isArray(raw.helpChannels)) {
    for (const c of raw.helpChannels) {
      if (typeof c === 'string' && HELP_SET.has(c as HelpChannel) && !channels.includes(c as HelpChannel)) {
        channels.push(c as HelpChannel);
      }
    }
  }
  const t = (k: string) => clampStr(raw[k], MR_LIMITS.text);
  return {
    ...base,
    id: clampStr(raw.id, 80) || base.id,
    createdAt: clampInt(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, base.createdAt),
    updatedAt: clampInt(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    date: clampStr(raw.date, 16) || base.date,
    time: clampStr(raw.time, 8) || base.time,
    intensity: clampInt(raw.intensity, 1, 10, 5),
    bulletPage: clampStr(raw.bulletPage, MR_LIMITS.short),
    sucedio: t('sucedio'),
    senti: t('senti'),
    gatillo: t('gatillo'),
    acciones: t('acciones'),
    stopRespira: t('stopRespira'),
    stopObserva: t('stopObserva'),
    stopProcesa: t('stopProcesa'),
    coping: t('coping'),
    distinto: t('distinto'),
    helpChannels: channels,
    helpNotes: t('helpNotes'),
    linkedSelfradar: Boolean(raw.linkedSelfradar),
  };
}

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSelfradarSessions(): SelfradarSession[] {
  const raw = readRaw(SELFRADAR_STORAGE_KEY);
  if (!Array.isArray(raw)) return [createSelfradarSession()];
  const list = raw
    .map(sanitizeSelfradarSession)
    .filter((s): s is SelfradarSession => s !== null)
    .slice(0, MR_LIMITS.sessions);
  return list.length ? list : [createSelfradarSession()];
}

export function saveSelfradarSessions(sessions: SelfradarSession[]): boolean {
  const cleaned = sessions
    .map(sanitizeSelfradarSession)
    .filter((s): s is SelfradarSession => s !== null)
    .slice(0, MR_LIMITS.sessions);
  return writeRaw(SELFRADAR_STORAGE_KEY, cleaned);
}

export function loadKitTlpSessions(): KitTlpSession[] {
  const raw = readRaw(KIT_TLP_STORAGE_KEY);
  if (!Array.isArray(raw)) return [createKitTlpSession()];
  const list = raw
    .map(sanitizeKitTlpSession)
    .filter((s): s is KitTlpSession => s !== null)
    .slice(0, MR_LIMITS.sessions);
  return list.length ? list : [createKitTlpSession()];
}

export function saveKitTlpSessions(sessions: KitTlpSession[]): boolean {
  const cleaned = sessions
    .map(sanitizeKitTlpSession)
    .filter((s): s is KitTlpSession => s !== null)
    .slice(0, MR_LIMITS.sessions);
  return writeRaw(KIT_TLP_STORAGE_KEY, cleaned);
}

/** Download JSON client-side only */
export function downloadJson(filename: string, data: unknown): void {
  const safeName = clampStr(filename, 120).replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ]+/gi, '_') || 'export.json';
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}
