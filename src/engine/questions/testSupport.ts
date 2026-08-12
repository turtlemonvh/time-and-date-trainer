import type { ChoiceAnswer, Question } from './types';

/**
 * Narrows a `Question`'s `answer` (a union across all answer kinds) down to
 * `ChoiceAnswer` for tests exercising a generator that's known to always
 * produce one. Throws loudly rather than returning `undefined` if that
 * assumption is ever wrong — a silently-skipped assertion is worse than a
 * failing test.
 */
export function expectChoiceAnswer(q: Question): ChoiceAnswer {
  if (q.answer.kind !== 'choice') {
    throw new Error(`expected a choice answer, got "${q.answer.kind}"`);
  }
  return q.answer;
}
