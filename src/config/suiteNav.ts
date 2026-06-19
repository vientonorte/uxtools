export type SuiteModuleId =
  | 'suite'
  | 'benchmark'
  | 'uxflow'
  | 'eisenhower'
  | 'voc'
  | 'admin'
  | 'brief';

export interface SuiteModule {
  id: SuiteModuleId;
  label: string;
  shortLabel: string;
  logo: string;
  badge?: string;
  spaPath?: string;
  staticPath?: string;
  variant?: 'default' | 'admin';
}

/** Allowlist — security by design for external targets */
export const EXTERNAL_LINKS = {
  vientonorte: 'https://vientonorte.github.io/',
  github: 'https://github.com/vientonorte/uxtools',
} as const;

export const SUITE_MODULES: SuiteModule[] = [
  {
    id: 'suite',
    label: 'UX Tools',
    shortLabel: 'Suite',
    logo: 'UXT',
    badge: 'Hub',
    spaPath: '/',
    staticPath: 'index.html',
  },
  {
    id: 'benchmark',
    label: 'UX Benchmark',
    shortLabel: 'Benchmark',
    logo: 'BM',
    badge: 'v2.0',
    spaPath: '/benchmark',
    staticPath: 'benchmark.html',
  },
  {
    id: 'uxflow',
    label: 'UXFLOW',
    shortLabel: 'UXFlow',
    logo: 'UXF',
    badge: 'v1.0',
    spaPath: '/uxflow',
    staticPath: 'uxflow.html',
  },
  {
    id: 'eisenhower',
    label: 'Operating Model DX',
    shortLabel: 'DX',
    logo: 'DX',
    badge: 'v1.0',
    staticPath: 'eisenhower.html',
  },
  {
    id: 'voc',
    label: 'Mapa Vocacional',
    shortLabel: 'VOC',
    logo: 'VOC',
    badge: 'v2',
    staticPath: 'voc.html',
  },
  {
    id: 'brief',
    label: 'Brief de Campaña',
    shortLabel: 'Brief',
    logo: 'BRF',
    badge: 'Nuevo',
    spaPath: '/brief',
  },
  {
    id: 'admin',
    label: 'Content Manager',
    shortLabel: 'Admin',
    logo: 'UXT',
    badge: 'Admin',
    spaPath: '/admin',
    staticPath: 'admin.html',
    variant: 'admin',
  },
];

export const NAV_MODULE_LINKS = SUITE_MODULES.filter((m) => m.id !== 'suite');

export function getModuleById(id: SuiteModuleId): SuiteModule {
  return SUITE_MODULES.find((m) => m.id === id) ?? SUITE_MODULES[0];
}