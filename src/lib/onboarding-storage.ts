import type { OnboardLang } from './onboarding-i18n';

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
