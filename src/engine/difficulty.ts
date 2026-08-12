import type { TimePrecision } from './timeMath';

export type AnswerMode = 'choice' | 'interactive' | 'free';
export type DateSpan = 'withinMonth' | 'acrossMonths' | 'acrossYears';
/**
 * Which minute values `describeTime` (Peak 2) is allowed to phrase, on a
 * ladder from the most idiomatic English phrasings to the least. Uncommon
 * phrasings like "seventeen to two" only show up once the more natural
 * "half past"/"quarter to"/five-minute phrasings are already established.
 */
export type DescribePhrasingTier = 'halves' | 'quarters' | 'fives' | 'anyMinute';

export interface DifficultyProfile {
  level: number;
  timePrecisionWeights: Readonly<Record<TimePrecision, number>>;
  timerMs: number;
  answerModeWeights: Readonly<Record<AnswerMode, number>>;
  dateSpan: DateSpan;
  hour24: boolean;
  /** Numerals 1-12 on the analog clock face. Off at the top two levels,
   * turning "read the clock" into a harder positional-only task. */
  clockNumerals: boolean;
  describePhrasing: DescribePhrasingTier;
}

interface DifficultyRow {
  timePrecisionWeights: Readonly<Record<TimePrecision, number>>;
  timerMs: number;
  answerModeWeights: Readonly<Record<AnswerMode, number>>;
  dateSpan: DateSpan;
  hour24: boolean;
  clockNumerals: boolean;
  describePhrasing: DescribePhrasingTier;
}

// One row per difficulty level 1-10. Values are hand-tuned to match the
// spec's qualitative bands exactly (see
// docs/superpowers/specs/2026-08-08-summit-clock-design.md, "Difficulty
// profile" section), not derived from a formula, so each row can be
// adjusted independently during playtesting without touching a curve.
const TABLE: readonly DifficultyRow[] = [
  {
    timePrecisionWeights: { hour: 10, half: 0, quarter: 0, five: 0, minute: 0, second: 0 },
    timerMs: 30000,
    answerModeWeights: { choice: 10, interactive: 0, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'halves',
  },
  {
    timePrecisionWeights: { hour: 7, half: 3, quarter: 0, five: 0, minute: 0, second: 0 },
    timerMs: 28000,
    answerModeWeights: { choice: 10, interactive: 0, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'quarters',
  },
  {
    timePrecisionWeights: { hour: 3, half: 6, quarter: 1, five: 0, minute: 0, second: 0 },
    timerMs: 26000,
    answerModeWeights: { choice: 9, interactive: 1, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'fives',
  },
  {
    timePrecisionWeights: { hour: 1, half: 4, quarter: 4, five: 1, minute: 0, second: 0 },
    timerMs: 24000,
    answerModeWeights: { choice: 7, interactive: 3, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'fives',
  },
  {
    timePrecisionWeights: { hour: 0, half: 2, quarter: 3, five: 5, minute: 0, second: 0 },
    timerMs: 22000,
    answerModeWeights: { choice: 6, interactive: 4, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'fives',
  },
  {
    timePrecisionWeights: { hour: 0, half: 1, quarter: 2, five: 6, minute: 1, second: 0 },
    timerMs: 20000,
    answerModeWeights: { choice: 5, interactive: 5, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'fives',
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 1, five: 5, minute: 4, second: 0 },
    timerMs: 18000,
    answerModeWeights: { choice: 4, interactive: 5, free: 1 },
    dateSpan: 'acrossMonths',
    hour24: false,
    clockNumerals: true,
    describePhrasing: 'fives',
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 3, minute: 6, second: 1 },
    timerMs: 16000,
    answerModeWeights: { choice: 2, interactive: 5, free: 3 },
    dateSpan: 'acrossYears',
    hour24: true,
    clockNumerals: true,
    describePhrasing: 'fives',
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 1, minute: 6, second: 3 },
    timerMs: 14000,
    answerModeWeights: { choice: 1, interactive: 4, free: 5 },
    dateSpan: 'acrossYears',
    hour24: true,
    clockNumerals: false,
    describePhrasing: 'anyMinute',
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 0, minute: 4, second: 6 },
    timerMs: 12000,
    answerModeWeights: { choice: 1, interactive: 3, free: 6 },
    dateSpan: 'acrossYears',
    hour24: true,
    clockNumerals: false,
    describePhrasing: 'anyMinute',
  },
];

export function difficultyProfile(level: number): DifficultyProfile {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  return { level: clamped, ...TABLE[clamped - 1] };
}
