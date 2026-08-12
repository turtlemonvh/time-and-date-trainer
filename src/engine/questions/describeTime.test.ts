import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { describeTime } from '../timeMath';
import { DESCRIBE_TIME_TYPE_ID, describeTimeType, generateDescribeTime } from './describeTime';
import { expectChoiceAnswer } from './testSupport';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(2) };

describe('generateDescribeTime', () => {
  it('shows an analog clock and asks for the words', () => {
    const q = generateDescribeTime(mulberry32(1), ctx);
    expect(q.typeId).toBe(DESCRIBE_TIME_TYPE_ID);
    expect(q.display.kind).toBe('analogClock');
    expect(q.prompt).toBe('Which words describe the time on the clock?');
  });

  it('marks the option that describes the displayed time as correct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateDescribeTime(mulberry32(seed), ctx);
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      const answer = expectChoiceAnswer(q);
      expect(answer.options[answer.correctIndex]).toBe(describeTime(q.display.time));
    }
  });

  it('never asks about seconds, which the wording cannot express', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateDescribeTime(mulberry32(seed), { ...ctx, difficulty: 10 });
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.display.showSeconds).toBe(false);
      expect(q.display.time.second).toBe(0);
    }
  });

  it('offers four distinct wordings', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateDescribeTime(mulberry32(seed), ctx);
      const { options } = expectChoiceAnswer(q);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
    }
  });

  it('produces recognisable clock language', () => {
    const wordings = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const q = generateDescribeTime(mulberry32(seed), { ...ctx, difficulty: 4 });
      for (const option of expectChoiceAnswer(q).options) {
        wordings.add(option);
      }
    }
    const clocky = [...wordings].filter(
      (w) => w.includes("o'clock") || w.includes('past') || w.includes('to '),
    );
    expect(clocky.length).toBe(wordings.size);
  });

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateDescribeTime(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
  });

  describe('phrasing tiers', () => {
    function minutesAt(difficulty: number, seeds: number): number[] {
      const minutes: number[] = [];
      for (let seed = 0; seed < seeds; seed++) {
        const q = generateDescribeTime(mulberry32(seed), { ...ctx, difficulty });
        if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
        minutes.push(q.display.time.minute);
      }
      return minutes;
    }

    it("D1 only ever draws o'clock or half past", () => {
      for (const minute of minutesAt(1, 100)) {
        expect([0, 30]).toContain(minute);
      }
    });

    it('D2 adds quarter phrasings but stays off the five-minute marks', () => {
      for (const minute of minutesAt(2, 100)) {
        expect([0, 15, 30, 45]).toContain(minute);
      }
    });

    it('D3-D8 restrict to five-minute multiples', () => {
      for (const difficulty of [3, 4, 5, 6, 7, 8]) {
        for (const minute of minutesAt(difficulty, 60)) {
          expect(minute % 5).toBe(0);
        }
      }
    });

    it('D9-D10 can land on a minute that is not a multiple of five', () => {
      for (const difficulty of [9, 10]) {
        const minutes = minutesAt(difficulty, 100);
        expect(minutes.some((m) => m % 5 !== 0)).toBe(true);
      }
    });
  });

  it('explains the correct answer', () => {
    const q = generateDescribeTime(mulberry32(1), ctx);
    const answer = expectChoiceAnswer(q);
    expect(q.explainCorrect).toContain(answer.options[answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateDescribeTime(mulberry32(42), ctx)).toEqual(
      generateDescribeTime(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(describeTimeType.typeId).toBe(DESCRIBE_TIME_TYPE_ID);
    expect(describeTimeType.generate(mulberry32(3), ctx).typeId).toBe(DESCRIBE_TIME_TYPE_ID);
  });
});
