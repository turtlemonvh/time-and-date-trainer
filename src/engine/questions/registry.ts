import { difficultyProfile } from '../difficulty';
import { weightedPick, type Rng } from '../rng';
import { isOnThemeForPeak } from './peakEmphasis';
import type { GeneratorContext, Question, QuestionType } from './types';

const generators = new Map<string, QuestionType>();

export function registerGenerator(type: QuestionType): void {
  if (generators.has(type.typeId)) {
    throw new Error(`registerGenerator: duplicate typeId "${type.typeId}"`);
  }
  generators.set(type.typeId, type);
}

export function hasGenerator(typeId: string): boolean {
  return generators.has(typeId);
}

export function getGenerator(typeId: string): QuestionType {
  const type = generators.get(typeId);
  if (!type) throw new Error(`getGenerator: no generator registered for "${typeId}"`);
  return type;
}

/** Registered generators, in registration order. */
export function listGenerators(): QuestionType[] {
  return [...generators.values()];
}

/** Test-only: empties the registry so a test file can install its own fakes. */
export function resetGenerators(): void {
  generators.clear();
}

/**
 * Picks the generator for the next question.
 *
 * Weighted by peak match (a generator on-theme for `ctx.peak`, per
 * `peakEmphasis.ts`, is 5x more likely) and by the difficulty profile's
 * `answerModeWeights` (e.g. a `free`-mode generator is undrawable at
 * difficulty 1, where that weight is 0). A generator's total weight is
 * `(peak match ? 5 : 1) * profile.answerModeWeights[type.answerMode]`.
 */
export function selectGenerator(rng: Rng, ctx: GeneratorContext): QuestionType {
  const types = listGenerators();
  if (types.length === 0) {
    throw new Error(
      `selectGenerator: no generators registered ` +
        `(peak ${ctx.peak.id}, difficulty ${ctx.difficulty}) — ` +
        `import from 'src/engine/questions' rather than 'src/engine/questions/registry'`,
    );
  }
  const profile = difficultyProfile(ctx.difficulty);
  return weightedPick(
    rng,
    types.map((type) => ({
      value: type,
      weight:
        (isOnThemeForPeak(ctx.peak, type.typeId) ? 5 : 1) *
        profile.answerModeWeights[type.answerMode],
    })),
  );
}

export function generateQuestion(rng: Rng, ctx: GeneratorContext): Question {
  return selectGenerator(rng, ctx).generate(rng, ctx);
}
