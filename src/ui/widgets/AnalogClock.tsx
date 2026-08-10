import { useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TimeOfDay, TimePrecision } from '../../engine/timeMath';
import PixelCanvas from '../pixel/PixelCanvas';
import { generateClockFace } from '../pixel/clockFace';

const FACE_DIAMETER = 33;
const FACE_PALETTE = {
  face: '#fdf6e3',
  rim: '#3a2e1f',
  tick: '#8a7960',
  majorTick: '#3a2e1f',
};
const SECOND_HAND_COLOR = '#c0392b';

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
  size?: number;
  /** Minute-hand drag snapping. Only relevant when `onHandChange` is set. */
  precision?: TimePrecision;
  /** Presence makes the hour and minute hands draggable. */
  onHandChange?: (next: TimeOfDay) => void;
}

type Dragging = 'hour' | 'minute' | null;

/**
 * A pixel-art clock face (`PixelCanvas` + `generateClockFace`) with hands
 * drawn as an SVG overlay in the same coordinate space. Hands are SVG, not
 * pixel-grid, because dragging needs a real hit-testable element and
 * fractional angles — a raster redraw-per-frame would fight both.
 */
export default function AnalogClock({
  time,
  showSeconds = false,
  size = 160,
  precision = 'minute',
  onHandChange,
}: AnalogClockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const interactive = Boolean(onHandChange);

  const face = useMemo(() => generateClockFace(FACE_DIAMETER), []);
  const scale = size / FACE_DIAMETER;

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
        const hour = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : hour12 === 12 ? 0 : hour12;
        onHandChange({ ...time, hour });
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

  const center = size / 2;

  function handPoint(angleDeg: number, length: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: center + Math.sin(rad) * length, y: center - Math.cos(rad) * length };
  }

  const hourPoint = handPoint(hourAngle, size * 0.28);
  const minutePoint = handPoint(minuteAngle, size * 0.4);
  const secondPoint = handPoint(secondAngle, size * 0.42);

  return (
    <div style={{ position: 'relative', width: size, height: size }} data-testid="analog-clock">
      <PixelCanvas sprite={face} palette={FACE_PALETTE} scale={scale} />
      <svg
        ref={svgRef}
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {showSeconds && (
          <line
            data-testid="analog-clock-second-hand"
            x1={center}
            y1={center}
            x2={secondPoint.x}
            y2={secondPoint.y}
            stroke={SECOND_HAND_COLOR}
            strokeWidth={size * 0.012}
          />
        )}
        <line
          data-testid="analog-clock-hour-hand"
          x1={center}
          y1={center}
          x2={hourPoint.x}
          y2={hourPoint.y}
          stroke={FACE_PALETTE.rim}
          strokeWidth={size * 0.045}
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
          strokeWidth={size * 0.03}
          strokeLinecap="round"
          onPointerDown={startDrag('minute')}
          style={{
            cursor: interactive ? 'grab' : undefined,
            pointerEvents: interactive ? 'stroke' : 'none',
          }}
        />
        <circle cx={center} cy={center} r={size * 0.02} fill={FACE_PALETTE.rim} />
      </svg>
    </div>
  );
}
