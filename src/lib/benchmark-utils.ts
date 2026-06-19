import type { BenchmarkSession, Dimension, Product } from '../types/benchmark';
import { DIMENSIONES_DEFAULT } from '../types/benchmark';

export type SessionSummary = {
  productos: number;
  dimensiones: number;
  maxScore: number;
  leaderName: string;
  leaderTotal: number;
  leaderAverage: string;
};

type LegacyDimension = Dimension & { nombre?: string; activa?: boolean };

function getSessionDimensions(session: BenchmarkSession): { id: string; label: string }[] {
  if (session.dimensiones?.length) {
    return (session.dimensiones as LegacyDimension[])
      .filter((d) => d.active ?? d.activa ?? true)
      .map((d) => ({ id: d.id, label: d.label ?? d.nombre ?? d.id }));
  }
  return DIMENSIONES_DEFAULT.filter((d) => d.active).map((d) => ({ id: d.id, label: d.label }));
}

function getSessionScoreVal(session: BenchmarkSession, dimId: string, prodId: number): number {
  const entry = session.scores[dimId]?.[String(prodId)];
  if (!entry) return 0;
  if (typeof entry === 'number') return entry;
  return entry.val ?? 0;
}

export function summarizeSession(session: BenchmarkSession): SessionSummary {
  const dims = getSessionDimensions(session);
  const productos: Product[] = session.productos ?? [];
  const maxScore = dims.length * 5;
  let leaderName = 'Sin datos';
  let leaderTotal = 0;

  productos.forEach((p) => {
    const total = dims.reduce((acc, dim) => acc + getSessionScoreVal(session, dim.id, p.id), 0);
    if (leaderName === 'Sin datos' || total > leaderTotal) {
      leaderName = p.nombre;
      leaderTotal = total;
    }
  });

  return {
    productos: productos.length,
    dimensiones: dims.length,
    maxScore,
    leaderName,
    leaderTotal,
    leaderAverage: dims.length ? (leaderTotal / dims.length).toFixed(1) : '0.0',
  };
}

export function countUniqueBenchmarkNames(sessions: BenchmarkSession[]): number {
  const names = new Set(sessions.map((s) => s.nombre).filter(Boolean));
  return names.size;
}