import type { TimePrecision } from './timeMath';

export type AnswerMode = 'choice' | 'interactive' | 'free';
export type DateSpan = 'withinMonth' | 'acrossMonths' | 'acrossYears';

export interface DifficultyProfile {
  level: number;
  timePrecisionWeights: Record<TimePrecision, number>;
  timerMs: number;
  answerModeWeights: Record<AnswerMode, number>;
  dateSpan: DateSpan;
  hour24: boolean;
}

interface DifficultyRow {
  timePrecisionWeights: Record<TimePrecision, number>;
  timerMs: number;
  answerModeWeights: Record<AnswerMode, number>;
  dateSpan: DateSpan;
  hour24: boolean;
}

// One row per difficulty level 1-10. Values are hand-tuned to match the
// spec's qualitative bands exactly (see this plan's Global Constraints),
// not derived from a formula, so each row can be adjusted independently
// during playtesting without touching a curve.
const TABLE: DifficultyRow[] = [
  {
    timePrecisionWeights: { hour: 10, half: 0, quarter: 0, five: 0, minute: 0, second: 0 },
    timerMs: 20000,
    answerModeWeights: { choice: 10, interactive: 0, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 7, half: 3, quarter: 0, five: 0, minute: 0, second: 0 },
    timerMs: 18500,
    answerModeWeights: { choice: 10, interactive: 0, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 3, half: 6, quarter: 1, five: 0, minute: 0, second: 0 },
    timerMs: 17000,
    answerModeWeights: { choice: 9, interactive: 1, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 1, half: 4, quarter: 4, five: 1, minute: 0, second: 0 },
    timerMs: 15500,
    answerModeWeights: { choice: 7, interactive: 3, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 2, quarter: 3, five: 5, minute: 0, second: 0 },
    timerMs: 14000,
    answerModeWeights: { choice: 6, interactive: 4, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 1, quarter: 2, five: 6, minute: 1, second: 0 },
    timerMs: 12500,
    answerModeWeights: { choice: 5, interactive: 5, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 1, five: 5, minute: 4, second: 0 },
    timerMs: 11000,
    answerModeWeights: { choice: 4, interactive: 5, free: 1 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 3, minute: 6, second: 1 },
    timerMs: 9500,
    answerModeWeights: { choice: 2, interactive: 5, free: 3 },
    dateSpan: 'acrossYears',
    hour24: true,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 1, minute: 6, second: 3 },
    timerMs: 8000,
    answerModeWeights: { choice: 1, interactive: 4, free: 5 },
    dateSpan: 'acrossYears',
    hour24: true,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 0, minute: 4, second: 6 },
    timerMs: 7000,
    answerModeWeights: { choice: 1, interactive: 3, free: 6 },
    dateSpan: 'acrossYears',
    hour24: true,
  },
];

export function difficultyProfile(level: number): DifficultyProfile {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  return { level: clamped, ...TABLE[clamped - 1] };
}
