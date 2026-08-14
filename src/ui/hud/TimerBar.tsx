export interface TimerBarProps {
  /** 0 (out of time) to 1 (just started). */
  fraction: number;
}

const TRACK_COLOR = 'var(--border)';
const SAFE_COLOR = 'var(--pine)';
const WARNING_COLOR = '#f0a020';
const URGENT_COLOR = 'var(--danger)';

function colorFor(fraction: number): string {
  if (fraction > 0.5) return SAFE_COLOR;
  if (fraction > 0.2) return WARNING_COLOR;
  return URGENT_COLOR;
}

/** A countdown bar for the current question's time limit, green-to-red as it drains. */
export default function TimerBar({ fraction }: TimerBarProps) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div
      data-testid="timer-bar"
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: '100%',
        height: 12,
        background: TRACK_COLOR,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div
        data-testid="timer-bar-fill"
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          background: colorFor(clamped),
          transition: 'width 100ms linear, background-color 200ms linear',
        }}
      />
    </div>
  );
}
