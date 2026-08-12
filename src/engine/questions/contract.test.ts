import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { PEAKS } from '../peaks';
import { mulberry32 } from '../rng';
import { describeTime } from '../timeMath';
import {
  BUILT_IN_QUESTION_TYPES,
  DESCRIBE_TIME_TYPE_ID,
  ELAPSED_ADD_TYPE_ID,
  ELAPSED_BETWEEN_TYPE_ID,
  generateQuestion,
  isCorrectChoice,
  isCorrectNumber,
  OFFSET_DATE_TYPE_ID,
  READ_ANALOG_TYPE_ID,
  READ_CALENDAR_TYPE_ID,
  type AnswerSpec,
  type DisplaySpec,
  type Question,
} from './index';
import { formatClockFace, OPTION_COUNT, timeLimitFor, weekdayName } from './support';

const SEED_COUNT = 200;
const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Each generator's own `TIME_LIMIT_MULTIPLIER` constant, mirrored here so
 * this test can independently verify `timeLimitMs` rather than trusting the
 * generator's own arithmetic. Extend this alongside
 * `assertDeclaredAnswerMatchesDisplay`'s switch and the `covered` list
 * below whenever a new generator is added.
 */
const TIME_LIMIT_MULTIPLIERS: Record<string, number> = {
  [READ_ANALOG_TYPE_ID]: 1,
  [DESCRIBE_TIME_TYPE_ID]: 1,
  [READ_CALENDAR_TYPE_ID]: 1.15,
  [OFFSET_DATE_TYPE_ID]: 1.4,
  [ELAPSED_ADD_TYPE_ID]: 1.2,
  [ELAPSED_BETWEEN_TYPE_ID]: 1.3,
};

/** Distinct, reproducible seed per (difficulty, index) pair. */
function seedFor(difficulty: number, index: number): number {
  return difficulty * 104_729 + index * 7919 + 1;
}

function assertDisplayWellFormed(display: DisplaySpec): void {
  switch (display.kind) {
    case 'analogClock': {
      const { hour, minute, second } = display.time;
      for (const value of [hour, minute, second]) expect(Number.isInteger(value)).toBe(true);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThanOrEqual(59);
      if (!display.showSeconds) expect(second).toBe(0);
      return;
    }
    case 'calendar': {
      expect(Number.isInteger(display.year)).toBe(true);
      expect(display.monthIndex).toBeGreaterThanOrEqual(0);
      expect(display.monthIndex).toBeLessThanOrEqual(11);
      // The highlighted day must exist in the highlighted month.
      const date = new Date(display.year, display.monthIndex, display.highlightDay);
      expect(date.getFullYear()).toBe(display.year);
      expect(date.getMonth()).toBe(display.monthIndex);
      expect(date.getDate()).toBe(display.highlightDay);
      return;
    }
    case 'none':
      return;
  }
}

function assertAnswerGrades(spec: AnswerSpec): void {
  switch (spec.kind) {
    case 'choice': {
      const answer = spec;
      expect(answer.options).toHaveLength(OPTION_COUNT);
      for (const option of answer.options) {
        expect(typeof option).toBe('string');
        expect(option.trim().length).toBeGreaterThan(0);
      }
      // No duplicate option text: a duplicate means a "wrong" answer that is
      // word-for-word identical to the right one.
      expect(new Set(answer.options).size).toBe(OPTION_COUNT);
      expect(Number.isInteger(answer.correctIndex)).toBe(true);
      expect(answer.correctIndex).toBeGreaterThanOrEqual(0);
      expect(answer.correctIndex).toBeLessThan(OPTION_COUNT);

      // The declared correct answer validates true...
      expect(isCorrectChoice(answer, answer.correctIndex)).toBe(true);
      // ...and every distractor validates false.
      for (let i = 0; i < answer.options.length; i++) {
        if (i === answer.correctIndex) continue;
        expect(isCorrectChoice(answer, i)).toBe(false);
        expect(answer.options[i]).not.toBe(answer.options[answer.correctIndex]);
      }
      return;
    }
    case 'number': {
      expect(Number.isInteger(spec.target)).toBe(true);
      expect(isCorrectNumber(spec, spec.target)).toBe(true);
      expect(isCorrectNumber(spec, spec.target + 1)).toBe(false);
      expect(isCorrectNumber(spec, spec.target - 1)).toBe(false);
      return;
    }
    case 'setHands':
    case 'pickDate':
      // No generator produces these yet; the PR that adds one extends this
      // switch with its own grading assertions.
      return;
  }
}

/**
 * Re-derives the right answer from the question's own display, independently of
 * whatever the generator believed. This is the assertion that actually catches
 * "the game marked her right answer wrong".
 */
