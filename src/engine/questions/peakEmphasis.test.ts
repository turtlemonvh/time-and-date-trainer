import { describe, expect, it } from 'vitest';
import { getPeak, PEAKS } from '../peaks';
import { isOnThemeForPeak, PEAK_TYPE_IDS, peakTypeIds } from './peakEmphasis';

describe('PEAK_TYPE_IDS', () => {
  it('has exactly one entry per peak', () => {
    expect(
      Object.keys(PEAK_TYPE_IDS)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(PEAKS.map((p) => p.id).sort((a, b) => a - b));
  });

  it('every listed typeId is a non-empty string', () => {
    for (const peak of PEAKS) {
      for (const typeId of peakTypeIds(peak.id)) {
        expect(typeId.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('peakTypeIds', () => {
  it('throws for an unknown peak id', () => {
    expect(() => peakTypeIds(999)).toThrow(/999/);
  });
});

describe('isOnThemeForPeak', () => {
  it('matches a typeId listed for its peak', () => {
    expect(isOnThemeForPeak(getPeak(1), 'readAnalog')).toBe(true);
    expect(isOnThemeForPeak(getPeak(2), 'describeTime')).toBe(true);
    expect(isOnThemeForPeak(getPeak(3), 'readCalendar')).toBe(true);
    expect(isOnThemeForPeak(getPeak(7), 'offsetDate')).toBe(true);
  });

  it('rejects a typeId not listed for its peak', () => {
    expect(isOnThemeForPeak(getPeak(1), 'describeTime')).toBe(false);
    expect(isOnThemeForPeak(getPeak(2), 'readAnalog')).toBe(false);
  });

  it('peak 10 (mixed) matches any typeId, listed or not', () => {
    expect(isOnThemeForPeak(getPeak(10), 'readAnalog')).toBe(true);
    expect(isOnThemeForPeak(getPeak(10), 'anythingAtAll')).toBe(true);
  });

  it('a peak with no dedicated generator yet matches nothing', () => {
    expect(isOnThemeForPeak(getPeak(4), 'readAnalog')).toBe(false);
    expect(isOnThemeForPeak(getPeak(5), 'readCalendar')).toBe(false);
  });
});
