import { describe, expect, it } from 'vitest';
import { BUILT_IN_QUESTION_TYPES } from './index';
import { generateQuestionBatch } from './preview';
import { expectChoiceAnswer } from './testSupport';

const TYPE_COUNT = BUILT_IN_QUESTION_TYPES.length;

describe('generateQuestionBatch', () => {
  it('returns samplesPerType questions per registered generator type', () => {
    const batch = generateQuestionBatch(1, 1, 3, 2);
    expect(batch).toHaveLength(TYPE_COUNT * 2);
  });

  it('defaults to 3 samples per type', () => {
    const batch = generateQuestionBatch(1, 1, 3);
    expect(batch).toHaveLength(TYPE_COUNT * 3);
  });

  it('is deterministic for a given seed', () => {
    const a = generateQuestionBatch(42, 5, 6);
    const b = generateQuestionBatch(42, 5, 6);
    expect(a).toEqual(b);
  });

  it('produces a different batch for a different seed', () => {
    const a = generateQuestionBatch(1, 1, 3).map((q) => q.id);
    const b = generateQuestionBatch(2, 1, 3).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('produces a different batch for a different peak, same seed', () => {
    const a = generateQuestionBatch(1, 1, 3).map((q) => q.id);
    const b = generateQuestionBatch(1, 2, 3).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('throws for an unknown peak id', () => {
    expect(() => generateQuestionBatch(1, 999, 3)).toThrow();
  });

  it('every choice-kind question in the batch carries a valid choice answer', () => {
    const batch = generateQuestionBatch(7, 3, 8);
    const choiceAnswers = batch.filter((q) => q.answer.kind === 'choice');
    // Sanity check that this batch actually contains some choice questions,
    // so the loop below isn't vacuously true.
    expect(choiceAnswers.length).toBeGreaterThan(0);
    for (const q of choiceAnswers) {
      const answer = expectChoiceAnswer(q);
      expect(answer.options.length).toBeGreaterThan(0);
      expect(answer.correctIndex).toBeGreaterThanOrEqual(0);
      expect(answer.correctIndex).toBeLessThan(answer.options.length);
    }
  });
});
