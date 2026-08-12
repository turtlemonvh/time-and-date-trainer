import { randomDate } from '../dateMath';
import type { DateSpan, DifficultyProfile } from '../difficulty';
import { shuffle, weightedPick, type Rng } from '../rng';
import type { TimeOfDay, TimePrecision } from '../timeMath';
import type { ChoiceAnswer } from './types';

/** Every multiple-choice question offers this many options. */
export const OPTION_COUNT = 4;

/**
 * Scales the difficulty profile's base timer by a question type's own
 * multiplier. `difficulty.ts`'s `timerMs` is tuned for a "read one clock
 * face" question; a type that takes genuinely longer to work out (e.g. a
 * multi-step date offset) declares a multiplier above 1 in its own file so
 * switching between question types mid-climb doesn't feel like a
 * discontinuity in how much time was "supposed" to be enough. No central
 * typeId -> multiplier table, so a new generator can't forget to update one
 * it doesn't know exists — it just sets its own constant.
 */
export function timeLimitFor(profile: DifficultyProfile, multiplier: number): number {
  return Math.round(profile.timerMs * multiplier);
}

export const PRECISIONS: readonly TimePrecision[] = [
  'hour',
  'half',
  'quarter',
  'five',
  'minute',
  'second',
];

/**
 * Draws a time precision from the difficulty profile's weighted distribution.
 * Zero-weight precisions are filtered out first; every row of the difficulty
 * table has at least one positive weight, so this never sees an empty list.
 */
export function pickPrecision(rng: Rng, profile: DifficultyProfile): TimePrecision {
  const items = PRECISIONS.filter((p) => profile.timePrecisionWeights[p] > 0).map((p) => ({
    value: p,
    weight: profile.timePrecisionWeights[p],
  }));
  return weightedPick(rng, items);
}

/**
 * "3:05", or "9:07:04" when the question is about seconds.
 *
 * Deliberately carries no AM/PM: an analog clock face cannot show it, so an
 * option list containing both "3:15 AM" and "3:15 PM" would offer two answers
 * the player cannot tell apart, one of them marked wrong. AM/PM gets its own
 * question type on Peak 8 in a later milestone, not here.
 */
export function formatClockFace(t: TimeOfDay, showSeconds: boolean): string {
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const mm = String(t.minute).padStart(2, '0');
  if (!showSeconds) return `${hour12}:${mm}`;
  return `${hour12}:${mm}:${String(t.second).padStart(2, '0')}`;
}

const SECONDS_PER_DAY = 86_400;

/** Moves a time by `deltaSeconds`, wrapping around midnight in both directions. */
export function shiftTime(t: TimeOfDay, deltaSeconds: number): TimeOfDay {
  const raw = t.hour * 3600 + t.minute * 60 + t.second + deltaSeconds;
  const total = ((raw % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  return {
    hour: Math.floor(total / 3600),
    minute: Math.floor((total % 3600) / 60),
    second: total % 60,
  };
}

/**
 * How far apart near-miss times sit, per precision. Second-precision questions
 * step by 15s rather than 1s: a one-second difference is not a wrong answer a
 * child can distinguish, it is a coin flip.
 */
const DISTRACTOR_STEP_SECONDS: Record<TimePrecision, number> = {
  hour: 3600,
  half: 1800,
  quarter: 900,
  five: 300,
  minute: 60,
  second: 15,
};

// Invariant: offsets must stay under 12h. `formatClockFace` is 12-hour, so a
// distractor exactly ±12h from the correct time would render identically to
// it — not a wrong answer, just a silently shrunken candidate pool for
// `buildChoiceAnswer`. Max offset here is currently ±4h; keep future
// multiples well clear of ±12h.
const STEP_MULTIPLES = [1, -1, 2, -2, 3, -3, 4, -4];
const HOUR_MULTIPLES = [1, -1, 2, -2, 3, -3];

/**
 * A pool of plausible near-miss times: the same clock nudged by whole steps of
 * the question's precision, plus whole-hour misreadings (the classic "read the
 * hour hand off by one" error). Returned in a fixed order and never containing
 * `t` itself; `buildChoiceAnswer` de-duplicates and shuffles.
 */
export function distractorTimes(t: TimeOfDay, precision: TimePrecision): TimeOfDay[] {
  const step = DISTRACTOR_STEP_SECONDS[precision];
  const offsets = [...STEP_MULTIPLES.map((k) => k * step), ...HOUR_MULTIPLES.map((k) => k * 3600)];
  return offsets.map((delta) => shiftTime(t, delta));
}

/** Week starts Sunday, per the spec's Conventions row. Index matches `getDay()`. */
export const WEEKDAY_NAMES: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function weekdayName(d: Date): string {
  return WEEKDAY_NAMES[d.getDay()];
}

/**
 * The calendar window questions are drawn from, by difficulty band. Fixed years
 * (never "today") so a failing seed always reproduces. The wide band spans
 * 2024-2028 so it straddles the 2024 and 2028 leap years.
 */
export function dateRangeForSpan(span: DateSpan): { start: Date; end: Date } {
  switch (span) {
    // Intentionally identical windows: `readCalendar` only ever highlights a
    // single date regardless of span, so there's no narrower window to give
    // `withinMonth` — the narrowing for that band happens elsewhere (e.g.
    // `offsetDate`'s own day/month draw), not in this shared date range.
    case 'withinMonth':
    case 'acrossMonths':
      return { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };
    case 'acrossYears':
      return { start: new Date(2024, 0, 1), end: new Date(2028, 11, 31) };
  }
}

export function randomQuestionDate(rng: Rng, span: DateSpan): Date {
  const { start, end } = dateRangeForSpan(span);
  return randomDate(rng, start, end);
}

/**
 * Assembles a multiple-choice answer from an ordered candidate pool.
 *
 * Rather than rejection-sampling until the options happen to be distinct, the
 * caller hands over a pool it knows is large enough and this function takes the
 * first `optionCount - 1` *distinct* entries that are not the correct answer.
 * That makes a duplicate option, or a distractor that is secretly correct,
 * structurally impossible, and makes an undersized pool a loud, deterministic
 * crash that the contract test in Task 9 catches across every type, difficulty,
 * and seed rather than something a player discovers mid-climb.
 */
export function buildChoiceAnswer(
  rng: Rng,
  correct: string,
  candidates: readonly string[],
  optionCount: number = OPTION_COUNT,
): ChoiceAnswer {
  const seen = new Set<string>([correct]);
  const distinct: string[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    distinct.push(candidate);
  }
  if (distinct.length < optionCount - 1) {
    throw new Error(
      `buildChoiceAnswer: needed ${optionCount - 1} distinct distractors for ` +
        `"${correct}" but only got ${distinct.length}`,
    );
  }
  const chosen = shuffle(rng, distinct).slice(0, optionCount - 1);
  const options = shuffle(rng, [correct, ...chosen]);
  return { kind: 'choice', options, correctIndex: options.indexOf(correct) };
}

/** `"readAnalog-1f8x3k"` — stable for a seed, unique enough for a React key. */
export function makeQuestionId(rng: Rng, typeId: string): string {
  return `${typeId}-${Math.floor(rng() * 0xffff_ffff).toString(36)}`;
}
