import { formatDateLong, offsetDate, type DateOffsetUnit } from '../dateMath';
import { difficultyProfile, type DateSpan } from '../difficulty';
import { pick, randInt, type Rng } from '../rng';
import {
  buildChoiceAnswer,
  dateRangeForSpan,
  makeQuestionId,
  randomQuestionDate,
  timeLimitFor,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const OFFSET_DATE_TYPE_ID = 'offsetDate';

/** Counting a jump across a calendar (and, at higher difficulty, across
 * months or years) is genuinely multi-step compared to reading a single
 * clock face — the slowest of the four existing generators. */
export const OFFSET_DATE_TIME_LIMIT_MULTIPLIER = 1.4;

interface OffsetPlan {
  start: Date;
  unit: DateOffsetUnit;
  amount: number;
  forward: boolean;
}

const UNIT_LABELS: Record<DateOffsetUnit, { one: string; many: string }> = {
  day: { one: 'day', many: 'days' },
  week: { one: 'week', many: 'weeks' },
  month: { one: 'month', many: 'months' },
};

/**
 * Chooses the start date and the jump, sized so the answer lands where the
 * difficulty band's declared date span says it should.
 */
function planOffset(rng: Rng, span: DateSpan): OffsetPlan {
  switch (span) {
    case 'withinMonth': {
      // Start on days 1-14 and move forward 1-14 days, so the answer lands on
      // day 2-28 — a day that exists in every month, in the same month.
      const year = dateRangeForSpan('withinMonth').start.getFullYear();
      const monthIndex = randInt(rng, 0, 11);
      const start = new Date(year, monthIndex, randInt(rng, 1, 14));
      return { start, unit: 'day', amount: randInt(rng, 1, 14), forward: true };
    }
    case 'acrossMonths': {
      let start = randomQuestionDate(rng, 'acrossMonths');
      const unit = pick(rng, ['day', 'week', 'month'] as const);
      // date-fns' addMonths clamps to month-end (e.g. "1 month after Aug 31"
      // becomes "Sep 30"), which a child counting forward on a calendar
      // couldn't derive. Days 1-28 exist in every month, so pinning the start
      // date's day-of-month there for month-unit questions keeps the answer
      // reachable by counting.
      if (unit === 'month' && start.getDate() > 28) {
        start = new Date(start.getFullYear(), start.getMonth(), 28);
      }
      const amount =
        unit === 'day'
          ? randInt(rng, 8, 25)
          : unit === 'week'
            ? randInt(rng, 2, 6)
            : randInt(rng, 1, 4);
      return { start, unit, amount, forward: rng() < 0.5 };
    }
    case 'acrossYears': {
      let start = randomQuestionDate(rng, 'acrossYears');
      const unit = pick(rng, ['week', 'month'] as const);
      // Same month-end clamping hazard as the acrossMonths branch above.
      if (unit === 'month' && start.getDate() > 28) {
        start = new Date(start.getFullYear(), start.getMonth(), 28);
      }
      const amount = unit === 'week' ? randInt(rng, 10, 40) : randInt(rng, 5, 20);
      return { start, unit, amount, forward: rng() < 0.5 };
    }
  }
}

/**
 * Peak 7's emphasis: "what date is three weeks after ...".
 *
 * Every candidate is a real date produced by `offsetDate`, differing from the
 * answer by the count, the unit, or the direction — the three ways a child
 * actually gets this wrong. Because they are all distinct offsets of the same
 * start date they cannot collide with the correct answer.
 */
export function generateOffsetDate(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const plan = planOffset(rng, profile.dateSpan);
  const sign = plan.forward ? 1 : -1;
  const correctDate = offsetDate(plan.start, sign * plan.amount, plan.unit);
  const correct = formatDateLong(correctDate);
  const altUnit: DateOffsetUnit = plan.unit === 'day' ? 'week' : 'day';
  const candidates = [
    offsetDate(plan.start, sign * (plan.amount + 1), plan.unit),
    offsetDate(plan.start, sign * (plan.amount - 1), plan.unit),
    offsetDate(plan.start, -sign * plan.amount, plan.unit),
    offsetDate(plan.start, sign * (plan.amount + 2), plan.unit),
    offsetDate(plan.start, sign * plan.amount, altUnit),
    offsetDate(plan.start, sign * (plan.amount + 3), plan.unit),
    offsetDate(plan.start, sign * (plan.amount + 7), plan.unit),
  ].map((d) => ({ label: formatDateLong(d), sort: d.getTime() }));

  const label = UNIT_LABELS[plan.unit];
  const unitWord = plan.amount === 1 ? label.one : label.many;
  const direction = plan.forward ? 'after' : 'before';
  const longStart = formatDateLong(plan.start);
  return {
    id: makeQuestionId(rng, OFFSET_DATE_TYPE_ID),
    typeId: OFFSET_DATE_TYPE_ID,
    prompt: `What date is ${plan.amount} ${unitWord} ${direction} ${longStart}?`,
    display: { kind: 'none' },
    answer: buildChoiceAnswer(rng, { label: correct, sort: correctDate.getTime() }, candidates, {
      ordered: profile.orderedChoices,
    }),
    timeLimitMs: timeLimitFor(profile, OFFSET_DATE_TIME_LIMIT_MULTIPLIER),
    explainCorrect: `${plan.amount} ${unitWord} ${direction} ${longStart} is ${correct}.`,
  };
}

export const offsetDateType: QuestionType = {
  typeId: OFFSET_DATE_TYPE_ID,
  answerMode: 'choice',
  generate: generateOffsetDate,
};
