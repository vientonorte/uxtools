import type { OnboardLang, ToolId } from './onboarding-i18n';
import { TOOL_LAYOUT } from './onboarding-i18n';

const LANG_KEY = 'uxtools-onboard-lang';
const DONE_KEY = 'uxtools-onboard-done';
const CRED_KEY = 'uxtools-onboard-cred';
const STAMP_KEY = 'uxtools-onboard-stamps';
const PICK_KEY = 'uxtools-onboard-picks';

const TOOL_IDS: ToolId[] = TOOL_LAYOUT.map((n) => n.id);

function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && TOOL_IDS.includes(value as ToolId);
}

export function loadOnboardLang(): OnboardLang {
  const v = localStorage.getItem(LANG_KEY);
  if (v === 'en' || v === 'pt' || v === 'es') return v;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('en')) return 'en';
  return 'es';
}

export function saveOnboardLang(lang: OnboardLang): void {
  localStorage.setItem(LANG_KEY, lang);
}

export function isOnboardDone(): boolean {
  return localStorage.getItem(DONE_KEY) === '1';
}

export function markOnboardDone(): void {
  localStorage.setItem(DONE_KEY, '1');
}

export function loadPasskeyId(): string | null {
  return localStorage.getItem(CRED_KEY);
}

export function savePasskeyId(id: string): void {
  localStorage.setItem(CRED_KEY, id);
}

export function loadStamps(): ToolId[] {
  try {
    const raw = localStorage.getItem(STAMP_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isToolId);
  } catch {
    return [];
  }
}

export function saveStamp(id: ToolId): ToolId[] {
  const next = Array.from(new Set([...loadStamps(), id]));
  localStorage.setItem(STAMP_KEY, JSON.stringify(next));
  return next;
}

export function loadSelectedTool(): ToolId {
  try {
    const raw = localStorage.getItem(PICK_KEY);
    const parsed = raw ? (JSON.parse(raw) as { tool?: unknown; map?: unknown }) : {};
    if (isToolId(parsed.tool)) return parsed.tool;
    if (isToolId(parsed.map)) return parsed.map;
  } catch {
    /* ignore */
  }
  return 'poliradar';
}

export function saveSelectedTool(id: ToolId): ToolId {
  localStorage.setItem(PICK_KEY, JSON.stringify({ tool: id }));
  return id;
}
