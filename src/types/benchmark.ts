export interface Dimension {
  id: string;
  label: string;
  active: boolean;
}

export interface Product {
  id: number;
  nombre: string;
  imagen: string | null;
}

export interface ScoreEntry {
  val: number;
  screenshot: string | null;
}

export interface BenchmarkSession {
  id: number;
  nombre: string;
  analista: string;
  fecha: string;
  dimensiones: Dimension[];
  productos: Product[];
  scores: Record<string, Record<string, ScoreEntry>>;
  notas: Record<string, Record<string, string>>;
}

export interface BenchmarkState {
  paso: 1 | 2 | 3;
  config: { nombre: string; analista: string };
  productos: Product[];
  scores: Record<string, Record<string, ScoreEntry>>;
  notas: Record<string, Record<string, string>>;
  historial: BenchmarkSession[];
}

export const DIMENSIONES_DEFAULT: Dimension[] = [
  { id: 'd1', label: 'Primera Impresión',   active: true },
  { id: 'd2', label: 'Navegación',           active: true },
  { id: 'd3', label: 'Usabilidad',           active: true },
  { id: 'd4', label: 'Diseño Visual',        active: true },
  { id: 'd5', label: 'Accesibilidad',        active: true },
  { id: 'd6', label: 'Performance',          active: true },
  { id: 'd7', label: 'Experiencia Mobile',   active: true },
  { id: 'd8', label: 'Conversión',           active: true },
];

export const COLORES = ['#00B5E2', '#0033A0', '#3DBA6F', '#FF8C00', '#9B59B6'];

export const BENCHMARK_STORAGE_KEY = 'uxbenchmark-state';
export const DIMENSIONES_STORAGE_KEY = 'uxbenchmark-dimensiones';

export const INITIAL_STATE: BenchmarkState = {
  paso: 1,
  config: { nombre: '', analista: '' },
  productos: [],
  scores: {},
  notas: {},
  historial: [],
};
