import { randInt, type Rng } from '../../engine/rng';
import type { Sprite } from './types';

/**
 * Displaces the midpoint of `heights[left..right]` from the average of its
 * endpoints by a random amount that shrinks as segments get smaller — the
 * classic 1D fractal-terrain algorithm. Recursing on both halves is what
 * makes the profile look like a natural jagged ridge instead of a straight
 * line from peak to base.
 */
function midpointDisplace(
  rng: Rng,
  heights: number[],
  left: number,
  right: number,
  roughness: number,
): void {
  if (right - left <= 1) return;
  const mid = Math.floor((left + right) / 2);
  const average = (heights[left] + heights[right]) / 2;
  const span = right - left;
  const displaced = average + (rng() * 2 - 1) * span * roughness;
  heights[mid] = Math.max(0, displaced);
  midpointDisplace(rng, heights, left, mid, roughness);
  midpointDisplace(rng, heights, mid, right, roughness);
}

/**
 * Builds one jagged mountain silhouette as a `Sprite`: `R` (rock) below the
 * snowline, `S` (snow) above it, `.` (sky) everywhere else. `peakHeight` is
 * in rows, measured from the base; `peakColumn` defaults to the middle
 * third of `width` if omitted. Every theme reuses this one algorithm —
 * only the seed, dimensions, and palette differ per peak.
 */
export function generateMountain(
  rng: Rng,
  width: number,
  height: number,
  peakHeight: number,
  snowlineFraction = 0.25,
): Sprite {
  const peakColumn = randInt(rng, Math.floor(width * 0.35), Math.floor(width * 0.65));
  const heights = new Array<number>(width).fill(0);
  heights[0] = 0;
  heights[width - 1] = 0;
  heights[peakColumn] = peakHeight;

  midpointDisplace(rng, heights, 0, peakColumn, 0.6);
  midpointDisplace(rng, heights, peakColumn, width - 1, 0.6);

  const snowlineHeight = peakHeight * (1 - snowlineFraction);
  const grid: string[] = [];
  for (let row = 0; row < height; row++) {
    let line = '';
    const rowHeightFromBase = height - 1 - row;
    for (let col = 0; col < width; col++) {
      if (rowHeightFromBase > heights[col]) {
        line += '.';
      } else {
        line += rowHeightFromBase > snowlineHeight ? 'S' : 'R';
      }
    }
    grid.push(line);
  }

  return { w: width, h: height, grid, slots: { R: 'rock', S: 'snow' } };
}
