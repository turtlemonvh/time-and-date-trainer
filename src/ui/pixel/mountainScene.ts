import { mulberry32, type Rng } from '../../engine/rng';
import { lighten } from './color';
import { generateMountain } from './mountain';
import type { Layer } from './PixelLayers';

export interface ParallaxBand {
  /** Fraction of the full `peakHeight`, e.g. 0.5 = half as tall. */
  peakHeightFraction: number;
  /** How much to mix the theme's rock/snow colors toward white (0-1). */
  fade: number;
}

/**
 * Back-to-front: shorter and paler first (reads as farther away/hazier —
 * classic atmospheric-perspective parallax), full height and full color
 * last (the "hero" peak this theme is actually named for).
 */
export const DEFAULT_BANDS: readonly ParallaxBand[] = [
  { peakHeightFraction: 0.45, fade: 0.55 },
  { peakHeightFraction: 0.7, fade: 0.3 },
  { peakHeightFraction: 1, fade: 0 },
];

/**
 * Builds a multi-band parallax mountain scene: one `generateMountain` call
 * per band, each with its own independently-drawn silhouette (not the same
 * ridge just scaled — real mountain ranges don't nest like that) and a
 * paler palette the farther back it sits. Consumes `rng` once per band to
 * draw that band's own sub-seed, so the whole scene is still deterministic
 * from a single top-level `Rng`.
 */
export function generateMountainScene(
  rng: Rng,
  width: number,
  height: number,
  peakHeight: number,
  rock: string,
  snow: string,
  bands: readonly ParallaxBand[] = DEFAULT_BANDS,
): Layer[] {
  return bands.map((band) => {
    const bandSeed = Math.floor(rng() * 0xffffffff);
    const bandRng = mulberry32(bandSeed);
    return {
      sprite: generateMountain(bandRng, width, height, peakHeight * band.peakHeightFraction),
      palette: { rock: lighten(rock, band.fade), snow: lighten(snow, band.fade) },
    };
  });
}
