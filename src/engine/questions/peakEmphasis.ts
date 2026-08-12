import { PEAKS, type Peak } from '../peaks';

/**
 * Which generator typeIds are "on theme" for each peak, keyed by `peak.id`
 * — one entry per `PEAKS` entry (checked by a test), so a new peak can't
 * silently ship with no emphasis mapping. `selectGenerator` weights a
 * matching generator more heavily than a non-matching one (see
 * `PEAK_MATCH_WEIGHT_MULTIPLIER` in `registry.ts`).
 *
 * Every peak but one has a dedicated generator (or generators) here. Peak
 * 10 ("Everything, mixed") is the exception, left empty on purpose —
 * `isOnThemeForPeak` special-cases it to match every registered typeId
 * instead, since hardcoding "all typeIds" in this table would need
 * updating every time a new generator ships. A future peak added without
 * an entry here falls back to `selectGenerator` weighting by
 * `answerModeWeights` alone until one is added.
 */
export const PEAK_TYPE_IDS: Readonly<Record<number, readonly string[]>> = {
  1: ['readAnalog'], // Basecamp Bluff
  2: ['describeTime'], // Sundial Spire
  3: ['readCalendar'], // Calendar Ridge
  4: ['setHands'], // The Hourglass
  5: ['dayOfWeek', 'nthWeekday', 'countWeekdays'], // Weekday Wall
  6: ['elapsedAdd', 'elapsedBetween'], // Elapsed Escarpment
  7: ['offsetDate'], // Monthfall Pass
  8: ['hour24'], // The Meridian
  9: ['countBetween'], // Leap Crag
  10: [], // Summit of Hours — mixed peak, see isOnThemeForPeak
};

export function peakTypeIds(peakId: number): readonly string[] {
  const ids = PEAK_TYPE_IDS[peakId];
  if (ids === undefined) throw new Error(`peakTypeIds: no mapping for peak id ${peakId}`);
  return ids;
}

/** True if `typeId` is on-theme for `peak` — peak 10 matches everything. */
export function isOnThemeForPeak(peak: Peak, typeId: string): boolean {
  if (peak.id === 10) return true;
  return peakTypeIds(peak.id).includes(typeId);
}

/** Every `PEAKS` id has an entry above — asserted eagerly, not just in tests. */
for (const peak of PEAKS) peakTypeIds(peak.id);
