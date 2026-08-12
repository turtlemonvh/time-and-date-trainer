import { describe, expect, it } from 'vitest';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import {
  BUILT_IN_QUESTION_TYPES,
  generateQuestion,
  getGenerator,
  listGenerators,
  type GeneratorContext,
} from './index';

describe('questions barrel', () => {
  it('registers the built-in generators in order', () => {
    expect(listGenerators().map((t) => t.typeId)).toEqual([
      'readAnalog',
      'describeTime',
      'readCalendar',
      'offsetDate',
      'elapsedAdd',
      'elapsedBetween',
      'setHands',
      'dayOfWeek',
      'nthWeekday',
      'countWeekdays',
      'hour24',
      'countBetween',
    ]);
  });

  it('exposes the same list as BUILT_IN_QUESTION_TYPES', () => {
    expect(BUILT_IN_QUESTION_TYPES.map((t) => t.typeId)).toEqual(
      listGenerators().map((t) => t.typeId),
    );
  });

  it('resolves each built-in by typeId', () => {
    for (const type of BUILT_IN_QUESTION_TYPES) {
      expect(getGenerator(type.typeId)).toBe(type);
    }
  });

  it('generates questions from every registered type over enough draws', () => {
    // Peak 10 (mixed) plus a difficulty whose answerModeWeights are all
    // positive (choice/interactive/free), so every type is drawable —
    // peakEmphasis.ts / difficulty.ts weighting means that isn't true of
    // every (peak, difficulty) pair (e.g. a `free`-mode type has zero
    // weight at low difficulty).
    const mixedCtx: GeneratorContext = { difficulty: 7, peak: getPeak(10) };
    const rng = mulberry32(1);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateQuestion(rng, mixedCtx).typeId);
    expect(seen.size).toBe(BUILT_IN_QUESTION_TYPES.length);
  });
});
