export const FIGMA_SITE = 'https://trill-scheme-71219616.figma.site/';

export const POLIRADAR_CANON =
  'https://vientonorte.github.io/uxtools/app.html#/poliradar';

export function poliradarShareUrl(): string {
  if (typeof window === 'undefined') return POLIRADAR_CANON;
  const { origin, pathname } = window.location;
  if (origin.includes('127.0.0.1') || origin.includes('localhost')) {
    return `${origin}${pathname}#/poliradar`;
  }
  return POLIRADAR_CANON;
}
