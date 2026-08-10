import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AnalogClock from './AnalogClock';

// jsdom returns an all-zero rect from getBoundingClientRect, which would
// make every drag compute against a zero-size circle. Stub it to match the
// default `size` prop (160) so drag-angle math has real geometry to work
// against.
const RECT = {
  left: 0,
  top: 0,
  width: 160,
  height: 160,
  right: 160,
  bottom: 160,
  x: 0,
  y: 0,
  toJSON: () => {},
} as DOMRect;

beforeEach(() => {
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Pointer at the 3 o'clock position relative to the 160x160 face (center 80,80).
const THREE_OCLOCK = { clientX: 140, clientY: 80, pointerId: 1 };

describe('AnalogClock', () => {
  it('renders the face and both hands, but not the second hand by default', () => {
    render(<AnalogClock time={{ hour: 3, minute: 15, second: 0 }} />);
    expect(screen.getByTestId('analog-clock')).toBeInTheDocument();
    expect(screen.getByTestId('analog-clock-hour-hand')).toBeInTheDocument();
    expect(screen.getByTestId('analog-clock-minute-hand')).toBeInTheDocument();
    expect(screen.queryByTestId('analog-clock-second-hand')).not.toBeInTheDocument();
  });

  it('shows the second hand when showSeconds is set', () => {
    render(<AnalogClock time={{ hour: 3, minute: 15, second: 0 }} showSeconds />);
    expect(screen.getByTestId('analog-clock-second-hand')).toBeInTheDocument();
  });

  it('does not call onHandChange when no handler is provided (read-only)', () => {
    render(<AnalogClock time={{ hour: 2, minute: 0, second: 0 }} />);
    // Should not throw when dragged without a handler.
    fireEvent.pointerDown(screen.getByTestId('analog-clock-minute-hand'), THREE_OCLOCK);
  });

  it("dragging the minute hand to 3 o'clock snaps to the given precision", () => {
    const onHandChange = vi.fn();
    render(
      <AnalogClock
        time={{ hour: 2, minute: 2, second: 0 }}
        precision="quarter"
        onHandChange={onHandChange}
      />,
    );
    fireEvent.pointerDown(screen.getByTestId('analog-clock-minute-hand'), THREE_OCLOCK);
    expect(onHandChange).toHaveBeenCalledWith(expect.objectContaining({ minute: 15, second: 0 }));
  });

  it('dragging the minute hand snaps to 5-minute steps at "five" precision', () => {
    const onHandChange = vi.fn();
    render(
      <AnalogClock
        time={{ hour: 2, minute: 0, second: 0 }}
        precision="five"
        onHandChange={onHandChange}
      />,
    );
    // ~11 degrees past 12, between minute 1 and 2 — should snap to 0.
    fireEvent.pointerDown(screen.getByTestId('analog-clock-minute-hand'), {
      clientX: 80 + Math.sin((11 * Math.PI) / 180) * 60,
      clientY: 80 - Math.cos((11 * Math.PI) / 180) * 60,
      pointerId: 1,
    });
    expect(onHandChange).toHaveBeenCalledWith(expect.objectContaining({ minute: 0 }));
  });

  it("dragging the hour hand to 3 o'clock preserves PM", () => {
    const onHandChange = vi.fn();
    render(<AnalogClock time={{ hour: 14, minute: 0, second: 0 }} onHandChange={onHandChange} />);
    fireEvent.pointerDown(screen.getByTestId('analog-clock-hour-hand'), THREE_OCLOCK);
    expect(onHandChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 15 }));
  });

  it("dragging the hour hand to 3 o'clock preserves AM", () => {
    const onHandChange = vi.fn();
    render(<AnalogClock time={{ hour: 2, minute: 0, second: 0 }} onHandChange={onHandChange} />);
    fireEvent.pointerDown(screen.getByTestId('analog-clock-hour-hand'), THREE_OCLOCK);
    expect(onHandChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 3 }));
  });

  it('dragging the hour hand to 12 maps to noon or midnight, not 0/24', () => {
    const onHandChangePM = vi.fn();
    render(<AnalogClock time={{ hour: 14, minute: 0, second: 0 }} onHandChange={onHandChangePM} />);
    // Pointer straight up from center = 12 o'clock position.
    fireEvent.pointerDown(screen.getByTestId('analog-clock-hour-hand'), {
      clientX: 80,
      clientY: 20,
      pointerId: 1,
    });
    expect(onHandChangePM).toHaveBeenCalledWith(expect.objectContaining({ hour: 12 }));

    const onHandChangeAM = vi.fn();
    render(<AnalogClock time={{ hour: 2, minute: 0, second: 0 }} onHandChange={onHandChangeAM} />);
    fireEvent.pointerDown(screen.getAllByTestId('analog-clock-hour-hand')[1], {
      clientX: 80,
      clientY: 20,
      pointerId: 1,
    });
    expect(onHandChangeAM).toHaveBeenCalledWith(expect.objectContaining({ hour: 0 }));
  });

  it('continues to update on pointer move after the initial drag', () => {
    const onHandChange = vi.fn();
    render(
      <AnalogClock
        time={{ hour: 2, minute: 0, second: 0 }}
        precision="quarter"
        onHandChange={onHandChange}
      />,
    );
    const hand = screen.getByTestId('analog-clock-minute-hand');
    const svg = screen.getByTestId('analog-clock').querySelector('svg');
    fireEvent.pointerDown(hand, THREE_OCLOCK);
    onHandChange.mockClear();
    // Move to 6 o'clock.
    fireEvent.pointerMove(svg!, { clientX: 80, clientY: 140, pointerId: 1 });
    expect(onHandChange).toHaveBeenCalledWith(expect.objectContaining({ minute: 30 }));
  });
});
