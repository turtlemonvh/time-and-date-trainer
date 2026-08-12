import { daysBetween, formatDateLong, offsetDate } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import { randInt, type Rng } from '../rng';
import { makeQuestionId, randomQuestionDate, timeLimitFor } from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const COUNT_BETWEEN_TYPE_ID = 'countBetween';

/** Free-typed counting across a span that can run into the hundreds of
 * days — the most demanding count this engine asks for yet. */
const TIME_LIMIT_MULTIPLIER = 1.5;

/**
 * How many days the two dates are apart, banded by difficulty. The low
 * band stays small (no leap-year relevance yet); from difficulty 7 up —
 * where `answerModeWeights.free` first goes positive, so this is where the
 * type actually gets drawn — spans run into the hundreds of days, likely
 * to cross at least one February 29th within `dateSpan: 'acrossYears'`'s
 * 2024-2028 window (see `support.ts`'s own comment on that range).
 */
function pickSpanDays(rng: Rng, difficulty: number): number {
  if (difficulty <= 3) return randInt(rng, 5, 25);
  if (difficulty <= 6) return randInt(rng, 20, 120);
  return randInt(rng, 100, 1000);
}

/**
 * Peak 9's emphasis: counting the days between two real calendar dates,
 * typed in — potentially crossing a leap day, which the player can't get
 * right by guessing whether a February has 28 or 29 days if they don't
 * actually count. No display: both dates are stated in the prompt.
 */
export function generateCountBetween(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const start = randomQuestionDate(rng, profile.dateSpan);
  const spanDays = pickSpanDays(rng, ctx.difficulty);
  const end = offsetDate(start, spanDays, 'day');
  const target = daysBetween(start, end);
  const startLabel = formatDateLong(start);
  const endLabel = formatDateLong(end);
  return {
    id: makeQuestionId(rng, COUNT_BETWEEN_TYPE_ID),
    typeId: COUNT_BETWEEN_TYPE_ID,
    prompt: `How many days are there from ${startLabel} to ${endLabel}?`,
    display: { kind: 'none' },
    answer: { kind: 'number', target, unit: 'days' },
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `From ${startLabel} to ${endLabel} is ${target} days.`,
  };
}

export const countBetweenType: QuestionType = {
  typeId: COUNT_BETWEEN_TYPE_ID,
  answerMode: 'free',
  generate: generateCountBetween,
};
