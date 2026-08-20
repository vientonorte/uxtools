import type { OnboardLang } from './onboarding-i18n';
import type { SprintDay } from './onboarding-sprint';

const LANG_KEY = 'uxtools-onboard-lang';
const DONE_KEY = 'uxtools-onboard-done';
const CRED_KEY = 'uxtools-onboard-cred';

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

const STAMP_KEY = 'uxtools-onboard-stamps';
const PICK_KEY = 'uxtools-onboard-picks';

export interface OnboardPicks {
  map?: string;
  sketch?: string;
  decide?: string;
}

export function loadStamps(): SprintDay[] {
  try {
    const raw = localStorage.getItem(STAMP_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is SprintDay =>
        d === 'map' ||
        d === 'sketch' ||
        d === 'decide' ||
        d === 'prototype' ||
        d === 'test'
    );
  } catch {
    return [];
  }
}

export function saveStamp(day: SprintDay): SprintDay[] {
  const next = Array.from(new Set([...loadStamps(), day]));
  localStorage.setItem(STAMP_KEY, JSON.stringify(next));
  return next;
}

export function loadPicks(): OnboardPicks {
  try {
    const raw = localStorage.getItem(PICK_KEY);
    return raw ? (JSON.parse(raw) as OnboardPicks) : {};
  } catch {
    return {};
  }
}

export function savePicks(partial: OnboardPicks): OnboardPicks {
  const next = { ...loadPicks(), ...partial };
  localStorage.setItem(PICK_KEY, JSON.stringify(next));
  return next;
}
