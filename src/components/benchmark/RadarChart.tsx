import { COLORES } from '../../types/benchmark';
import type { Dimension, Product, BenchmarkState } from '../../types/benchmark';

interface Props {
  dimensiones: Dimension[];
  productos: Product[];
  scores: BenchmarkState['scores'];
  size?: number;
}

function polarToXY(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

export function RadarChart({ dimensiones, productos, scores, size = 300 }: Props) {
  const activeDims = dimensiones.filter((d) => d.active);
  const n = activeDims.length;

  if (n < 3) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        Se necesitan al menos 3 dimensiones activas.
      </p>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const angleStep = (2 * Math.PI) / n;

  const gridPoints = (scale: number) =>
    activeDims
      .map((_, i) => {
        const pt = polarToXY(cx, cy, r * scale, i * angleStep);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

  const productPolygon = (prod: Product) =>
    activeDims
      .map((dim, i) => {
        const entry = scores[dim.id]?.[String(prod.id)];
        const val = entry ? entry.val : 0;
        const scale = Math.max(0, Math.min(5, val)) / 5;
        const pt = polarToXY(cx, cy, r * scale, i * angleStep);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {[0.25, 0.5, 0.75, 1.0].map((scale) => (
        <polygon
          key={scale}
          points={gridPoints(scale)}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      ))}

      {activeDims.map((_, i) => {
        const pt = polarToXY(cx, cy, r, i * angleStep);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={pt.x}
            y2={pt.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        );
      })}

      {activeDims.map((dim, i) => {
        const pt = polarToXY(cx, cy, r + 18, i * angleStep);
        return (
          <text
            key={dim.id}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.6)"
            fontFamily="var(--font-mono)"
          >
            {dim.label.slice(0, 12)}
          </text>
        );
      })}

      {productos.map((prod, idx) => (
        <polygon
          key={prod.id}
          points={productPolygon(prod)}
          fill={`${COLORES[idx % COLORES.length]}33`}
          stroke={COLORES[idx % COLORES.length]}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
