import { formatMonthYear, weekdayOccurrencesInMonth } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import { randInt, type Rng } from '../rng';
import { makeQuestionId, randomQuestionDate, timeLimitFor, WEEKDAY_NAMES } from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const COUNT_WEEKDAYS_TYPE_ID = 'countWeekdays';

/** Counting occurrences across a whole month is more work than finding one
 * specific occurrence (`nthWeekday`), but it's free-typed rather than
 * browsed-and-picked, so it lands a little under that type's own timer. */
const TIME_LIMIT_MULTIPLIER = 1.4;

/** Every weekday name pluralizes regularly ("Monday" -> "Mondays"). */
function pluralWeekday(name: string): string {
  return `${name}s`;
}

/**
 * Peak 5's third emphasis: counting how many times a weekday occurs across
 * a whole month — "how many Mondays are in June 2026?" No display: the
 * month isn't shown, just named in the prompt, so the count can't be read
 * off a grid and has to be worked out.
 */
export function generateCountWeekdays(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const anchor = randomQuestionDate(rng, profile.dateSpan);
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();
  const weekdayIndex = randInt(rng, 0, 6);
  const weekdayName = WEEKDAY_NAMES[weekdayIndex];
  const count = weekdayOccurrencesInMonth(year, monthIndex, weekdayIndex).length;
  const monthYear = formatMonthYear(year, monthIndex);
  const plural = pluralWeekday(weekdayName);
  return {
    id: makeQuestionId(rng, COUNT_WEEKDAYS_TYPE_ID),
    typeId: COUNT_WEEKDAYS_TYPE_ID,
    prompt: `How many ${plural} are in ${monthYear}?`,
    display: { kind: 'none' },
    answer: { kind: 'number', target: count },
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `${monthYear} has ${count} ${plural}.`,
  };
}

export const countWeekdaysType: QuestionType = {
  typeId: COUNT_WEEKDAYS_TYPE_ID,
  answerMode: 'free',
  generate: generateCountWeekdays,
};
