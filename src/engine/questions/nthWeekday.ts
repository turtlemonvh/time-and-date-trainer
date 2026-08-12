import { formatDateLong, formatMonthYear, nthWeekdayOfMonth } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import { randInt, type Rng } from '../rng';
import { makeQuestionId, randomQuestionDate, timeLimitFor, WEEKDAY_NAMES } from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const NTH_WEEKDAY_TYPE_ID = 'nthWeekday';

/** Browsing a `DatePicker` to find one specific date is the most
 * interaction-heavy answer this engine asks for yet. */
const TIME_LIMIT_MULTIPLIER = 1.5;

type NthDescriptor = 1 | 2 | 3 | 4 | 'last';

const ORDINAL_WORDS: Record<1 | 2 | 3 | 4, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
};

function descriptorLabel(n: NthDescriptor): string {
  return n === 'last' ? 'last' : ORDINAL_WORDS[n];
}

/**
 * 1st-4th at every difficulty (guaranteed to exist in any month); `'last'`
 * only from difficulty 6 up — "the last Friday of the month" is a real
 * everyday phrase, but it's a step more abstract than counting occurrences
 * (a "last" isn't always a 5th, and isn't always a 4th either).
 */
function pickDescriptor(rng: Rng, difficulty: number): NthDescriptor {
  if (difficulty >= 6 && rng() < 0.3) return 'last';
  return randInt(rng, 1, 4) as 1 | 2 | 3 | 4;
}

/**
 * Peak 5's other emphasis: finding the nth (or last) occurrence of a
 * weekday in a month — "the 3rd Tuesday of June 2026" — by picking it
 * directly on a `DatePicker`. No display: the picker itself, opened on the
 * right month via `PickDateAnswer`'s `year`/`monthIndex`, is the only
 * visual aid, and it's part of the answer widget, not a separate display.
 */
export function generateNthWeekday(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const anchor = randomQuestionDate(rng, profile.dateSpan);
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();
  const weekdayIndex = randInt(rng, 0, 6);
  const weekdayName = WEEKDAY_NAMES[weekdayIndex];
  const descriptor = pickDescriptor(rng, ctx.difficulty);
  const label = descriptorLabel(descriptor);
  const target = nthWeekdayOfMonth(year, monthIndex, weekdayIndex, descriptor);
  const monthYear = formatMonthYear(year, monthIndex);
  return {
    id: makeQuestionId(rng, NTH_WEEKDAY_TYPE_ID),
    typeId: NTH_WEEKDAY_TYPE_ID,
    prompt: `What is the ${label} ${weekdayName} of ${monthYear}?`,
    display: { kind: 'none' },
    answer: {
      kind: 'pickDate',
      year: target.getFullYear(),
      monthIndex: target.getMonth(),
      day: target.getDate(),
    },
    timeLimitMs: timeLimitFor(profile, TIME_LIMIT_MULTIPLIER),
    explainCorrect: `The ${label} ${weekdayName} of ${monthYear} is ${formatDateLong(target)}.`,
  };
}

export const nthWeekdayType: QuestionType = {
  typeId: NTH_WEEKDAY_TYPE_ID,
  answerMode: 'interactive',
  generate: generateNthWeekday,
};
