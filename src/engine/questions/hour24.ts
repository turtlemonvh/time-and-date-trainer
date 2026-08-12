import { difficultyProfile, type DifficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import {
  formatTime12,
  formatTime24,
  randomTime,
  type TimeOfDay,
  type TimePrecision,
} from '../timeMath';
import {
  buildChoiceAnswer,
  distractorTimes,
  makeQuestionId,
  pickPrecision,
  shiftTime,
  timeLimitFor,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const HOUR24_TYPE_ID = 'hour24';

/** Converting between clock notations is a small but real extra step
 * beyond just reading a time. */
const TIME_LIMIT_MULTIPLIER = 1.2;

/** Like `pickPrecision`, but never `'second'` — converting notations gains
 * nothing from second-level precision, and it'd just add visual noise. */
function pickConversionPrecision(rng: Rng, profile: DifficultyProfile): TimePrecision {
  const precision = pickPrecision(rng, profile);
  return precision === 'second' ? 'minute' : precision;
}

const SECONDS_PER_HALF_DAY = 12 * 3600;

function sortKey(t: TimeOfDay): number {
  return t.hour * 3600 + t.minute * 60 + t.second;
}

/**
 * Peak 8's emphasis: converting between 12-hour (AM/PM) and 24-hour clock
 * notation, in either direction. The classic mistake — forgetting to
 * add/subtract 12 hours, i.e. mixing up the two halves of the day — is
 * folded into the distractor pool directly via a ±12h shift of the target,
 * alongside the usual off-by-a-bit misreadings `distractorTimes` already
 * covers for other clock-reading types.
 */
export function generateHour24(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const precision = pickConversionPrecision(rng, profile);
  const time = randomTime(rng, precision);
  const to24 = rng() < 0.5;
  const format = to24 ? formatTime24 : formatTime12;
  const given = to24 ? formatTime12(time) : formatTime24(time);
  const correct = format(time);
  const rawCandidates = [
    ...distractorTimes(time, precision),
    shiftTime(time, SECONDS_PER_HALF_DAY),
    shiftTime(time, -SECONDS_PER_HALF_DAY),
  ];
  const candidates = rawCandidates.map((t) => ({ label: format(t), sort: sortKey(t) }));
  const prompt = to24 ? `What is ${given} in 24-hour time?` : `What is ${given} in 12-hour time?`;
  return {
    id: makeQuestionId(rng, HOUR24_TYPE_ID),
    typeId: HOUR24_TYPE_ID,
    prompt,
    display: { kind: 'none' },
    answer: buildChoiceAnswer(rng, { label: correct, sort: sortKey(time) }, candidates, {
      ordered: profile.orderedChoices,
    }),
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `${given} is ${correct}.`,
  };
}

export const hour24Type: QuestionType = {
  typeId: HOUR24_TYPE_ID,
  answerMode: 'choice',
  generate: generateHour24,
};
