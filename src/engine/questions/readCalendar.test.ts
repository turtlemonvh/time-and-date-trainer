import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import {
  generateReadCalendar,
  READ_CALENDAR_TYPE_ID,
  readCalendarType,
  READ_CALENDAR_TIME_LIMIT_MULTIPLIER,
} from './readCalendar';
import { timeLimitFor, weekdayName, WEEKDAY_NAMES } from './support';
import { expectChoiceAnswer } from './testSupport';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(3) };

describe('generateReadCalendar', () => {
  it('shows a calendar month with one day highlighted', () => {
    const q = generateReadCalendar(mulberry32(1), ctx);
    expect(q.typeId).toBe(READ_CALENDAR_TYPE_ID);
    expect(q.display.kind).toBe('calendar');
  });

  it('highlights a day that actually exists in the displayed month', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 9 });
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      const date = new Date(q.display.year, q.display.monthIndex, q.display.highlightDay);
      expect(date.getMonth()).toBe(q.display.monthIndex);
      expect(date.getDate()).toBe(q.display.highlightDay);
    }
  });

  it('marks the weekday of the highlighted date as correct', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadCalendar(mulberry32(seed), ctx);
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      const date = new Date(q.display.year, q.display.monthIndex, q.display.highlightDay);
      const answer = expectChoiceAnswer(q);
      expect(answer.options[answer.correctIndex]).toBe(weekdayName(date));
    }
  });

  it('only ever offers real weekday names, all distinct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadCalendar(mulberry32(seed), ctx);
      const { options } = expectChoiceAnswer(q);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const option of options) expect(WEEKDAY_NAMES).toContain(option);
    }
  });

  it('names the date in the prompt so the calendar can be read against it', () => {
    const q = generateReadCalendar(mulberry32(1), ctx);
    expect(q.prompt.startsWith('What day of the week is ')).toBe(true);
    expect(q.prompt.endsWith('?')).toBe(true);
  });

  it('stays inside 2026 at the narrow difficulty bands', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 2 });
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      expect(q.display.year).toBe(2026);
    }
  });

  it('reaches other years at difficulty 8+', () => {
    const years = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 9 });
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      years.add(q.display.year);
    }
    expect(years.size).toBeGreaterThan(1);
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateReadCalendar(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(
        timeLimitFor(difficultyProfile(difficulty), READ_CALENDAR_TIME_LIMIT_MULTIPLIER),
      );
    }
  });

  describe('choice ordering', () => {
    it('sorts options Sunday-first at D1 (ordered)', () => {
      for (let seed = 0; seed < 50; seed++) {
        const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 1 });
        const { options } = expectChoiceAnswer(q);
        const keys = options.map((name) => WEEKDAY_NAMES.indexOf(name));
        expect(keys).toEqual([...keys].sort((a, b) => a - b));
      }
    });

    it('does not always produce sorted options at D10 (shuffled)', () => {
      const anySeedUnsorted = Array.from({ length: 50 }, (_, seed) => {
        const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 10 });
        const { options } = expectChoiceAnswer(q);
        const keys = options.map((name) => WEEKDAY_NAMES.indexOf(name));
        return JSON.stringify(keys) !== JSON.stringify([...keys].sort((a, b) => a - b));
      }).some(Boolean);
      expect(anySeedUnsorted).toBe(true);
    });
  });

  it('explains the correct answer', () => {
    const q = generateReadCalendar(mulberry32(1), ctx);
    const answer = expectChoiceAnswer(q);
    expect(q.explainCorrect).toContain(answer.options[answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateReadCalendar(mulberry32(42), ctx)).toEqual(
      generateReadCalendar(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(readCalendarType.typeId).toBe(READ_CALENDAR_TYPE_ID);
    expect(readCalendarType.generate(mulberry32(3), ctx).typeId).toBe(READ_CALENDAR_TYPE_ID);
  });
});