function assertDeclaredAnswerMatchesDisplay(q: Question): void {
  // A typeId whose answer isn't choice-kind (elapsedBetween's `number`, and
  // any future setHands/pickDate generator) handles its own re-derivation
  // inside its switch case below, since `declared`/`answer.options` here
  // don't apply to those kinds.
  if (q.typeId === ELAPSED_BETWEEN_TYPE_ID) {
    expect(q.answer.kind).toBe('number');
    if (q.answer.kind !== 'number') return;
    expect(q.display.kind).toBe('none');
    // Re-derive the elapsed minutes straight from the prompt's two 12-hour,
    // no-AM/PM clock-face labels via mod-720 (half-day) arithmetic — since
    // the generator guarantees the true elapsed span is under 720 minutes,
    // this recovers the unique correct value with no AM/PM to disambiguate.
    const match = q.prompt.match(
      /^It's (\d{1,2}):(\d{2})\. It becomes (\d{1,2}):(\d{2})\. How many minutes have passed\?$/,
    );
    expect(match).not.toBeNull();
    if (!match) return;
    const [, startHour, startMin, endHour, endMin] = match;
    const startOfHalfDay = (Number(startHour) % 12) * 60 + Number(startMin);
    const endOfHalfDay = (Number(endHour) % 12) * 60 + Number(endMin);
    const elapsed = (((endOfHalfDay - startOfHalfDay) % 720) + 720) % 720;
    expect(q.answer.target).toBe(elapsed);
    return;
  }
  if (q.answer.kind !== 'choice') return;
  const answer = q.answer;
  const declared = answer.options[answer.correctIndex];
  switch (q.typeId) {
    case READ_ANALOG_TYPE_ID: {
      expect(q.display.kind).toBe('analogClock');
      if (q.display.kind !== 'analogClock') return;
      expect(declared).toBe(formatClockFace(q.display.time, q.display.showSeconds));
      // A clock face cannot show AM/PM, so no option may claim it.
      for (const option of answer.options) expect(option).not.toMatch(/AM|PM/);
      return;
    }
    case DESCRIBE_TIME_TYPE_ID: {
      expect(q.display.kind).toBe('analogClock');
      if (q.display.kind !== 'analogClock') return;
      expect(declared).toBe(describeTime(q.display.time));
      return;
    }
    case READ_CALENDAR_TYPE_ID: {
      expect(q.display.kind).toBe('calendar');
      if (q.display.kind !== 'calendar') return;
      const date = new Date(q.display.year, q.display.monthIndex, q.display.highlightDay);
      expect(declared).toBe(weekdayName(date));
      return;
    }
    case OFFSET_DATE_TYPE_ID: {
      // No display to re-derive from; offsetDate.test.ts re-computes the
      // arithmetic straight from the prompt instead.
      expect(q.display.kind).toBe('none');
      expect(declared).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      return;
    }
    case ELAPSED_ADD_TYPE_ID: {
      // No display to re-derive from, same as offsetDate; elapsedAdd.test.ts
      // re-computes the arithmetic straight from the prompt instead.
      expect(q.display.kind).toBe('none');
      expect(declared).toMatch(/^\d{1,2}:\d{2}$/);
      return;
    }
    default:
      throw new Error(
        `contract test has no cross-check for typeId "${q.typeId}" — add one when adding a type`,
      );
  }
}

function assertWellFormed(q: Question, typeId: string, difficulty: number): void {
  expect(q.typeId).toBe(typeId);
  expect(q.id.startsWith(`${typeId}-`)).toBe(true);
  expect(q.id.length).toBeGreaterThan(typeId.length + 1);
  expect(q.prompt.trim().length).toBeGreaterThan(0);
  expect(q.explainCorrect.trim().length).toBeGreaterThan(0);

  // The time limit is sane: a whole number of ms, exactly the difficulty
  // table's base timer scaled by this type's own multiplier, and inside a
  // band a child can actually work within.
  expect(Number.isInteger(q.timeLimitMs)).toBe(true);
  const multiplier = TIME_LIMIT_MULTIPLIERS[typeId] ?? 1;
  expect(q.timeLimitMs).toBe(timeLimitFor(difficultyProfile(difficulty), multiplier));
  expect(q.timeLimitMs).toBeGreaterThanOrEqual(5_000);
  expect(q.timeLimitMs).toBeLessThanOrEqual(45_000);

  assertDisplayWellFormed(q.display);
  assertAnswerGrades(q.answer);
  assertDeclaredAnswerMatchesDisplay(q);
}

describe('generator contract', () => {
  for (const type of BUILT_IN_QUESTION_TYPES) {
    describe(type.typeId, () => {
      for (const difficulty of DIFFICULTIES) {
        it(`is well formed at difficulty ${difficulty} over ${SEED_COUNT} seeds`, () => {
          for (let index = 0; index < SEED_COUNT; index++) {
            const rng = mulberry32(seedFor(difficulty, index));
            const peak = PEAKS[index % PEAKS.length];
            assertWellFormed(type.generate(rng, { difficulty, peak }), type.typeId, difficulty);
          }
        });
      }
    });
  }

  describe('registry selection', () => {
    for (const difficulty of DIFFICULTIES) {
      it(`produces well-formed questions at difficulty ${difficulty}`, () => {
        const rng = mulberry32(seedFor(difficulty, 999));
        for (let index = 0; index < SEED_COUNT; index++) {
          const peak = PEAKS[index % PEAKS.length];
          const q = generateQuestion(rng, { difficulty, peak });
          assertWellFormed(q, q.typeId, difficulty);
        }
      });
    }
  });

  it('has a cross-check for every registered type', () => {
    const covered = [
      READ_ANALOG_TYPE_ID,
      DESCRIBE_TIME_TYPE_ID,
      READ_CALENDAR_TYPE_ID,
      OFFSET_DATE_TYPE_ID,
      ELAPSED_ADD_TYPE_ID,
      ELAPSED_BETWEEN_TYPE_ID,
    ];
    for (const type of BUILT_IN_QUESTION_TYPES) {
      expect(covered).toContain(type.typeId);
    }
  });

  it('has a declared time-limit multiplier for every registered type', () => {
    for (const type of BUILT_IN_QUESTION_TYPES) {
      expect(Object.keys(TIME_LIMIT_MULTIPLIERS)).toContain(type.typeId);
    }
  });
});
