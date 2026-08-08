import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { generateReadAnalog, READ_ANALOG_TYPE_ID, readAnalogType } from './readAnalog';
import { formatClockFace } from './support';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(1) };

describe('generateReadAnalog', () => {
  it('shows an analog clock and asks for the time', () => {
    const q = generateReadAnalog(mulberry32(1), ctx);
    expect(q.typeId).toBe(READ_ANALOG_TYPE_ID);
    expect(q.display.kind).toBe('analogClock');
    expect(q.prompt).toBe('What time does the clock show?');
  });

  it('marks the option that matches the clock face as correct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadAnalog(mulberry32(seed), ctx);
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.answer.options[q.answer.correctIndex]).toBe(
        formatClockFace(q.display.time, q.display.showSeconds),
      );
    }
  });

  it('never offers AM or PM, which a clock face cannot show', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const option of generateReadAnalog(mulberry32(seed), ctx).answer.options) {
        expect(option).not.toMatch(/AM|PM/);
      }
    }
  });

  it('offers four distinct options', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { options } = generateReadAnalog(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
    }
  });

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateReadAnalog(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
  });

  it('only shows seconds when the question is about seconds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadAnalog(mulberry32(seed), { ...ctx, difficulty: 10 });
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      if (!q.display.showSeconds) expect(q.display.time.second).toBe(0);
    }
  });

  it('sticks to hour boundaries at difficulty 1', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadAnalog(mulberry32(seed), { ...ctx, difficulty: 1 });
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.display.time.minute).toBe(0);
      expect(q.display.time.second).toBe(0);
    }
  });

  it('explains the correct answer', () => {
    const q = generateReadAnalog(mulberry32(1), ctx);
    expect(q.explainCorrect).toContain(q.answer.options[q.answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateReadAnalog(mulberry32(42), ctx)).toEqual(generateReadAnalog(mulberry32(42), ctx));
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(readAnalogType.typeId).toBe(READ_ANALOG_TYPE_ID);
    expect(readAnalogType.generate(mulberry32(3), ctx).typeId).toBe(READ_ANALOG_TYPE_ID);
  });
});
