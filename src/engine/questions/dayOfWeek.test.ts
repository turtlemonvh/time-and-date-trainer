import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { DAY_OF_WEEK_TYPE_ID, dayOfWeekType, generateDayOfWeek } from './dayOfWeek';
import { timeLimitFor, WEEKDAY_NAMES } from './support';
import { expectChoiceAnswer } from './testSupport';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 5, peak: getPeak(5) };

describe('generateDayOfWeek', () => {
  it('asks a weekday-cycle question with no visual aid', () => {
    const q = generateDayOfWeek(mulberry32(1), ctx);
    expect(q.typeId).toBe(DAY_OF_WEEK_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.prompt.startsWith('If today is ')).toBe(true);
    expect(q.prompt.endsWith('?')).toBe(true);
  });

  it('offers four distinct weekday-name options', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateDayOfWeek(mulberry32(seed), ctx);
      const { options } = expectChoiceAnswer(q);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const option of options) expect(WEEKDAY_NAMES).toContain(option);
    }
  });

  it('computes the correct weekday independently of the generator, forward and backward', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateDayOfWeek(mulberry32(seed), ctx);
      const forwardMatch =
        /^If today is (\w+), what day of the week will it be in (\d+) days?\?$/.exec(q.prompt);
      const backwardMatch =
        /^If today is (\w+), what day of the week was it (\d+) days? ago\?$/.exec(q.prompt);
      const match = forwardMatch ?? backwardMatch;
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      const startIndex = WEEKDAY_NAMES.indexOf(match[1]);
      expect(startIndex).toBeGreaterThanOrEqual(0);
      const amount = Number(match[2]);
      const sign = forwardMatch ? 1 : -1;
      const expectedIndex = (((startIndex + sign * amount) % 7) + 7) % 7;
      const answer = expectChoiceAnswer(q);
      expect(answer.options[answer.correctIndex]).toBe(WEEKDAY_NAMES[expectedIndex]);
    }
  });

  it('produces both forward and backward questions', () => {
    const directions = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const q = generateDayOfWeek(mulberry32(seed), ctx);
      directions.add(q.prompt.includes('will it be') ? 'forward' : 'backward');
    }
    expect(directions.size).toBe(2);
  });

  it('never says "1 days"', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateDayOfWeek(mulberry32(seed), { ...ctx, difficulty: 5 });
      expect(q.prompt).not.toMatch(/\b1 days\b/);
    }
  });

  it('stays within one week at difficulty 1-3 (no wraparound needed)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateDayOfWeek(mulberry32(seed), { ...ctx, difficulty: 2 });
      const match = /(\d+) days?/.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      expect(Number(match[1])).toBeLessThanOrEqual(6);
    }
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateDayOfWeek(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(timeLimitFor(difficultyProfile(difficulty), 1.1));
    }
  });

  it('restates the question in the explanation', () => {
    const q = generateDayOfWeek(mulberry32(1), ctx);
    const answer = expectChoiceAnswer(q);
    expect(q.explainCorrect).toContain(answer.options[answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateDayOfWeek(mulberry32(42), ctx)).toEqual(generateDayOfWeek(mulberry32(42), ctx));
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(dayOfWeekType.typeId).toBe(DAY_OF_WEEK_TYPE_ID);
    expect(dayOfWeekType.answerMode).toBe('choice');
    expect(dayOfWeekType.generate(mulberry32(3), ctx).typeId).toBe(DAY_OF_WEEK_TYPE_ID);
  });
});
