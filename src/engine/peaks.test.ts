import { describe, expect, it } from 'vitest';
import { getPeak, PEAKS } from './peaks';

describe('PEAKS', () => {
  it('has exactly 10 peaks with ids 1 through 10 in order', () => {
    expect(PEAKS).toHaveLength(10);
    expect(PEAKS.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('has the pacing-tuned heights (not a smooth ascending curve — see the doc comment on PEAKS)', () => {
    expect(PEAKS.map((p) => p.height)).toEqual([27, 27, 22, 23, 24, 26, 22, 28, 21, 30]);
  });

  it('keeps every height within a sane pacing-simulation range', () => {
    for (const peak of PEAKS) {
      expect(peak.height).toBeGreaterThanOrEqual(15);
      expect(peak.height).toBeLessThanOrEqual(35);
    }
  });

  it('gives every peak a non-empty name and emphasis', () => {
    for (const peak of PEAKS) {
      expect(peak.name.length).toBeGreaterThan(0);
      expect(peak.emphasis.length).toBeGreaterThan(0);
    }
  });
});

describe('getPeak', () => {
  it('returns the peak with the matching id', () => {
    expect(getPeak(1).name).toBe('Basecamp Bluff');
    expect(getPeak(10).name).toBe('Summit of Hours');
  });

  it('throws for an id that does not exist', () => {
    expect(() => getPeak(0)).toThrow();
    expect(() => getPeak(11)).toThrow();
  });
});
