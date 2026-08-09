import { describe, expect, it } from 'vitest';
import { generateQuestionBatch } from './preview';

describe('generateQuestionBatch', () => {
  it('returns samplesPerType questions per registered generator type', () => {
    const batch = generateQuestionBatch(1, 1, 3, 2);
    expect(batch).toHaveLength(8);
  });

  it('defaults to 3 samples per type', () => {
    const batch = generateQuestionBatch(1, 1, 3);
    expect(batch).toHaveLength(12);
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

  it('every question in the batch carries a valid choice answer', () => {
    const batch = generateQuestionBatch(7, 3, 8);
    for (const q of batch) {
      expect(q.answer.options.length).toBeGreaterThan(0);
      expect(q.answer.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.answer.correctIndex).toBeLessThan(q.answer.options.length);
    }
  });
});
