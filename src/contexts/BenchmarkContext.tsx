import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  BenchmarkState,
  BenchmarkSession,
  Dimension,
  Product,
  ScoreEntry,
  INITIAL_STATE,
  BENCHMARK_STORAGE_KEY,
  DIMENSIONES_DEFAULT,
  DIMENSIONES_STORAGE_KEY,
} from '../types/benchmark';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface BenchmarkContextValue {
  state: BenchmarkState;
  dimensiones: Dimension[];
  setPaso: (paso: 1 | 2 | 3) => void;
  setConfig: (config: { nombre: string; analista: string }) => void;
  setProductos: (productos: Product[]) => void;
  setScore: (dimId: string, prodId: number, entry: ScoreEntry) => void;
  setNota: (dimId: string, prodId: number, nota: string) => void;
  guardarSesion: () => number;
  cargarSesion: (session: BenchmarkSession) => void;
  nuevoBenchmark: () => void;
  eliminarSesion: (id: number) => void;
  setDimensiones: (dims: Dimension[]) => void;
}

const BenchmarkContext = createContext<BenchmarkContextValue | null>(null);

export function BenchmarkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<BenchmarkState>(BENCHMARK_STORAGE_KEY, INITIAL_STATE);
  const [dimensiones, setDimensiones] = useLocalStorage<Dimension[]>(
    DIMENSIONES_STORAGE_KEY,
    DIMENSIONES_DEFAULT
  );

  const setPaso = useCallback(
    (paso: 1 | 2 | 3) => setState((s) => ({ ...s, paso })),
    [setState]
  );

  const setConfig = useCallback(
    (config: { nombre: string; analista: string }) => setState((s) => ({ ...s, config })),
    [setState]
  );

  const setProductos = useCallback(
    (productos: Product[]) => setState((s) => ({ ...s, productos })),
    [setState]
  );

  const setScore = useCallback(
    (dimId: string, prodId: number, entry: ScoreEntry) =>
      setState((s) => ({
        ...s,
        scores: {
          ...s.scores,
          [dimId]: { ...s.scores[dimId], [String(prodId)]: entry },
        },
      })),
    [setState]
  );

  const setNota = useCallback(
    (dimId: string, prodId: number, nota: string) =>
      setState((s) => ({
        ...s,
        notas: {
          ...s.notas,
          [dimId]: { ...s.notas[dimId], [String(prodId)]: nota },
        },
      })),
    [setState]
  );

  const guardarSesion = useCallback(() => {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const nombre = state.config.nombre || 'Benchmark sin título';
    const version =
      state.historial.filter((h) => h.nombre === nombre).length + 1;
    const session: BenchmarkSession = {
      id: now.getTime(),
      nombre,
      version,
      analista: state.config.analista,
      fecha,
      dimensiones: dimensiones.filter((d) => d.active),
      productos: state.productos,
      scores: state.scores,
      notas: state.notas,
    };
    setState((s) => ({
      ...s,
      historial: [session, ...s.historial].slice(0, 10),
    }));
    return version;
  }, [state, dimensiones, setState]);

  const cargarSesion = useCallback(
    (session: BenchmarkSession) => {
      setState((s) => ({
        ...s,
        paso: 1,
        config: { nombre: session.nombre, analista: session.analista },
        productos: session.productos,
        scores: session.scores,
        notas: session.notas ?? {},
      }));
    },
    [setState]
  );

  const nuevoBenchmark = useCallback(() => {
    setState((s) => ({
      ...INITIAL_STATE,
      historial: s.historial,
    }));
  }, [setState]);

  const eliminarSesion = useCallback(
    (id: number) =>
      setState((s) => ({
        ...s,
        historial: s.historial.filter((h) => h.id !== id),
      })),
    [setState]
  );

  return (
    <BenchmarkContext.Provider
      value={{
        state,
        dimensiones,
        setPaso,
        setConfig,
        setProductos,
        setScore,
        setNota,
        guardarSesion,
        cargarSesion,
        nuevoBenchmark,
        eliminarSesion,
        setDimensiones,
      }}
    >
      {children}
    </BenchmarkContext.Provider>
  );
}

export function useBenchmark() {
  const ctx = useContext(BenchmarkContext);
  if (!ctx) throw new Error('useBenchmark must be used within BenchmarkProvider');
  return ctx;
}
