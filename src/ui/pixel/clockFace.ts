import type { Sprite } from './types';

// Band widths as a fraction of radius (derived from the widths that looked
// right at the original 33-cell diameter: 1.4 and 3.2 cells at radius 16.5)
// rather than fixed cell counts, so a higher-density grid stays
// proportioned the same way instead of the rim/ticks shrinking to a
// vanishing fraction of the face as diameter grows.
const REFERENCE_RADIUS = 33 / 2;
const RIM_BAND_FRACTION = 1.4 / REFERENCE_RADIUS;
const TICK_BAND_FRACTION = 3.2 / REFERENCE_RADIUS;
const TICK_HALF_WIDTH_DEG = 6;

/**
 * Procedurally generates a circular clock face: a filled disc (`F`ace) with
 * a `R`im ring and hour `T`icks near the edge, thicker `M`ajor ticks at
 * 12/3/6/9. Computed pixel-by-pixel (like `generateMountain`) rather than
 * hand-authored, since a clean circle isn't practical to eyeball as ASCII
 * art. `diameter` is in grid cells, not display pixels — `PixelCanvas`'s
 * `scale` prop controls the final on-screen size.
 */
export function generateClockFace(diameter: number): Sprite {
  const radius = diameter / 2;
  const center = (diameter - 1) / 2;
  const rimBand = radius * RIM_BAND_FRACTION;
  const tickBand = radius * TICK_BAND_FRACTION;
  const grid: string[] = [];
  for (let row = 0; row < diameter; row++) {
    let line = '';
    for (let col = 0; col < diameter; col++) {
      line += pixelAt(col - center, row - center, radius, rimBand, tickBand);
    }
    grid.push(line);
  }
  return {
    w: diameter,
    h: diameter,
    grid,
    slots: { F: 'face', R: 'rim', T: 'tick', M: 'majorTick' },
  };
}

function pixelAt(
  dx: number,
  dy: number,
  radius: number,
  rimBand: number,
  tickBand: number,
): string {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > radius) return '.';
  if (dist > radius - rimBand) return 'R';
  if (dist > radius - tickBand) {
    const angleDeg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const nearestTick = Math.round(angleDeg / 30) * 30;
    const angleDiff = Math.min(
      Math.abs(angleDeg - nearestTick),
      360 - Math.abs(angleDeg - nearestTick),
    );
    if (angleDiff < TICK_HALF_WIDTH_DEG) {
      return nearestTick % 90 === 0 ? 'M' : 'T';
    }
  }
  return 'F';
}
