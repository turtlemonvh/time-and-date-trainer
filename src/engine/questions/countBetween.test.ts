import { differenceInCalendarDays, isLeapYear } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { countBetweenType, COUNT_BETWEEN_TYPE_ID, generateCountBetween } from './countBetween';
import { timeLimitFor } from './support';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 9, peak: getPeak(9) };

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PROMPT_PATTERN =
  /^How many days are there from ([A-Z][a-z]+) (\d{1,2}), (\d{4}) to ([A-Z][a-z]+) (\d{1,2}), (\d{4})\?$/;

function parsePrompt(prompt: string): { start: Date; end: Date } {
  const match = PROMPT_PATTERN.exec(prompt);
  if (!match) throw new Error(`unexpected prompt: ${prompt}`);
  const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = match;
  return {
    start: new Date(Number(startYear), MONTH_NAMES.indexOf(startMonth), Number(startDay)),
    end: new Date(Number(endYear), MONTH_NAMES.indexOf(endMonth), Number(endDay)),
  };
}

describe('generateCountBetween', () => {
  it('asks a free-typed day-count question with no visual aid', () => {
    const q = generateCountBetween(mulberry32(1), ctx);
    expect(q.typeId).toBe(COUNT_BETWEEN_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.answer.kind).toBe('number');
    expect(q.prompt.startsWith('How many days are there from ')).toBe(true);
  });

  it('declares a positive day count with a "days" unit', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateCountBetween(mulberry32(seed), ctx);
      expect(q.answer.kind).toBe('number');
      if (q.answer.kind !== 'number') continue;
      expect(Number.isInteger(q.answer.target)).toBe(true);
      expect(q.answer.target).toBeGreaterThan(0);
      expect(q.answer.unit).toBe('days');
    }
  });

  it('computes the day count independently of the generator, via the two stated dates', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateCountBetween(mulberry32(seed), ctx);
      const { start, end } = parsePrompt(q.prompt);
      const expected = differenceInCalendarDays(end, start);
      expect(q.answer.kind).toBe('number');
      if (q.answer.kind !== 'number') continue;
      expect(q.answer.target).toBe(expected);
    }
  });

  it('the end date is always after the start date', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateCountBetween(mulberry32(seed), ctx);
      const { start, end } = parsePrompt(q.prompt);
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    }
  });

  it('produces spans that cross a leap day across enough draws at high difficulty', () => {
    let sawLeapCrossing = false;
    for (let seed = 0; seed < 300; seed++) {
      const q = generateCountBetween(mulberry32(seed), { ...ctx, difficulty: 9 });
      const { start, end } = parsePrompt(q.prompt);
      for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        if (!isLeapYear(new Date(year, 0, 1))) continue;
        const feb29 = new Date(year, 1, 29);
        if (feb29.getTime() > start.getTime() && feb29.getTime() <= end.getTime()) {
          sawLeapCrossing = true;
        }
      }
    }
    expect(sawLeapCrossing).toBe(true);
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateCountBetween(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(timeLimitFor(difficultyProfile(difficulty), 1.5));
    }
  });

  it('restates the day count in the explanation', () => {
    const q = generateCountBetween(mulberry32(1), ctx);
    expect(q.answer.kind).toBe('number');
    if (q.answer.kind !== 'number') return;
    expect(q.explainCorrect).toContain(String(q.answer.target));
  });

  it('is deterministic for a given seed', () => {
    expect(generateCountBetween(mulberry32(42), ctx)).toEqual(
      generateCountBetween(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(countBetweenType.typeId).toBe(COUNT_BETWEEN_TYPE_ID);
    expect(countBetweenType.answerMode).toBe('free');
    expect(countBetweenType.generate(mulberry32(3), ctx).typeId).toBe(COUNT_BETWEEN_TYPE_ID);
  });
});
