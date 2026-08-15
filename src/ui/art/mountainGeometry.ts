import { mulberry32 } from '../../engine/rng';

export interface MountainGeometry {
  /** SVG path `d` for the full mountain silhouette, base resting on `y = height`. */
  silhouette: string;
  /** SVG path `d` for a small snow-cap highlight near the summit. */
  snowCap: string;
}

/**
 * A jagged ridge of six points (base, two shoulders either side of the
 * summit, the summit itself, and a base again) — seeded by `seed` (a
 * peak's own id) so the shoulder heights jitter deterministically per peak
 * instead of every mountain sharing one identical outline recolored.
 * `peakHeightFraction` (0-1) sets how tall the summit reads within
 * `height` — see `mountainThemes.ts`'s `pixelPeakHeight` for why that's
 * derived from `peak.id`, not `peak.height`.
 */
export function buildMountainGeometry(
  seed: number,
  width: number,
  height: number,
  peakHeightFraction: number,
): MountainGeometry {
  const rng = mulberry32(seed);
  const jitter = (spread: number) => (rng() - 0.5) * spread;

  const baseY = height;
  const shoulderY = height * 0.62;
  const summitY = height * (1 - Math.min(1, Math.max(0, peakHeightFraction)));
  const summitX = width * (0.5 + jitter(0.16));

  const leftFootY = baseY - height * 0.06 + jitter(height * 0.05);
  const leftShoulderX = width * 0.24;
  const leftShoulderY = shoulderY + jitter(height * 0.14);
  const rightShoulderX = width * 0.76;
  const rightShoulderY = shoulderY + jitter(height * 0.14);
  const rightFootY = baseY - height * 0.06 + jitter(height * 0.05);

  const silhouette = [
    `M0,${baseY}`,
    `L0,${leftFootY.toFixed(1)}`,
    `L${leftShoulderX.toFixed(1)},${leftShoulderY.toFixed(1)}`,
    `L${summitX.toFixed(1)},${summitY.toFixed(1)}`,
    `L${rightShoulderX.toFixed(1)},${rightShoulderY.toFixed(1)}`,
    `L${width},${rightFootY.toFixed(1)}`,
    `L${width},${baseY}`,
    'Z',
  ].join(' ');

  const capSpread = width * 0.12;
  const capDrop = (Math.min(leftShoulderY, rightShoulderY) - summitY) * 0.45;
  const snowCap = [
    `M${(summitX - capSpread).toFixed(1)},${(summitY + capDrop).toFixed(1)}`,
    `L${summitX.toFixed(1)},${summitY.toFixed(1)}`,
    `L${(summitX + capSpread * 0.75).toFixed(1)},${(summitY + capDrop).toFixed(1)}`,
    `L${(summitX + capSpread * 0.3).toFixed(1)},${(summitY + capDrop * 0.6).toFixed(1)}`,
    'Z',
  ].join(' ');

  return { silhouette, snowCap };
}
