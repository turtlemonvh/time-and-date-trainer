import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { describeTime, formatTime12, randomTime, to24Hour } from './timeMath';

describe('randomTime', () => {
  it('snaps to hour boundaries', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'hour');
      expect(t.minute).toBe(0);
      expect(t.second).toBe(0);
    }
  });

  it('snaps to half-hour boundaries', () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'half');
      expect([0, 30]).toContain(t.minute);
    }
  });

  it('snaps to quarter-hour boundaries', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'quarter');
      expect([0, 15, 30, 45]).toContain(t.minute);
    }
  });

  it('snaps to five-minute boundaries', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'five');
      expect(t.minute % 5).toBe(0);
    }
  });

  it('allows any minute at minute precision, with zero seconds', () => {
    const rng = mulberry32(5);
    const minutes = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const t = randomTime(rng, 'minute');
      minutes.add(t.minute);
      expect(t.second).toBe(0);
    }
    expect(minutes.size).toBeGreaterThan(10);
  });

  it('produces varied seconds at second precision', () => {
    const rng = mulberry32(6);
    const seconds = new Set<number>();
    for (let i = 0; i < 300; i++) {
      seconds.add(randomTime(rng, 'second').second);
    }
    expect(seconds.size).toBeGreaterThan(10);
  });

  it('always produces an hour in [0, 23]', () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 200; i++) {
      const t = randomTime(rng, 'hour');
      expect(t.hour).toBeGreaterThanOrEqual(0);
      expect(t.hour).toBeLessThanOrEqual(23);
    }
  });
});

describe('formatTime12', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatTime12({ hour: 0, minute: 0, second: 0 })).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime12({ hour: 12, minute: 0, second: 0 })).toBe('12:00 PM');
  });

  it('formats a morning time', () => {
    expect(formatTime12({ hour: 1, minute: 5, second: 0 })).toBe('1:05 AM');
  });

  it('formats an afternoon time', () => {
    expect(formatTime12({ hour: 13, minute: 5, second: 0 })).toBe('1:05 PM');
  });

  it('includes seconds when requested', () => {
    expect(formatTime12({ hour: 15, minute: 45, second: 9 }, { seconds: true })).toBe('3:45:09 PM');
  });
});

describe('to24Hour', () => {
  it('maps 12 AM to hour 0 (midnight)', () => {
    expect(to24Hour(12, false)).toBe(0);
  });

  it('maps 12 PM to hour 12 (noon)', () => {
    expect(to24Hour(12, true)).toBe(12);
  });

  it('maps a morning hour unchanged', () => {
    expect(to24Hour(3, false)).toBe(3);
  });

  it('adds 12 to a non-noon afternoon hour', () => {
    expect(to24Hour(3, true)).toBe(15);
  });

  it("round-trips with formatTime12's hour-12 conversion for every hour", () => {
    for (let hour = 0; hour < 24; hour++) {
      const isPM = hour >= 12;
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      expect(to24Hour(hour12, isPM)).toBe(hour);
    }
  });
});

describe('describeTime', () => {
  it("describes exact hours as o'clock", () => {
    expect(describeTime({ hour: 3, minute: 0, second: 0 })).toBe("three o'clock");
    expect(describeTime({ hour: 0, minute: 0, second: 0 })).toBe("twelve o'clock");
    expect(describeTime({ hour: 12, minute: 0, second: 0 })).toBe("twelve o'clock");
  });

  it('describes quarter past and quarter to', () => {
    expect(describeTime({ hour: 3, minute: 15, second: 0 })).toBe('quarter past three');
    expect(describeTime({ hour: 3, minute: 45, second: 0 })).toBe('quarter to four');
  });

  it('describes half past', () => {
    expect(describeTime({ hour: 3, minute: 30, second: 0 })).toBe('half past three');
  });

  it('describes arbitrary minutes past and to the hour', () => {
    expect(describeTime({ hour: 3, minute: 10, second: 0 })).toBe('ten past three');
    expect(describeTime({ hour: 3, minute: 50, second: 0 })).toBe('ten to four');
  });

  it('wraps the hour word at the top of the clock', () => {
    expect(describeTime({ hour: 23, minute: 45, second: 0 })).toBe('quarter to twelve');
    expect(describeTime({ hour: 11, minute: 45, second: 0 })).toBe('quarter to twelve');
  });
});
