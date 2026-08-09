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

const ctx: GeneratorContext = { difficulty: 4, peak: getPeak(1) };

describe('questions barrel', () => {
  it('registers the four M1b generators in order', () => {
    expect(listGenerators().map((t) => t.typeId)).toEqual([
      'readAnalog',
      'describeTime',
      'readCalendar',
      'offsetDate',
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
    const rng = mulberry32(1);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(generateQuestion(rng, ctx).typeId);
    expect(seen.size).toBe(BUILT_IN_QUESTION_TYPES.length);
  });
});
