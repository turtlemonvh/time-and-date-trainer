import { useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { to24Hour, type TimeOfDay, type TimePrecision } from '../../engine/timeMath';
import PixelCanvas from '../pixel/PixelCanvas';
import { generateClockFace } from '../pixel/clockFace';

// Higher than the 33-cell grid used elsewhere in the pixel-art system
// (characters, mountains) — a circle is the hardest shape for chunky pixel
// art to render legibly, and a lower-density face read as too blocky to
// place minute ticks and numerals on. `clockFace.ts`'s band widths scale
// with diameter, so this stays proportioned the same way, just
// finer-grained. At 129 the circumference is ~405 cells, ~6.75 apart at
// the 60 minute-tick positions — dense enough for clean 1-cell ticks.
const FACE_DIAMETER = 129;
const FACE_PALETTE = {
  face: '#fdf6e3',
  rim: '#3a2e1f',
  tick: '#8a7960',
  majorTick: '#3a2e1f',
  minuteTick: '#c9bda3',
};
const SECOND_HAND_COLOR = '#c0392b';
const NUMERAL_RADIUS_FRACTION = 0.34;
const NUMERALS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

const PRECISION_STEP_MINUTES: Record<TimePrecision, number> = {
  hour: 60,
  half: 30,
  quarter: 15,
  five: 5,
  minute: 1,
  second: 1,
};

export interface AnalogClockProps {
  time: TimeOfDay;
  showSeconds?: boolean;
  /**
   * Target on-screen size in px. `PixelCanvas` only renders crisply at an
   * integer `scale` (see its own doc comment), so the actual rendered size
   * is `FACE_DIAMETER` times the nearest integer scale to `size /
   * FACE_DIAMETER` — not necessarily `size` itself. Everything else in this
   * component (hands, numerals) lays out against that actual size, not the
   * requested one, so the whole widget stays pixel-aligned.
   */
  size?: number;
  /** Numerals 1-12 around the face. Defaults on; difficulty turns this off
   * at high levels as a deliberate challenge, per `clockNumerals` in
   * `difficulty.ts`. */
  showNumerals?: boolean;
  /** Minute-hand drag snapping. Only relevant when `onHandChange` is set. */
  precision?: TimePrecision;
  /** Presence makes the hour and minute hands draggable. */
  onHandChange?: (next: TimeOfDay) => void;
}

type Dragging = 'hour' | 'minute' | null;

/**
 * A pixel-art clock face (`PixelCanvas` + `generateClockFace`) with hands
 * and numerals drawn as an SVG overlay in the same coordinate space. Hands
 * are SVG, not pixel-grid, because dragging needs a real hit-testable
 * element and fractional angles — a raster redraw-per-frame would fight
 * both. Numerals are SVG text for the same reason chunky pixel digits were
 * rejected for the body font (see M4.5): a legible face is the point.
 */
export default function AnalogClock({
  time,
  showSeconds = false,
  size = 260,
  showNumerals = true,
  precision = 'minute',
  onHandChange,
}: AnalogClockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const interactive = Boolean(onHandChange);

  const face = useMemo(() => generateClockFace(FACE_DIAMETER), []);
  const scale = Math.max(1, Math.round(size / FACE_DIAMETER));
  const actualSize = scale * FACE_DIAMETER;

  const hourAngle = ((time.hour % 12) + time.minute / 60) * 30;
  const minuteAngle = time.minute * 6 + time.second / 10;
  const secondAngle = time.second * 6;

  const angleFromPointer = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  }, []);

  const applyDrag = useCallback(
    (which: Dragging, clientX: number, clientY: number) => {
      if (!which || !onHandChange) return;
      const angle = angleFromPointer(clientX, clientY);
      if (which === 'minute') {
        const step = PRECISION_STEP_MINUTES[precision];
        const minute = (Math.round(angle / 6 / step) * step) % 60;
        onHandChange({ ...time, minute, second: 0 });
      } else {
        const hour12 = Math.round(angle / 30) % 12 || 12;
        const isPM = time.hour >= 12;
        onHandChange({ ...time, hour: to24Hour(hour12, isPM) });
      }
    },
    [angleFromPointer, onHandChange, precision, time],
  );

  const startDrag = useCallback(
    (which: Dragging) => (event: ReactPointerEvent<SVGLineElement>) => {
      if (!interactive) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(which);
      applyDrag(which, event.clientX, event.clientY);
    },
    [applyDrag, interactive],
  );

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    applyDrag(dragging, event.clientX, event.clientY);
  }

  function endDrag() {
    setDragging(null);
  }

  const center = actualSize / 2;

  function handPoint(angleDeg: number, length: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: center + Math.sin(rad) * length, y: center - Math.cos(rad) * length };
  }

  const hourPoint = handPoint(hourAngle, actualSize * 0.28);
  const minutePoint = handPoint(minuteAngle, actualSize * 0.4);
  const secondPoint = handPoint(secondAngle, actualSize * 0.42);
  const numeralRadius = actualSize * NUMERAL_RADIUS_FRACTION;

  return (
    <div
      style={{ position: 'relative', width: actualSize, height: actualSize }}
      data-testid="analog-clock"
    >
      <PixelCanvas sprite={face} palette={FACE_PALETTE} scale={scale} />
      <svg
        ref={svgRef}
        width={actualSize}
        height={actualSize}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {showNumerals &&
          NUMERALS.map((label, i) => {
            const point = handPoint(i * 30, numeralRadius);
            return (
              <text
                key={label}
                data-testid="analog-clock-numeral"
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--sans)"
                fontWeight={700}
                fontSize={actualSize * 0.09}
                fill={FACE_PALETTE.rim}
              >
                {label}
              </text>
            );
          })}
        {showSeconds && (
          <line
            data-testid="analog-clock-second-hand"
            x1={center}
            y1={center}
            x2={secondPoint.x}
            y2={secondPoint.y}
            stroke={SECOND_HAND_COLOR}
            strokeWidth={actualSize * 0.012}
          />
        )}
        <line
          data-testid="analog-clock-hour-hand"
          x1={center}
          y1={center}
          x2={hourPoint.x}
          y2={hourPoint.y}
          stroke={FACE_PALETTE.rim}
          strokeWidth={actualSize * 0.045}
          strokeLinecap="round"
          onPointerDown={startDrag('hour')}
          style={{
            cursor: interactive ? 'grab' : undefined,
            pointerEvents: interactive ? 'stroke' : 'none',
          }}
        />
        <line
          data-testid="analog-clock-minute-hand"
          x1={center}
          y1={center}
          x2={minutePoint.x}
          y2={minutePoint.y}
          stroke={FACE_PALETTE.rim}
          strokeWidth={actualSize * 0.03}
          strokeLinecap="round"
          onPointerDown={startDrag('minute')}
          style={{
            cursor: interactive ? 'grab' : undefined,
            pointerEvents: interactive ? 'stroke' : 'none',
          }}
        />
        <circle cx={center} cy={center} r={actualSize * 0.02} fill={FACE_PALETTE.rim} />
      </svg>
    </div>
  );
}
