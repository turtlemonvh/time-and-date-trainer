import { pick, type Rng } from '../rng';
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
 * Selection is uniform across everything registered. Weighting by
 * `ctx.peak.emphasis` (so Calendar Ridge asks mostly calendar questions) and by
 * the difficulty profile's `answerModeWeights` is future work — it needs the
 * full generator set to be meaningful, and a uniform draw over the four M1b
 * generators is correct and sufficient until then.
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
  return pick(rng, types);
}

export function generateQuestion(rng: Rng, ctx: GeneratorContext): Question {
  return selectGenerator(rng, ctx).generate(rng, ctx);
}
