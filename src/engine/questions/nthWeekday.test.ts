import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { generateNthWeekday, NTH_WEEKDAY_TYPE_ID, nthWeekdayType } from './nthWeekday';
import { timeLimitFor, WEEKDAY_NAMES } from './support';
import { isCorrectPickDate, type GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 5, peak: getPeak(5) };

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
  /^What is the (1st|2nd|3rd|4th|last) ([A-Z][a-z]+) of ([A-Z][a-z]+) (\d{4})\?$/;

/** Every date in `year`/`monthIndex` whose weekday matches `weekdayIndex`, in ascending order. */
function weekdayOccurrences(year: number, monthIndex: number, weekdayIndex: number): Date[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const matches: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const candidate = new Date(year, monthIndex, day);
    if (candidate.getDay() === weekdayIndex) matches.push(candidate);
  }
  return matches;
}

describe('generateNthWeekday', () => {
  it('asks a pick-the-date question with no visual aid', () => {
    const q = generateNthWeekday(mulberry32(1), ctx);
    expect(q.typeId).toBe(NTH_WEEKDAY_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.answer.kind).toBe('pickDate');
    expect(q.prompt.startsWith('What is the ')).toBe(true);
  });

  it('declares a target that is a real, existing date the grader accepts', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateNthWeekday(mulberry32(seed), ctx);
      expect(q.answer.kind).toBe('pickDate');
      if (q.answer.kind !== 'pickDate') continue;
      const date = new Date(q.answer.year, q.answer.monthIndex, q.answer.day);
      expect(date.getMonth()).toBe(q.answer.monthIndex);
      expect(isCorrectPickDate(q.answer, q.answer)).toBe(true);
    }
  });

  it('computes the correct date independently of the generator, by scanning the month', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateNthWeekday(mulberry32(seed), ctx);
      const match = PROMPT_PATTERN.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      const [, ordinalText, weekdayText, monthText, yearText] = match;
      const weekdayIndex = WEEKDAY_NAMES.indexOf(weekdayText);
      const monthIndex = MONTH_NAMES.indexOf(monthText);
      const year = Number(yearText);
      const occurrences = weekdayOccurrences(year, monthIndex, weekdayIndex);
      const expected =
        ordinalText === 'last'
          ? occurrences[occurrences.length - 1]
          : occurrences[Number(ordinalText[0]) - 1];
      expect(q.answer.kind).toBe('pickDate');
      if (q.answer.kind !== 'pickDate') continue;
      expect(q.answer.year).toBe(expected.getFullYear());
      expect(q.answer.monthIndex).toBe(expected.getMonth());
      expect(q.answer.day).toBe(expected.getDate());
    }
  });

  it('only uses 1st-4th at low difficulty (never "last")', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateNthWeekday(mulberry32(seed), { ...ctx, difficulty: 3 });
      expect(q.prompt).not.toMatch(/What is the last/);
    }
  });

  it('produces "last" at high difficulty across enough draws', () => {
    let sawLast = false;
    for (let seed = 0; seed < 200; seed++) {
      const q = generateNthWeekday(mulberry32(seed), { ...ctx, difficulty: 9 });
      if (q.prompt.includes('the last ')) sawLast = true;
    }
    expect(sawLast).toBe(true);
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateNthWeekday(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(timeLimitFor(difficultyProfile(difficulty), 1.5));
    }
  });

  it('restates the target date in the explanation', () => {
    const q = generateNthWeekday(mulberry32(1), ctx);
    expect(q.answer.kind).toBe('pickDate');
    if (q.answer.kind !== 'pickDate') return;
    const date = new Date(q.answer.year, q.answer.monthIndex, q.answer.day);
    expect(q.explainCorrect).toContain(String(date.getFullYear()));
  });

  it('is deterministic for a given seed', () => {
    expect(generateNthWeekday(mulberry32(42), ctx)).toEqual(
      generateNthWeekday(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(nthWeekdayType.typeId).toBe(NTH_WEEKDAY_TYPE_ID);
    expect(nthWeekdayType.answerMode).toBe('interactive');
    expect(nthWeekdayType.generate(mulberry32(3), ctx).typeId).toBe(NTH_WEEKDAY_TYPE_ID);
  });
});
