interface MrScorePillsProps {
  label: string;
  value: number;
  onChange: (score: number) => void;
}

/** Score 1–10; toggle off if same value. Horizontal scroll on narrow screens. */
export function MrScorePills({ label, value, onChange }: MrScorePillsProps) {
  return (
    <div className="mr-score-pills-wrap">
      <div className="mr-score-pills" role="group" aria-label={label}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const on = value === n;
          const low = on && n <= 5;
          return (
            <button
              key={n}
              type="button"
              className={`mr-score-pill${on ? ' mr-score-pill--on' : ''}${
                low ? ' mr-score-pill--low' : ''
              }`}
              aria-pressed={on}
              aria-label={`${label}: ${n} de 10`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
