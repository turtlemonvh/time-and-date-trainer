import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { describeTime } from '../timeMath';
import { DESCRIBE_TIME_TYPE_ID, describeTimeType, generateDescribeTime } from './describeTime';
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
      expect(q.answer.options[q.answer.correctIndex]).toBe(describeTime(q.display.time));
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
      const { options } = generateDescribeTime(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
    }
  });

  it('produces recognisable clock language', () => {
    const wordings = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      for (const option of generateDescribeTime(mulberry32(seed), { ...ctx, difficulty: 4 }).answer
        .options) {
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

  it('explains the correct answer', () => {
    const q = generateDescribeTime(mulberry32(1), ctx);
    expect(q.explainCorrect).toContain(q.answer.options[q.answer.correctIndex]);
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
