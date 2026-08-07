/** Método Ro · Selfradar + Kit TLP (Bullet Ro / bujo-ro v1.2) */

export const SELFRADAR_STORAGE_KEY = 'uxtools-selfradar-sessions';
export const KIT_TLP_STORAGE_KEY = 'uxtools-kit-tlp-sessions';

export type ClaveAColor = 'rosa' | 'gris' | 'verde' | 'naranja' | 'amarillo';

export interface SelfradarAxisDef {
  id: string;
  label: string;
  short: string;
  color: ClaveAColor;
}

/** Dimensiones fijas Selfradar Rö — no reinventar cada semana */
export const SELFRADAR_AXES: SelfradarAxisDef[] = [
  { id: 'cuerpo', label: 'Cuerpo / salud', short: 'Cuerpo', color: 'rosa' },
  { id: 'descanso', label: 'Descanso / buen vivir', short: 'Descanso', color: 'rosa' },
  { id: 'vinculos', label: 'Vínculos', short: 'Vínculos', color: 'gris' },
  { id: 'camila', label: 'Camila / pareja', short: 'Camila', color: 'verde' },
  { id: 'trabajo', label: 'Trabajo / VN', short: 'Trabajo/VN', color: 'naranja' },
  { id: 'dinero', label: 'Dinero / finanzas', short: 'Dinero', color: 'amarillo' },
  { id: 'estudio', label: 'Estudio / contra-archivo', short: 'Estudio', color: 'naranja' },
];

export interface SelfradarAxisScore {
  score: number; // 0 = sin marcar, 1–10
  action: string;
}

export interface SelfradarSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  date: string;
  weekFrom: string;
  weekTo: string;
  bulletPage: string;
  scores: Record<string, SelfradarAxisScore>;
  qConseguir: string;
  qObservado: string;
  qAprendido: string;
  qNecesito: string;
  reflexiones: string;
  aprendiendo: string;
  necesito: string;
  observo: string;
  sonrisaPersonal: string;
  sonrisaCamila: string;
  sonrisaLaboral: string;
  reviewPersonal: string;
  reviewLaboral: string;
  reviewCamila: string;
  accionesPersonal: string;
  accionesLaboral: string;
  accionesCamila: string;
  notaCierre: string;
}

export function emptyAxisScores(): Record<string, SelfradarAxisScore> {
  return Object.fromEntries(
    SELFRADAR_AXES.map((a) => [a.id, { score: 0, action: '' }])
  );
}

export function createSelfradarSession(): SelfradarSession {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: genId('sr'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    date: today,
    weekFrom: today,
    weekTo: today,
    bulletPage: '',
    scores: emptyAxisScores(),
    qConseguir: '',
    qObservado: '',
    qAprendido: '',
    qNecesito: '',
    reflexiones: '',
    aprendiendo: '',
    necesito: '',
    observo: '',
    sonrisaPersonal: '',
    sonrisaCamila: '',
    sonrisaLaboral: '',
    reviewPersonal: '',
    reviewLaboral: '',
    reviewCamila: '',
    accionesPersonal: '',
    accionesLaboral: '',
    accionesCamila: '',
    notaCierre: '',
  };
}

export type HelpChannel = 'vinculos' | 'comunidad' | 'terapias' | 'naturaleza';

export interface KitTlpSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  date: string;
  time: string;
  intensity: number; // 1–10
  bulletPage: string;
  sucedio: string;
  senti: string;
  gatillo: string;
  acciones: string;
  stopRespira: string;
  stopObserva: string;
  stopProcesa: string;
  coping: string;
  distinto: string;
  helpChannels: HelpChannel[];
  helpNotes: string;
  linkedSelfradar: boolean;
}

export function createKitTlpSession(): KitTlpSession {
  const now = new Date();
  return {
    id: genId('tlp'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    intensity: 5,
    bulletPage: '',
    sucedio: '',
    senti: '',
    gatillo: '',
    acciones: '',
    stopRespira: '',
    stopObserva: '',
    stopProcesa: '',
    coping: '',
    distinto: '',
    helpChannels: [],
    helpNotes: '',
    linkedSelfradar: false,
  };
}

export function genId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const CLAVE_A_HEX: Record<ClaveAColor, string> = {
  rosa: '#E8A0B0',
  gris: '#9AA0A6',
  verde: '#5CB8A8',
  naranja: '#E8A060',
  amarillo: '#E8D060',
};
