export interface BoostMeterProps {
  boost: number;
  boostCapacity: number;
}

const FILLED_COLOR = 'var(--accent)';
const FULL_COLOR = 'var(--gold)';
const EMPTY_COLOR = 'var(--border)';

/**
 * A row of pips showing boost fill toward `boostCapacity` — full (climbing
 * speed doubled) reads distinctly via a different color, not just "all
 * pips lit," so the state change is legible at a glance. A filled-but-not-
 * full pip breathes gently (charging); once full, a light sweep travels
 * across the whole row on a loop (see `.boost-pip--charging` /
 * `.boost-pip-row--full` in index.css) — both skip entirely under
 * `prefers-reduced-motion`.
 */
export default function BoostMeter({ boost, boostCapacity }: BoostMeterProps) {
  const full = boost >= boostCapacity;
  return (
    <div data-testid="boost-meter" role="meter" aria-valuenow={boost} aria-valuemax={boostCapacity}>
      <div
        className={full ? 'boost-pip-row boost-pip-row--full' : 'boost-pip-row'}
        style={{ display: 'flex', gap: 4 }}
      >
        {Array.from({ length: boostCapacity }, (_, i) => {
          const filled = i < boost;
          const charging = filled && !full;
          return (
            <div
              key={i}
              data-testid={filled ? 'boost-pip-filled' : 'boost-pip-empty'}
              data-full={full && filled ? 'true' : undefined}
              className={charging ? 'boost-pip boost-pip--charging' : 'boost-pip'}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: !filled ? EMPTY_COLOR : full ? FULL_COLOR : FILLED_COLOR,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
