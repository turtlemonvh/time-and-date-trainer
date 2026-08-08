import { describe, expect, it } from 'vitest';
import { getPeak, PEAKS } from './peaks';

describe('PEAKS', () => {
  it('has exactly 10 peaks with ids 1 through 10 in order', () => {
    expect(PEAKS).toHaveLength(10);
    expect(PEAKS.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('has heights rising from 20 at Peak 1 to 30 at Peak 10', () => {
    expect(PEAKS.map((p) => p.height)).toEqual([20, 21, 22, 23, 24, 26, 27, 28, 29, 30]);
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
