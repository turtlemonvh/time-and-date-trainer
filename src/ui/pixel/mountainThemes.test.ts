import { describe, expect, it } from 'vitest';
import { PEAKS } from '../../engine/peaks';
import { MOUNTAIN_THEMES, pixelPeakHeight } from './mountainThemes';

describe('MOUNTAIN_THEMES', () => {
  it('has exactly one entry per peak, in PEAKS order', () => {
    expect(MOUNTAIN_THEMES.map((t) => t.peak.id)).toEqual(PEAKS.map((p) => p.id));
  });

  it('every theme has a rock and snow color, and they differ', () => {
    for (const theme of MOUNTAIN_THEMES) {
      expect(theme.rock).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.snow).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.rock).not.toBe(theme.snow);
    }
  });

  it('no two peaks share the exact same rock color', () => {
    const rocks = MOUNTAIN_THEMES.map((t) => t.rock);
    expect(new Set(rocks).size).toBe(rocks.length);
  });
});

describe('pixelPeakHeight', () => {
  it('is monotonically non-decreasing with peak.height, across all 10 peaks', () => {
    const heights = PEAKS.map(pixelPeakHeight);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    }
  });

  it('stays within the intended 14-22 pixel range for every peak', () => {
    for (const peak of PEAKS) {
      const height = pixelPeakHeight(peak);
      expect(height).toBeGreaterThanOrEqual(14);
      expect(height).toBeLessThanOrEqual(22);
    }
  });
});
