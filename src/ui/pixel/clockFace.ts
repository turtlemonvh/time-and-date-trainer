import type { Sprite } from './types';

// Band widths as a fraction of radius (derived from the widths that looked
// right at the original 33-cell diameter: 1.4 and 3.2 cells at radius 16.5)
// rather than fixed cell counts, so a higher-density grid stays
// proportioned the same way instead of the rim/ticks shrinking to a
// vanishing fraction of the face as diameter grows.
const REFERENCE_RADIUS = 33 / 2;
const RIM_BAND_FRACTION = 1.4 / REFERENCE_RADIUS;
const TICK_BAND_FRACTION = 3.2 / REFERENCE_RADIUS;
const HOUR_TICK_HALF_WIDTH_DEG = 6;
// A quarter of the hour tick's angular width — thin enough that 60 of them
// around the face read as fine minute graduations rather than a second ring
// of hour ticks. Deliberately not scaled by radius (unlike the two band
// fractions above): minute ticks only ever render at the one production
// diameter (129), so there's no other size to stay proportioned against.
const MINUTE_TICK_HALF_WIDTH_DEG = HOUR_TICK_HALF_WIDTH_DEG / 4;

/**
 * Procedurally generates a circular clock face: a filled disc (`F`ace) with
 * a `R`im ring, thin minute `t`icks at every minute position, and hour
 * `T`icks near the edge (thicker `M`ajor ticks at 12/3/6/9) drawn on top of
 * them at the same 12 positions. Computed pixel-by-pixel (like
 * `generateMountain`) rather than hand-authored, since a clean circle isn't
 * practical to eyeball as ASCII art. `diameter` is in grid cells, not
 * display pixels — `PixelCanvas`'s `scale` prop controls the final
 * on-screen size.
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
    slots: { F: 'face', R: 'rim', T: 'tick', M: 'majorTick', t: 'minuteTick' },
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
    const nearestHourTick = Math.round(angleDeg / 30) * 30;
    const hourDiff = angleDiffTo(angleDeg, nearestHourTick);
    if (hourDiff < HOUR_TICK_HALF_WIDTH_DEG) {
      return nearestHourTick % 90 === 0 ? 'M' : 'T';
    }
    const nearestMinuteTick = Math.round(angleDeg / 6) * 6;
    const minuteDiff = angleDiffTo(angleDeg, nearestMinuteTick);
    if (minuteDiff < MINUTE_TICK_HALF_WIDTH_DEG) {
      return 't';
    }
  }
  return 'F';
}

function angleDiffTo(angleDeg: number, targetDeg: number): number {
  const diff = Math.abs(angleDeg - targetDeg);
  return Math.min(diff, 360 - diff);
}
