import { difficultyProfile } from '../difficulty';
import { pick, randInt, type Rng } from '../rng';
import {
  buildChoiceAnswer,
  clockSortKey,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  shiftTime,
  timeLimitFor,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const ELAPSED_ADD_TYPE_ID = 'elapsedAdd';

/** A minute's worth of mental addition/subtraction on top of reading a
 * clock — a bit more than a single glance, well short of offsetDate's
 * multi-step date jump. */
const TIME_LIMIT_MULTIPLIER = 1.2;

/** How big a jump to add/subtract, banded by difficulty: round numbers at
 * the easy end, arbitrary minute counts (up to 3h) at the hard end. */
function pickAmountMinutes(rng: Rng, difficulty: number): number {
  if (difficulty <= 3) return pick(rng, [15, 30, 45, 60, 90]);
  if (difficulty <= 6) return randInt(rng, 1, 11) * 5;
  return randInt(rng, 1, 180);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
  if (rem === 0) return hourLabel;
  return `${hourLabel} and ${rem} minute${rem === 1 ? '' : 's'}`;
}

/**
 * Peak 6's emphasis: "it's 3:15 — what time will it be in 40 minutes?" (and
 * its mirror, "what time was it 40 minutes ago?"). Text-only, like
 * `offsetDate` — the arithmetic lives in the prompt, not a display, so
 * there's nothing here for `contract.test.ts` to re-derive a display
 * from; its own test file re-computes the arithmetic straight from the
 * prompt instead.
 */
export function generateElapsedAdd(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const start = { hour: randInt(rng, 0, 23), minute: randInt(rng, 0, 59), second: 0 };
  const amount = pickAmountMinutes(rng, ctx.difficulty);
  const forward = rng() < 0.5;
  const sign = forward ? 1 : -1;
  const correctTime = shiftTime(start, sign * amount * 60);
  const correct = formatClockFace(correctTime, false);
  const candidates = distractorTimes(correctTime, 'five').map((t) => ({
    label: formatClockFace(t, false),
    sort: clockSortKey(t),
  }));
  const duration = formatDuration(amount);
  const startLabel = formatClockFace(start, false);
  const prompt = forward
    ? `It's ${startLabel}. What time will it be in ${duration}?`
    : `It's ${startLabel}. What time was it ${duration} ago?`;
  return {
    id: makeQuestionId(rng, ELAPSED_ADD_TYPE_ID),
    typeId: ELAPSED_ADD_TYPE_ID,
    prompt,
    display: { kind: 'none' },
    answer: buildChoiceAnswer(
      rng,
      { label: correct, sort: clockSortKey(correctTime) },
      candidates,
      { ordered: profile.orderedChoices },
    ),
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: forward
      ? `${duration} after ${startLabel} is ${correct}.`
      : `${duration} before ${startLabel} is ${correct}.`,
  };
}

export const elapsedAddType: QuestionType = {
  typeId: ELAPSED_ADD_TYPE_ID,
  answerMode: 'choice',
  generate: generateElapsedAdd,
};
