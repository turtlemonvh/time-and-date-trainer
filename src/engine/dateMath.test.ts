import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { formatDateLong, offsetDate, randomDate } from './dateMath';

describe('randomDate', () => {
  it('stays within the inclusive range', () => {
    const rng = mulberry32(1);
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 10);
    for (let i = 0; i < 50; i++) {
      const d = randomDate(rng, start, end);
      expect(d.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(d.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  });

  it('is deterministic for a given seed', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    expect(randomDate(mulberry32(7), start, end)).toEqual(randomDate(mulberry32(7), start, end));
  });

  it('returns the single valid date when start equals end', () => {
    const only = new Date(2026, 5, 15);
    expect(randomDate(mulberry32(1), only, only)).toEqual(only);
  });

  it('throws when end is before start', () => {
    const start = new Date(2026, 5, 15);
    const end = new Date(2026, 5, 1);
    expect(() => randomDate(mulberry32(1), start, end)).toThrow();
  });
});

describe('formatDateLong', () => {
  it('formats a single-digit day', () => {
    expect(formatDateLong(new Date(2026, 10, 5))).toBe('November 5, 2026');
  });

  it('formats a double-digit day', () => {
    expect(formatDateLong(new Date(2026, 10, 21))).toBe('November 21, 2026');
  });

  it('formats January correctly (month index 0)', () => {
    expect(formatDateLong(new Date(2026, 0, 1))).toBe('January 1, 2026');
  });
});

describe('offsetDate', () => {
  it('offsets by days', () => {
    expect(offsetDate(new Date(2026, 0, 1), 5, 'day')).toEqual(new Date(2026, 0, 6));
  });

  it('offsets by weeks', () => {
    expect(offsetDate(new Date(2026, 0, 1), 2, 'week')).toEqual(new Date(2026, 0, 15));
  });

  it('offsets by months', () => {
    expect(offsetDate(new Date(2026, 0, 15), 1, 'month')).toEqual(new Date(2026, 1, 15));
  });

  it('clamps at month end when the target month is shorter', () => {
    // Jan 31 + 1 month -> Feb has only 28 days in 2026 (not a leap year)
    expect(offsetDate(new Date(2026, 0, 31), 1, 'month')).toEqual(new Date(2026, 1, 28));
  });

  it('handles negative offsets', () => {
    expect(offsetDate(new Date(2026, 0, 10), -5, 'day')).toEqual(new Date(2026, 0, 5));
  });

  it('crosses a leap day correctly', () => {
    // 2028 is a leap year
    expect(offsetDate(new Date(2028, 1, 28), 1, 'day')).toEqual(new Date(2028, 1, 29));
  });
});
