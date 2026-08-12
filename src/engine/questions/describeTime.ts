import { difficultyProfile, type DescribePhrasingTier } from '../difficulty';
import type { Rng } from '../rng';
import { describeTime, randomTime, type TimePrecision } from '../timeMath';
import {
  buildChoiceAnswer,
  clockSortKey,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  timeLimitFor,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const DESCRIBE_TIME_TYPE_ID = 'describeTime';

/** Reading a face and recognizing a phrase is about as quick as reading it
 * as digits. */
const TIME_LIMIT_MULTIPLIER = 1;

/**
 * The minute precision to *draw* for each phrasing tier — this is what
 * actually restricts which minute values appear, not a distractor concern.
 * `'minute'` for `anyMinute` draws any of the 60 values; the others draw
 * exactly the minutes that tier's phrasing covers (half/quarter/five-minute
 * marks), so every question this type asks is phrased idiomatically for its
 * tier by construction — there's no separate filter needed.
 */
const DRAW_PRECISION: Record<DescribePhrasingTier, TimePrecision> = {
  halves: 'half',
  quarters: 'quarter',
  fives: 'five',
  anyMinute: 'minute',
};

/**
 * The step distractors are offset by. Matches `DRAW_PRECISION` for every
 * tier except `anyMinute`: a 1-minute gap between two odd-minute phrasings
 * ("sixteen past two" vs "seventeen past two") is a coin flip, not a
 * question, so that tier keeps a 5-minute distractor step even though its
 * draw isn't restricted to multiples of 5.
 */
const DISTRACTOR_PRECISION: Record<DescribePhrasingTier, TimePrecision> = {
  halves: 'half',
  quarters: 'quarter',
  fives: 'five',
  anyMinute: 'five',
};

/** Peak 2's emphasis: turning a clock face into "quarter past three". */
export function generateDescribeTime(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const time = randomTime(rng, DRAW_PRECISION[profile.describePhrasing]);
  const correct = describeTime(time);
  const candidates = distractorTimes(time, DISTRACTOR_PRECISION[profile.describePhrasing]).map(
    (t) => ({ label: describeTime(t), sort: clockSortKey(t) }),
  );
  return {
    id: makeQuestionId(rng, DESCRIBE_TIME_TYPE_ID),
    typeId: DESCRIBE_TIME_TYPE_ID,
    prompt: 'Which words describe the time on the clock?',
    display: { kind: 'analogClock', time, showSeconds: false, showNumerals: profile.clockNumerals },
    answer: buildChoiceAnswer(rng, { label: correct, sort: clockSortKey(time) }, candidates, {
      ordered: profile.orderedChoices,
    }),
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `${formatClockFace(time, false)} is ${correct}.`,
  };
}

export const describeTimeType: QuestionType = {
  typeId: DESCRIBE_TIME_TYPE_ID,
  generate: generateDescribeTime,
};
