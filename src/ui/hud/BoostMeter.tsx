export interface BoostMeterProps {
  boost: number;
  boostCapacity: number;
}

const FILLED_COLOR = '#3a86ff';
const FULL_COLOR = '#ffb703';
const EMPTY_COLOR = '#e5e4e7';

/**
 * A row of pips showing boost fill toward `boostCapacity` — full (climbing
 * speed doubled) reads distinctly via a different color, not just "all
 * pips lit," so the state change is legible at a glance.
 */
export default function BoostMeter({ boost, boostCapacity }: BoostMeterProps) {
  const full = boost >= boostCapacity;
  return (
    <div data-testid="boost-meter" role="meter" aria-valuenow={boost} aria-valuemax={boostCapacity}>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: boostCapacity }, (_, i) => (
          <div
            key={i}
            data-testid={i < boost ? 'boost-pip-filled' : 'boost-pip-empty'}
            data-full={full && i < boost ? 'true' : undefined}
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: i >= boost ? EMPTY_COLOR : full ? FULL_COLOR : FILLED_COLOR,
            }}
          />
        ))}
      </div>
    </div>
  );
}
