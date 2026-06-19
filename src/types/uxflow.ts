export interface FlowStep {
  id: number;
  actor: string;
  action: string;
  channel: string;
  decision: string;
}

export interface Criterion {
  id: number;
  category: string;
  description: string;
}

export interface EdgeCase {
  id: number;
  trigger: string;
  impact: 'alto' | 'medio' | 'bajo';
  mitigation: string;
}

export interface FlowModel {
  actor: string;
  goal: string;
  linea: string;
  countries: string[];
  steps: FlowStep[];
  criteria: Criterion[];
  edgeCases: EdgeCase[];
}

export interface UxflowSession {
  id: number;
  titulo: string;
  linea: string;
  fecha: string;
  prompt: string;
  paises?: string;
  screenshot?: string | null;
  flow: FlowModel;
}

export interface UxflowTemplate {
  id: number;
  nombre: string;
  prompt: string;
  fecha: string;
}

export const LINEA_OPTIONS = [
  'Wealth Management',
  'Investment Management',
  'Corporate Solutions',
  'Otro',
] as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  Chile: '🇨🇱',
  Colombia: '🇨🇴',
  México: '🇲🇽',
  Perú: '🇵🇪',
  Uruguay: '🇺🇾',
  'El Salvador': '🇸🇻',
  Panamá: '🇵🇦',
  'República Dominicana': '🇩🇴',
};

export const COUNTRY_PHONES: Record<string, string | null> = {
  Chile: '+56 9',
  Colombia: '+57 3',
  México: '+52 1',
  Perú: null,
  Uruguay: '+598 9',
  'El Salvador': '+503 7',
  Panamá: '+507 6',
  'República Dominicana': '+1 809',
};

export const UXFLOW_STORAGE_KEY = 'uxflow-historial';
export const UXFLOW_TEMPLATES_KEY = 'uxflow-templates';
