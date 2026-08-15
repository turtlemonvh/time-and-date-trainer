import { describe, expect, it } from 'vitest';
import { buildMountainGeometry } from './mountainGeometry';

describe('buildMountainGeometry', () => {
  it('is deterministic for the same seed', () => {
    const a = buildMountainGeometry(3, 128, 48, 0.7);
    const b = buildMountainGeometry(3, 128, 48, 0.7);
    expect(a).toEqual(b);
  });

  it('produces a different silhouette for a different seed', () => {
    const a = buildMountainGeometry(1, 128, 48, 0.7);
    const b = buildMountainGeometry(2, 128, 48, 0.7);
    expect(a.silhouette).not.toEqual(b.silhouette);
  });

  it('starts and ends the silhouette at the base (y = height) on both edges', () => {
    const { silhouette } = buildMountainGeometry(5, 128, 48, 0.7);
    expect(silhouette.startsWith('M0,48')).toBe(true);
    expect(silhouette).toContain('L128,48');
    expect(silhouette.trim().endsWith('Z')).toBe(true);
  });

  it('returns valid non-empty path strings for every peak id 1-10', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { silhouette, snowCap } = buildMountainGeometry(seed, 128, 48, 0.6);
      expect(silhouette.length).toBeGreaterThan(0);
      expect(snowCap.length).toBeGreaterThan(0);
    }
  });

  it('reads taller (lower summit y) with a bigger peakHeightFraction', () => {
    const short = buildMountainGeometry(7, 128, 48, 0.3);
    const tall = buildMountainGeometry(7, 128, 48, 0.9);
    // Both use the same seed, so only the summit-y term differs — a taller
    // fraction should leave a smaller minimum y (SVG's origin is the top)
    // somewhere in the path.
    const minY = (path: string) =>
      Math.min(...Array.from(path.matchAll(/,(-?\d+(?:\.\d+)?)/g)).map((m) => Number(m[1])));
    expect(minY(tall.silhouette)).toBeLessThan(minY(short.silhouette));
  });
});
