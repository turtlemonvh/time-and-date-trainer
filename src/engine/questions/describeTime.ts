import { difficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import { describeTime, randomTime, type TimePrecision } from '../timeMath';
import {
  buildChoiceAnswer,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  pickPrecision,
  timeLimitFor,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const DESCRIBE_TIME_TYPE_ID = 'describeTime';

/** Reading a face and recognizing a phrase is about as quick as reading it
 * as digits. */
const TIME_LIMIT_MULTIPLIER = 1;

/** Peak 2's emphasis: turning a clock face into "quarter past three". */
export function generateDescribeTime(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  // `describeTime` speaks only in minutes, so a seconds-precision time would be
  // described as though the seconds were not there — two different clocks would
  // then share one correct wording. Cap this type at minute precision instead.
  const drawn = pickPrecision(rng, profile);
  const precision: TimePrecision = drawn === 'second' ? 'minute' : drawn;
  const time = randomTime(rng, precision);
  const correct = describeTime(time);
  const candidates = distractorTimes(time, precision).map((t) => describeTime(t));
  return {
    id: makeQuestionId(rng, DESCRIBE_TIME_TYPE_ID),
    typeId: DESCRIBE_TIME_TYPE_ID,
    prompt: 'Which words describe the time on the clock?',
    display: { kind: 'analogClock', time, showSeconds: false, showNumerals: profile.clockNumerals },
    answer: buildChoiceAnswer(rng, correct, candidates),
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `${formatClockFace(time, false)} is ${correct}.`,
  };
}

export const describeTimeType: QuestionType = {
  typeId: DESCRIBE_TIME_TYPE_ID,
  generate: generateDescribeTime,
};
