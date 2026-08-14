import type { AnswerMode, DateSpan, DescribePhrasingTier, DifficultyProfile } from './difficulty';
import { difficultyProfile } from './difficulty';
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

/** Short-phrase form, for `describeDifficultyDelta`'s "X -> Y" bullets. */
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

/**
 * Bullets for only the `DifficultyProfile` fields that actually differ
 * between level `a` and level `b` — an empty array when `a === b`. Compares
 * summarized values (the dominant precision/answer-mode, not the raw
 * weighted distributions) since a parent reading this cares about "what's
 * the typical question now", not a full probability breakdown; two levels
 * whose weights differ but whose dominant value doesn't are treated as
 * unchanged for this purpose.
 */
export function describeDifficultyDelta(a: number, b: number): string[] {
  const pa = difficultyProfile(a);
  const pb = difficultyProfile(b);
  const bullets: string[] = [];

  const precisionA = dominantPrecision(pa);
  const precisionB = dominantPrecision(pb);
  if (precisionA !== precisionB) {
    bullets.push(
      `Clock precision: ${PRECISION_LABELS[precisionA]} → ${PRECISION_LABELS[precisionB]}`,
    );
  }

  const secondsA = timerSeconds(pa);
  const secondsB = timerSeconds(pb);
  if (secondsA !== secondsB) {
    bullets.push(`Timer: ~${secondsA}s → ~${secondsB}s per question`);
  }

  const modeA = dominantAnswerMode(pa);
  const modeB = dominantAnswerMode(pb);
  if (modeA !== modeB) {
    bullets.push(`Mostly ${ANSWER_MODE_LABELS[modeA]} → mostly ${ANSWER_MODE_LABELS[modeB]}`);
  }

  if (pa.dateSpan !== pb.dateSpan) {
    bullets.push(`Dates: ${DATE_SPAN_PHRASES[pa.dateSpan]} → ${DATE_SPAN_PHRASES[pb.dateSpan]}`);
  }

  if (pa.hour24 !== pb.hour24) {
    bullets.push(pb.hour24 ? '24-hour time is introduced' : '24-hour time is no longer used');
  }

  if (pa.clockNumerals !== pb.clockNumerals) {
    bullets.push(
      pb.clockNumerals ? 'Clock numbers reappear' : 'Clock numbers disappear — position only',
    );
  }

  if (pa.describePhrasing !== pb.describePhrasing) {
    bullets.push(
      `Time-in-words: ${PHRASING_PHRASES[pa.describePhrasing]} → ${PHRASING_PHRASES[pb.describePhrasing]}`,
    );
  }

  if (pa.orderedChoices !== pb.orderedChoices) {
    bullets.push(
      pb.orderedChoices
        ? 'Answer choices go back to being in order'
        : 'Answer choices start getting shuffled',
    );
  }

  return bullets;
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
 * Full item/current/next comparison table between level `a` (current) and
 * level `b` (next) — always all 8 `DifficultyProfile`-derived dimensions,
 * unlike `describeDifficultyDelta`, which only returns the ones that
 * differ. Lets a UI show the whole picture every time (with `changed` rows
 * highlighted) rather than just what moved. Same summarized-value
 * comparison as `describeDifficultyDelta` (dominant precision/answer-mode,
 * not raw weighted distributions), for the same reason — a parent
 * comparing two levels cares about the typical question, not a full
 * probability breakdown.
 */
export function describeDifficultyComparisonTable(a: number, b: number): DifficultyComparisonRow[] {
  const pa = difficultyProfile(a);
  const pb = difficultyProfile(b);

  function row(item: string, current: string, next: string): DifficultyComparisonRow {
    return { item, current, next, changed: current !== next };
  }

  const modeA = capitalize(ANSWER_MODE_LABELS[dominantAnswerMode(pa)]);
  const modeB = capitalize(ANSWER_MODE_LABELS[dominantAnswerMode(pb)]);

  return [
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
}
