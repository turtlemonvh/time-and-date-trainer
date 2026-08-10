import { formatTime12 } from '../../engine/timeMath';
import type { TimeOfDay } from '../../engine/timeMath';
import { pad } from '../questionDisplay';

export interface DigitalClockProps {
  time: TimeOfDay;
  showSeconds?: boolean;
  /** 24-hour display (difficulty 8+ per the design spec) vs. 12-hour AM/PM. */
  hour24?: boolean;
}

export default function DigitalClock({
  time,
  showSeconds = false,
  hour24 = false,
}: DigitalClockProps) {
  const label = hour24
    ? `${pad(time.hour)}:${pad(time.minute)}${showSeconds ? `:${pad(time.second)}` : ''}`
    : formatTime12(time, { seconds: showSeconds });
  return (
    <span className="digital-clock" data-testid="digital-clock">
      {label}
    </span>
  );
}
