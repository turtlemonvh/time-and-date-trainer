import { useState } from 'react';
import type { TimeOfDay, TimePrecision } from '../../engine/timeMath';
import AnalogClock from '../widgets/AnalogClock';
import DigitalClock from '../widgets/DigitalClock';

const PRECISIONS: TimePrecision[] = ['hour', 'half', 'quarter', 'five', 'minute', 'second'];

const STATIC_TIMES: TimeOfDay[] = [
  { hour: 0, minute: 0, second: 0 },
  { hour: 3, minute: 15, second: 0 },
  { hour: 6, minute: 30, second: 0 },
  { hour: 9, minute: 45, second: 0 },
  { hour: 14, minute: 7, second: 42 },
];

/**
 * Dev-only gallery for M3 widgets, mirroring `/debug/sprites`'s role for
 * M2 — a place to see every widget rendered and interact with the
 * draggable ones without playing through the real game. Grows one widget
 * per PR as M3 lands.
 */
export default function DebugWidgetsPage() {
  const [interactiveTime, setInteractiveTime] = useState<TimeOfDay>({
    hour: 10,
    minute: 10,
    second: 0,
  });
  const [precision, setPrecision] = useState<TimePrecision>('five');

  return (
    <main>
      <h1>Debug: widgets</h1>
      <p>Dev-only. Not shipped to production — see CONTRIBUTING for how to reach this page.</p>

      <h2>AnalogClock — read-only</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {STATIC_TIMES.map((time) => (
          <div key={`${time.hour}:${time.minute}:${time.second}`}>
            <AnalogClock time={time} showSeconds={time.second > 0} />
            <p>
              <DigitalClock time={time} showSeconds={time.second > 0} />
            </p>
          </div>
        ))}
      </div>

      <h2>AnalogClock — draggable hands</h2>
      <p>
        <label htmlFor="widgets-precision">Snap precision</label>{' '}
        <select
          id="widgets-precision"
          data-testid="widgets-precision"
          value={precision}
          onChange={(event) => setPrecision(event.target.value as TimePrecision)}
        >
          {PRECISIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </p>
      <AnalogClock
        time={interactiveTime}
        precision={precision}
        onHandChange={setInteractiveTime}
        size={220}
      />
      <p>
        <DigitalClock time={interactiveTime} />
      </p>

      <h2>DigitalClock — 12h vs 24h</h2>
      <p>
        <DigitalClock time={{ hour: 14, minute: 5, second: 0 }} /> vs{' '}
        <DigitalClock time={{ hour: 14, minute: 5, second: 0 }} hour24 />
      </p>
    </main>
  );
}
