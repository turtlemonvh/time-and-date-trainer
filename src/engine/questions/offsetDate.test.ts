import { describe, expect, it } from 'vitest';
import { formatDateLong } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import {
  generateOffsetDate,
  OFFSET_DATE_TYPE_ID,
  offsetDateType,
  OFFSET_DATE_TIME_LIMIT_MULTIPLIER,
} from './offsetDate';
import { timeLimitFor } from './support';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 5, peak: getPeak(7) };

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

/** Parses "November 21, 2026" back into a local-time Date. */
function parseLongDate(text: string): Date {
  const match = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(text);
  if (!match) throw new Error(`not a long-form date: ${text}`);
  const monthIndex = MONTH_NAMES.indexOf(match[1]);
  if (monthIndex < 0) throw new Error(`unknown month: ${match[1]}`);
  return new Date(Number(match[3]), monthIndex, Number(match[2]));
}

describe('generateOffsetDate', () => {
  it('asks a date-arithmetic question with no visual aid', () => {
    const q = generateOffsetDate(mulberry32(1), ctx);
    expect(q.typeId).toBe(OFFSET_DATE_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.prompt.startsWith('What date is ')).toBe(true);
    expect(q.prompt.endsWith('?')).toBe(true);
  });

  it('offers four distinct long-form dates', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { options } = generateOffsetDate(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const option of options) expect(option).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    }
  });

  it('never says "1 days"', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 1 });
      expect(q.prompt).not.toMatch(/\b1 (days|weeks|months)\b/);
    }
  });

  it('keeps difficulty 1-3 questions inside a single month, moving forward', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 2 });
      const match = /^What date is (\d+) (day|days) after (.+)\?$/.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      const start = parseLongDate(match[3]);
      const correct = parseLongDate(q.answer.options[q.answer.correctIndex]);
      expect(correct.getMonth()).toBe(start.getMonth());
      expect(correct.getFullYear()).toBe(start.getFullYear());
    }
  });

  it('computes the correct date independently of the generator, across units and directions', () => {
    const unitPattern = '(day|days|week|weeks|month|months)';
    for (const difficulty of [2, 6, 9]) {
      for (let seed = 0; seed < 200; seed++) {
        const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty });
        const match = new RegExp(
          `^What date is (\\d+) ${unitPattern} (after|before) (.+)\\?$`,
        ).exec(q.prompt);
        if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
        const amount = Number(match[1]);
        const unitWord = match[2];
        const direction = match[3] as 'after' | 'before';
        const start = parseLongDate(match[4]);
        const sign = direction === 'after' ? 1 : -1;
        const unit: 'day' | 'week' | 'month' = unitWord.startsWith('week')
          ? 'week'
          : unitWord.startsWith('month')
            ? 'month'
            : 'day';
        const expected =
          unit === 'day'
            ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + sign * amount)
            : unit === 'week'
              ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + sign * amount * 7)
              : new Date(start.getFullYear(), start.getMonth() + sign * amount, start.getDate());
        expect(q.answer.options[q.answer.correctIndex]).toBe(formatDateLong(expected));
      }
    }
  });

  it('asks about weeks and months once the span widens', () => {
    const units = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 6 });
      const match = /^What date is \d+ (day|days|week|weeks|month|months) /.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      units.add(match[1].replace(/s$/, ''));
    }
    expect(units).toContain('week');
    expect(units).toContain('month');
  });

  it('asks "before" as well as "after" once the span widens', () => {
    const directions = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 6 });
      directions.add(q.prompt.includes(' after ') ? 'after' : 'before');
    }
    expect(directions.size).toBe(2);
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateOffsetDate(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(
        timeLimitFor(difficultyProfile(difficulty), OFFSET_DATE_TIME_LIMIT_MULTIPLIER),
      );
    }
  });

  it('restates the question in the explanation', () => {
    const q = generateOffsetDate(mulberry32(1), ctx);
    expect(q.explainCorrect).toContain(q.answer.options[q.answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateOffsetDate(mulberry32(42), ctx)).toEqual(
      generateOffsetDate(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(offsetDateType.typeId).toBe(OFFSET_DATE_TYPE_ID);
    expect(offsetDateType.generate(mulberry32(3), ctx).typeId).toBe(OFFSET_DATE_TYPE_ID);
  });
});
