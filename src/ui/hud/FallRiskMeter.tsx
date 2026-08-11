export interface FallRiskMeterProps {
  fallRisk: number;
  fallRiskCapacity: number;
}

const FILLED_COLOR = '#c0392b';
const EMPTY_COLOR = '#e5e4e7';

/**
 * A row of pips showing accumulated misses toward `fallRiskCapacity` — the
 * inverse of `BoostMeter`: filling up is bad here (one more miss once full
 * causes a fall), so it's colored as a warning rather than a reward.
 */
export default function FallRiskMeter({ fallRisk, fallRiskCapacity }: FallRiskMeterProps) {
  return (
    <div
      data-testid="fall-risk-meter"
      role="meter"
      aria-valuenow={fallRisk}
      aria-valuemax={fallRiskCapacity}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: fallRiskCapacity }, (_, i) => (
          <div
            key={i}
            data-testid={i < fallRisk ? 'fall-risk-pip-filled' : 'fall-risk-pip-empty'}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: i < fallRisk ? FILLED_COLOR : EMPTY_COLOR,
            }}
          />
        ))}
      </div>
    </div>
  );
}
