import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { BUILT_IN_QUESTION_TYPES } from './index';
import type { Question } from './types';

export const DEFAULT_SAMPLES_PER_TYPE = 3;

/**
 * Generates a reproducible batch of questions for a given peak and difficulty
 * — `samplesPerType` questions from each registered generator, in registration
 * order. Exists so a human (or a CLI script, or a preview UI) can eyeball what
 * the generators actually produce for a specific summit and level without
 * spinning up the full climb state machine.
 */
export function generateQuestionBatch(
  seed: number,
  peakId: number,
  difficulty: number,
  samplesPerType: number = DEFAULT_SAMPLES_PER_TYPE,
): Question[] {
  const rng = mulberry32(seed);
  const peak = getPeak(peakId);
  const batch: Question[] = [];
  for (const type of BUILT_IN_QUESTION_TYPES) {
    for (let i = 0; i < samplesPerType; i++) {
      batch.push(type.generate(rng, { difficulty, peak }));
    }
  }
  return batch;
}
