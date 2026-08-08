import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { generateReadCalendar, READ_CALENDAR_TYPE_ID, readCalendarType } from './readCalendar';
import { weekdayName, WEEKDAY_NAMES } from './support';
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
      expect(q.answer.options[q.answer.correctIndex]).toBe(weekdayName(date));
    }
  });

  it('only ever offers real weekday names, all distinct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { options } = generateReadCalendar(mulberry32(seed), ctx).answer;
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

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateReadCalendar(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
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
