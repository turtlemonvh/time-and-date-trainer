import { formatDateLong } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import {
  buildChoiceAnswer,
  makeQuestionId,
  randomQuestionDate,
  timeLimitFor,
  weekdayName,
  WEEKDAY_NAMES,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const READ_CALENDAR_TYPE_ID = 'readCalendar';

/** Finding a highlighted day on a month grid, then reading its column
 * heading, takes a bit longer than a glance at a clock face. */
export const READ_CALENDAR_TIME_LIMIT_MULTIPLIER = 1.15;

/**
 * Peak 3's emphasis: find a date on a month grid and read its column heading.
 * The distractor pool is the other six weekday names, so it is distinct by
 * construction and can never contain the correct answer.
 */
export function generateReadCalendar(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const date = randomQuestionDate(rng, profile.dateSpan);
  const correct = weekdayName(date);
  const candidates = WEEKDAY_NAMES.filter((name) => name !== correct).map((name) => ({
    label: name,
    sort: WEEKDAY_NAMES.indexOf(name),
  }));
  const longDate = formatDateLong(date);
  return {
    id: makeQuestionId(rng, READ_CALENDAR_TYPE_ID),
    typeId: READ_CALENDAR_TYPE_ID,
    prompt: `What day of the week is ${longDate}?`,
    display: {
      kind: 'calendar',
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      highlightDay: date.getDate(),
    },
    answer: buildChoiceAnswer(
      rng,
      { label: correct, sort: WEEKDAY_NAMES.indexOf(correct) },
      candidates,
      { ordered: profile.orderedChoices },
    ),
    timeLimitMs: timeLimitFor(profile, READ_CALENDAR_TIME_LIMIT_MULTIPLIER),
    explainCorrect: `${longDate} is a ${correct}.`,
  };
}

export const readCalendarType: QuestionType = {
  typeId: READ_CALENDAR_TYPE_ID,
  generate: generateReadCalendar,
};
