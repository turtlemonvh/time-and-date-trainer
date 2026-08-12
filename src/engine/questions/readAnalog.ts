import { difficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import { randomTime } from '../timeMath';
import {
  buildChoiceAnswer,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  pickPrecision,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const READ_ANALOG_TYPE_ID = 'readAnalog';

/** Peak 1's bread and butter: an analog face, four candidate readings. */
export function generateReadAnalog(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const precision = pickPrecision(rng, profile);
  const showSeconds = precision === 'second';
  const time = randomTime(rng, precision);
  const correct = formatClockFace(time, showSeconds);
  const candidates = distractorTimes(time, precision).map((t) => formatClockFace(t, showSeconds));
  return {
    id: makeQuestionId(rng, READ_ANALOG_TYPE_ID),
    typeId: READ_ANALOG_TYPE_ID,
    prompt: 'What time does the clock show?',
    display: { kind: 'analogClock', time, showSeconds, showNumerals: profile.clockNumerals },
    answer: buildChoiceAnswer(rng, correct, candidates),
    timeLimitMs: profile.timerMs,
    explainCorrect: `The clock shows ${correct}.`,
  };
}

export const readAnalogType: QuestionType = {
  typeId: READ_ANALOG_TYPE_ID,
  generate: generateReadAnalog,
};
