import { difficultyProfile } from '../difficulty';
import { randInt, type Rng } from '../rng';
import { buildChoiceAnswer, makeQuestionId, timeLimitFor, WEEKDAY_NAMES } from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const DAY_OF_WEEK_TYPE_ID = 'dayOfWeek';

/** Pure modular arithmetic on a 7-day cycle — a bit more abstract than a
 * single glance, but simpler than counting real calendar days. */
const TIME_LIMIT_MULTIPLIER = 1.1;

/** How many days ahead/behind to ask about, banded by difficulty: within one
 * week at the easy end (no wraparound needed), multiple weeks at the hard
 * end (forces genuine mod-7 reasoning, not just counting forward). */
function pickDaysAhead(rng: Rng, difficulty: number): number {
  if (difficulty <= 3) return randInt(rng, 1, 6);
  if (difficulty <= 6) return randInt(rng, 1, 20);
  return randInt(rng, 1, 60);
}

/**
 * Peak 5's emphasis: reasoning about the 7-day cycle itself, independent of
 * any real calendar date — "if today is Wednesday, what day will it be in
 * 10 days?" No display: there's no date to show, just a starting weekday
 * name and an offset.
 */
export function generateDayOfWeek(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const startIndex = randInt(rng, 0, 6);
  const amount = pickDaysAhead(rng, ctx.difficulty);
  const forward = rng() < 0.5;
  const delta = forward ? amount : -amount;
  const correctIndex = (((startIndex + delta) % 7) + 7) % 7;
  const correct = WEEKDAY_NAMES[correctIndex];
  const candidates = WEEKDAY_NAMES.filter((name) => name !== correct).map((name) => ({
    label: name,
    sort: WEEKDAY_NAMES.indexOf(name),
  }));
  const startName = WEEKDAY_NAMES[startIndex];
  const dayWord = amount === 1 ? 'day' : 'days';
  const prompt = forward
    ? `If today is ${startName}, what day of the week will it be in ${amount} ${dayWord}?`
    : `If today is ${startName}, what day of the week was it ${amount} ${dayWord} ago?`;
  return {
    id: makeQuestionId(rng, DAY_OF_WEEK_TYPE_ID),
    typeId: DAY_OF_WEEK_TYPE_ID,
    prompt,
    display: { kind: 'none' },
    answer: buildChoiceAnswer(rng, { label: correct, sort: correctIndex }, candidates, {
      ordered: profile.orderedChoices,
    }),
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: forward
      ? `${amount} ${dayWord} after ${startName} is ${correct}.`
      : `${amount} ${dayWord} before ${startName} is ${correct}.`,
  };
}

export const dayOfWeekType: QuestionType = {
  typeId: DAY_OF_WEEK_TYPE_ID,
  answerMode: 'choice',
  generate: generateDayOfWeek,
};
