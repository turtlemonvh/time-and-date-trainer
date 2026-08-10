import { PEAKS, type Peak } from '../../engine/peaks';

export interface MountainTheme {
  peak: Peak;
  rock: string;
  snow: string;
}

/**
 * Rock/snow colors per peak, keyed by `peak.id` — one entry per `PEAKS`
 * entry (checked by a test), so a new peak added to the engine can't
 * silently ship with no themed mountain.
 */
const PALETTES: Readonly<Record<number, { rock: string; snow: string }>> = {
  1: { rock: '#6b6459', snow: '#f4f4f4' }, // Basecamp Bluff
  2: { rock: '#8a5a44', snow: '#fceabb' }, // Sundial Spire
  3: { rock: '#4a5859', snow: '#e8f6f6' }, // Calendar Ridge
  4: { rock: '#a58a5c', snow: '#fff3d6' }, // The Hourglass
  5: { rock: '#7a7a6e', snow: '#eef0e6' }, // Weekday Wall
  6: { rock: '#8b4a3a', snow: '#f7ded1' }, // Elapsed Escarpment
  7: { rock: '#556a7a', snow: '#dff0f7' }, // Monthfall Pass
  8: { rock: '#6b5a3a', snow: '#fff0c2' }, // The Meridian
  9: { rock: '#3d3a4b', snow: '#d6d9f2' }, // Leap Crag
  10: { rock: '#4b3b5c', snow: '#e6dcf5' }, // Summit of Hours
};

/**
 * All 10 peaks with their mountain colors, in `PEAKS` order. `peak.height`
 * (20-30, a game-mechanic "steps to summit" number) is scaled down into a
 * reasonable pixel peak-height range so later peaks are visibly, not just
 * nominally, taller.
 */
export const MOUNTAIN_THEMES: readonly MountainTheme[] = PEAKS.map((peak) => {
  const palette = PALETTES[peak.id];
  if (!palette) throw new Error(`mountainThemes: no palette for peak id ${peak.id}`);
  return { peak, ...palette };
});

/** Maps a peak's game-mechanic height (20-30) to a pixel peak-height (14-22). */
export function pixelPeakHeight(peak: Peak): number {
  const MIN_GAME_HEIGHT = 20;
  const MAX_GAME_HEIGHT = 30;
  const MIN_PIXEL_HEIGHT = 14;
  const MAX_PIXEL_HEIGHT = 22;
  const t = (peak.height - MIN_GAME_HEIGHT) / (MAX_GAME_HEIGHT - MIN_GAME_HEIGHT);
  return Math.round(MIN_PIXEL_HEIGHT + t * (MAX_PIXEL_HEIGHT - MIN_PIXEL_HEIGHT));
}
