import { PEAKS, type Peak } from '../peaks';

/**
 * Which generator typeIds are "on theme" for each peak, keyed by `peak.id`
 * — one entry per `PEAKS` entry (checked by a test), so a new peak can't
 * silently ship with no emphasis mapping. `selectGenerator` weights a
 * matching generator 5x over a non-matching one.
 *
 * A peak whose dedicated generator hasn't landed yet gets an empty array;
 * until then, `selectGenerator` falls back to `answerModeWeights` alone
 * for that peak. Peak 10 ("Everything, mixed") is deliberately left empty
 * here too — `isOnThemeForPeak` special-cases it to match every
 * registered typeId, since hardcoding "all typeIds" in this table would
 * need updating every time a new generator ships.
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
