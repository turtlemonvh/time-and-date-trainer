import type { AnswerMode, DateSpan, DescribePhrasingTier, DifficultyProfile } from './difficulty';
import { difficultyProfile } from './difficulty';
import { getPeak } from './peaks';
import { BUILT_IN_QUESTION_TYPES } from './questions';
import { isOnThemeForPeak } from './questions/peakEmphasis';
import type { TimePrecision } from './timeMath';

const PRECISION_ORDER: readonly TimePrecision[] = [
  'hour',
  'half',
  'quarter',
  'five',
  'minute',
  'second',
];

const PRECISION_LABELS: Readonly<Record<TimePrecision, string>> = {
  hour: 'the hour',
  half: 'the half hour',
  quarter: 'the quarter hour',
  five: 'the nearest 5 minutes',
  minute: 'the exact minute',
  second: 'the exact second',
};

/** The most heavily weighted precision — first in `PRECISION_ORDER` wins a
 * tie, so this is deterministic even when two precisions are equally
 * likely. */
function dominantPrecision(profile: DifficultyProfile): TimePrecision {
  return PRECISION_ORDER.reduce((best, candidate) =>
    profile.timePrecisionWeights[candidate] > profile.timePrecisionWeights[best] ? candidate : best,
  );
}

function precisionVariety(profile: DifficultyProfile): number {
  return PRECISION_ORDER.filter((p) => profile.timePrecisionWeights[p] > 0).length;
}

const ANSWER_MODE_ORDER: readonly AnswerMode[] = ['choice', 'interactive', 'free'];

const ANSWER_MODE_LABELS: Readonly<Record<AnswerMode, string>> = {
  choice: 'multiple choice',
  interactive: 'drag/set answers, like moving clock hands',
  free: 'typed-in answers',
};

function dominantAnswerMode(profile: DifficultyProfile): AnswerMode {
  return ANSWER_MODE_ORDER.reduce((best, candidate) =>
    profile.answerModeWeights[candidate] > profile.answerModeWeights[best] ? candidate : best,
  );
}

function answerModeVariety(profile: DifficultyProfile): number {
  return ANSWER_MODE_ORDER.filter((m) => profile.answerModeWeights[m] > 0).length;
}

/** Full-sentence phrasing, for `describeDifficultyLevel`'s standalone bullet. */
const DATE_SPAN_SENTENCES: Readonly<Record<DateSpan, string>> = {
  withinMonth: 'Dates stay within the same month',
  acrossMonths: 'Dates can span different months',
  acrossYears: 'Dates can span different years, including leap years',
};

/** Short-phrase form, for `describeDifficultyComparisonTable`'s cells. */
const DATE_SPAN_PHRASES: Readonly<Record<DateSpan, string>> = {
  withinMonth: 'within the same month',
  acrossMonths: 'across different months',
  acrossYears: 'across different years, including leap years',
};

const PHRASING_PHRASES: Readonly<Record<DescribePhrasingTier, string>> = {
  halves: `"half past" and "o'clock" only`,
  quarters: `adds "quarter past" and "quarter to"`,
  fives: `any 5-minute phrase, like "ten past" or "twenty to"`,
  anyMinute: `any minute at all, like "seventeen past"`,
};

