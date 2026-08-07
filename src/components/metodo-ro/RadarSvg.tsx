import {
  CLAVE_A_HEX,
  SELFRADAR_AXES,
  type SelfradarAxisScore,
} from '../../types/metodo-ro';

interface RadarSvgProps {
  scores: Record<string, SelfradarAxisScore>;
  size?: number;
}

export function RadarSvg({ scores, size = 280 }: RadarSvgProps) {
  const n = SELFRADAR_AXES.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const levels = 5;

  function point(i: number, r: number) {
    const ang = Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + r * Math.cos(ang),
      y: cy + r * Math.sin(ang),
    };
  }

  const rings = Array.from({ length: levels }, (_, lv) => {
    const r = (R * (lv + 1)) / levels;
    const d = SELFRADAR_AXES.map((_, i) => {
      const p = point(i, r);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ') + ' Z';
    return d;
  });

  const polyPoints = SELFRADAR_AXES.map((axis, i) => {
    const sc = scores[axis.id]?.score ?? 0;
    const r = sc > 0 ? (R * sc) / 10 : 0;
    const p = point(i, r);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Radar de scores Selfradar, escala 1 a 10"
    >
      <title>Selfradar scores</title>
      {rings.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      ))}
      {SELFRADAR_AXES.map((_, i) => {
        const p = point(i, R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={polyPoints}
        fill="rgba(0,181,226,0.28)"
        stroke="var(--cyan, #00B5E2)"
        strokeWidth={2}
      />
      {SELFRADAR_AXES.map((axis, i) => {
        const sc = scores[axis.id]?.score ?? 0;
        const r = sc > 0 ? (R * sc) / 10 : 0;
        const p = point(i, r);
        const labelR = R + 18;
        const lp = point(i, labelR);
        return (
          <g key={axis.id}>
            {sc > 0 && (
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill={CLAVE_A_HEX[axis.color]}
                stroke="#001A72"
                strokeWidth={1}
              />
            )}
            <circle
              cx={lp.x}
              cy={lp.y}
              r={3}
              fill={CLAVE_A_HEX[axis.color]}
            />
            <text
              x={lp.x}
              y={lp.y + (lp.y > cy ? 12 : -8)}
              textAnchor="middle"
              fill="rgba(255,255,255,0.85)"
              fontSize={10}
              fontFamily="Space Grotesk, sans-serif"
            >
              {axis.short}
            </text>
          </g>
        );
      })}
      {[2, 4, 6, 8, 10].map((sc, i) => {
        const r = (R * (i + 1)) / levels;
        return (
          <text
            key={sc}
            x={cx + 4}
            y={cy - r + 3}
            fill="rgba(255,255,255,0.35)"
            fontSize={9}
            fontFamily="DM Mono, monospace"
          >
            {sc}
          </text>
        );
      })}
    </svg>
  );
}
