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
 * Exclusive by peak: a generator not on-theme for `ctx.peak` (per
 * `peakEmphasis.ts`) never gets drawn, full stop — a player on a given peak
 * only ever sees that peak's own content. Among a peak's on-theme
 * generators, `answerModeWeights` still governs the mix (e.g. a `free`-mode
 * generator is undrawable at difficulty 1, where that weight is 0).
 *
 * A peak whose *entire* on-theme set is answer-mode-gated to zero at this
 * difficulty (a peak with only one, non-`choice`-mode generator — The
 * Hourglass's `setHands` or Leap Crag's `countBetween` — at a low
 * difficulty, where `interactive`/`free` haven't unlocked yet) falls back
 * to a uniform draw across that peak's on-theme generators, ignoring
 * `answerModeWeights` just for this case — the peak stays playable with
 * exclusively its own content at every difficulty; difficulty still shapes
 * how hard that content is internally; it just can't gate the peak down to
 * nothing.
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
  const onTheme = types.filter((type) => isOnThemeForPeak(ctx.peak, type.typeId));
  if (onTheme.length === 0) {
    throw new Error(
      `selectGenerator: peak ${ctx.peak.id} has no registered on-theme generator ` +
        `(checked ${types.length} registered types) — see peakEmphasis.ts`,
    );
  }
  const profile = difficultyProfile(ctx.difficulty);
  const weighted = onTheme.map((type) => ({
    value: type,
    weight: profile.answerModeWeights[type.answerMode],
  }));
  const hasDrawableWeight = weighted.some((w) => w.weight > 0);
  if (!hasDrawableWeight) {
    return weightedPick(
      rng,
      onTheme.map((type) => ({ value: type, weight: 1 })),
    );
  }
  return weightedPick(rng, weighted);
}

export function generateQuestion(rng: Rng, ctx: GeneratorContext): Question {
  return selectGenerator(rng, ctx).generate(rng, ctx);
}
