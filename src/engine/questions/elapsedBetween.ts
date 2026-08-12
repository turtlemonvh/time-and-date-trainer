import { difficultyProfile } from '../difficulty';
import { randInt, type Rng } from '../rng';
import { formatClockFace, makeQuestionId, timeLimitFor } from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const ELAPSED_BETWEEN_TYPE_ID = 'elapsedBetween';

/** A free-typed subtraction between two clock readings — no options to
 * scan, so a touch more time than the choice-mode elapsedAdd. */
const TIME_LIMIT_MULTIPLIER = 1.3;

/** How many minutes apart the two times are, banded by difficulty. Capped
 * well under 24h so the pair never needs to cross midnight — "how many
 * minutes between these two clock readings" stays same-day and unambiguous. */
function pickElapsedMinutes(rng: Rng, difficulty: number): number {
  if (difficulty <= 3) return randInt(rng, 5, 55);
  if (difficulty <= 6) return randInt(rng, 5, 120);
  return randInt(rng, 1, 300);
}

/**
 * Peak 6's free-entry counterpart to `elapsedAdd`: given a start and end
 * clock reading, type the number of minutes between them. Both times are
 * drawn from the same day (see `pickElapsedMinutes`), so the answer is
 * always their plain difference — no day-boundary bookkeeping.
 */
export function generateElapsedBetween(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const elapsedMinutes = pickElapsedMinutes(rng, ctx.difficulty);
  const startTotal = randInt(rng, 0, 1439 - elapsedMinutes);
  const endTotal = startTotal + elapsedMinutes;
  const start = { hour: Math.floor(startTotal / 60), minute: startTotal % 60, second: 0 };
  const end = { hour: Math.floor(endTotal / 60), minute: endTotal % 60, second: 0 };
  const startLabel = formatClockFace(start, false);
  const endLabel = formatClockFace(end, false);
  return {
    id: makeQuestionId(rng, ELAPSED_BETWEEN_TYPE_ID),
    typeId: ELAPSED_BETWEEN_TYPE_ID,
    prompt: `It's ${startLabel}. It becomes ${endLabel}. How many minutes have passed?`,
    display: { kind: 'none' },
    answer: { kind: 'number', target: elapsedMinutes, unit: 'minutes' },
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `From ${startLabel} to ${endLabel} is ${elapsedMinutes} minutes.`,
  };
}

export const elapsedBetweenType: QuestionType = {
  typeId: ELAPSED_BETWEEN_TYPE_ID,
  answerMode: 'free',
  generate: generateElapsedBetween,
};