function timerSeconds(profile: DifficultyProfile): number {
  return Math.round(profile.timerMs / 1000);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Ordered, short, plain-English bullets describing difficulty `level`
 * (1-10) — one per real `DifficultyProfile` field (`difficulty.ts`), not
 * the design spec's prose, which has drifted from the actually-tuned
 * values (e.g. real timers run 30s down to 12s, not the spec's 20s-7s).
 * Powers the per-peak difficulty picker and the curriculum browser.
 */
export function describeDifficultyLevel(level: number): string[] {
  const profile = difficultyProfile(level);
  const precision = dominantPrecision(profile);
  const mode = dominantAnswerMode(profile);
  return [
    `Clock reading: ${precisionVariety(profile) > 1 ? 'mostly' : 'always'} to ${PRECISION_LABELS[precision]}`,
    `About ${timerSeconds(profile)} seconds per question`,
    answerModeVariety(profile) > 1
      ? `Mostly ${ANSWER_MODE_LABELS[mode]}, with some other answer styles too`
      : `${capitalize(ANSWER_MODE_LABELS[mode])} only`,
    DATE_SPAN_SENTENCES[profile.dateSpan],
    profile.hour24
      ? 'Uses 24-hour time (like 15:00) as well as 12-hour'
      : 'Sticks to 12-hour AM/PM time',
    profile.clockNumerals
      ? 'Clock face shows the numbers 1-12'
      : 'Clock face has no numbers — just hand position',
    `Time-in-words: ${PHRASING_PHRASES[profile.describePhrasing]}`,
    profile.orderedChoices ? 'Answer choices are shown in order' : 'Answer choices are shuffled',
  ];
}

export interface DifficultyComparisonRow {
  item: string;
  current: string;
  next: string;
  /** Whether `current` and `next` actually differ — lets a UI highlight
   * only the rows that changed without hiding the rest. */
  changed: boolean;
}

/**
 * Which comparison-table items a generator's questions actually read from
 * `DifficultyProfile` — derived by reading each generator's source (which
 * profile fields it destructures and acts on), not guessed from its name.
 * `'24-hour time'` never appears for any type: no generator, including peak
 * 8's own `hour24.ts` (which converts between 12h/24h notation
 * unconditionally at every difficulty, never reading `profile.hour24`),
 * actually varies its behavior on that field — so it's dropped from every
 * peak's table below, a fact about the engine rather than a peak quirk.
 * `'Timer'` and `'Answer style'` aren't listed per-type since every
 * generator has both — see `ALWAYS_RELEVANT_ITEMS`.
 */
const GENERATOR_RELEVANT_ITEMS: Readonly<Record<string, readonly string[]>> = {
  readAnalog: ['Clock precision', 'Clock numbers', 'Answer order'],
  describeTime: ['Clock precision', 'Clock numbers', 'Time-in-words', 'Answer order'],
  readCalendar: ['Dates', 'Answer order'],
  offsetDate: ['Dates', 'Answer order'],
  elapsedAdd: ['Answer order'],
  elapsedBetween: [],
  setHands: ['Clock precision'],
  dayOfWeek: ['Answer order'],
  nthWeekday: ['Dates'],
  countWeekdays: ['Dates'],
  hour24: ['Clock precision', 'Answer order'],
  countBetween: ['Dates'],
};

/** Shown for every peak, regardless of which generator is on-theme —
 * inherent to "how a question is asked and timed", not tied to any one
 * generator's content the way clock precision or date span are. */
const ALWAYS_RELEVANT_ITEMS: readonly string[] = ['Timer', 'Answer style'];

/**
 * Which of the 8 comparison items are actually meaningful for `peakId` —
 * the union of every on-theme generator's `GENERATOR_RELEVANT_ITEMS`, plus
 * the always-relevant ones. A calendar-only peak like Calendar Ridge has no
 * reason to show clock-precision rows, and a clock-only peak has no reason
 * to show date-span rows; asserted complete (every registered generator has
 * an entry) by `difficultyDescribe.test.ts`.
 */
function relevantItemsForPeak(peakId: number): Set<string> {
  const peak = getPeak(peakId);
  const items = new Set<string>(ALWAYS_RELEVANT_ITEMS);
  for (const type of BUILT_IN_QUESTION_TYPES) {
    if (!isOnThemeForPeak(peak, type.typeId)) continue;
    const relevant = GENERATOR_RELEVANT_ITEMS[type.typeId];
    if (relevant === undefined) {
      throw new Error(
        `relevantItemsForPeak: no GENERATOR_RELEVANT_ITEMS entry for "${type.typeId}"`,
      );
    }
    for (const item of relevant) items.add(item);
  }
  return items;
}

/**
 * Full item/current/next comparison table between level `a` (current) and
 * level `b` (next), filtered to only the items actually relevant to
 * `peakId`'s on-theme generator(s) (see `relevantItemsForPeak`) — always
 * all `DifficultyProfile`-derived dimensions that apply, with `changed`
 * flagging which ones actually differ so a UI can highlight them rather
 * than hiding the rest. Compares summarized values (the dominant
 * precision/answer-mode, not raw weighted distributions) since a parent
 * comparing two levels cares about the typical question, not a full
 * probability breakdown.
 */
export function describeDifficultyComparisonTable(
  a: number,
  b: number,
  peakId: number,
): DifficultyComparisonRow[] {
  const pa = difficultyProfile(a);
  const pb = difficultyProfile(b);
  const relevant = relevantItemsForPeak(peakId);

  function row(item: string, current: string, next: string): DifficultyComparisonRow {
    return { item, current, next, changed: current !== next };
  }

  const modeA = capitalize(ANSWER_MODE_LABELS[dominantAnswerMode(pa)]);
  const modeB = capitalize(ANSWER_MODE_LABELS[dominantAnswerMode(pb)]);

  const allRows = [
    row(
      'Clock precision',
      PRECISION_LABELS[dominantPrecision(pa)],
      PRECISION_LABELS[dominantPrecision(pb)],
    ),
    row('Timer', `~${timerSeconds(pa)}s`, `~${timerSeconds(pb)}s`),
    row('Answer style', modeA, modeB),
    row(
      'Dates',
      capitalize(DATE_SPAN_PHRASES[pa.dateSpan]),
      capitalize(DATE_SPAN_PHRASES[pb.dateSpan]),
    ),
    row('24-hour time', pa.hour24 ? 'On' : 'Off', pb.hour24 ? 'On' : 'Off'),
    row(
      'Clock numbers',
      pa.clockNumerals ? 'Shown' : 'Hidden',
      pb.clockNumerals ? 'Shown' : 'Hidden',
    ),
    row(
      'Time-in-words',
      PHRASING_PHRASES[pa.describePhrasing],
      PHRASING_PHRASES[pb.describePhrasing],
    ),
    row(
      'Answer order',
      pa.orderedChoices ? 'In order' : 'Shuffled',
      pb.orderedChoices ? 'In order' : 'Shuffled',
    ),
  ];

  return allRows.filter((row) => relevant.has(row.item));
}
