import { beforeEach, describe, expect, it } from 'vitest';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import {
  generateQuestion,
  getGenerator,
  hasGenerator,
  listGenerators,
  registerGenerator,
  resetGenerators,
  selectGenerator,
} from './registry';
import type { GeneratorContext, Question, QuestionType } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(1) };

function fakeType(typeId: string): QuestionType {
  return {
    typeId,
    answerMode: 'choice',
    generate: (_rng, generatorCtx): Question => ({
      id: `${typeId}-fixed`,
      typeId,
      prompt: `prompt for ${typeId} on peak ${generatorCtx.peak.id}`,
      display: { kind: 'none' },
      answer: { kind: 'choice', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      timeLimitMs: 10_000,
      explainCorrect: 'because',
    }),
  };
}

beforeEach(() => {
  resetGenerators();
});

describe('registerGenerator', () => {
  it('makes a generator retrievable by typeId', () => {
    const type = fakeType('alpha');
    registerGenerator(type);
    expect(hasGenerator('alpha')).toBe(true);
    expect(getGenerator('alpha')).toBe(type);
  });

  it('rejects a duplicate typeId', () => {
    registerGenerator(fakeType('alpha'));
    expect(() => registerGenerator(fakeType('alpha'))).toThrow(/duplicate/);
  });
});

describe('getGenerator', () => {
  it('throws a named error for an unknown typeId', () => {
    expect(() => getGenerator('nope')).toThrow(/nope/);
  });
});

describe('listGenerators', () => {
  it('returns registrations in order', () => {
    registerGenerator(fakeType('alpha'));
    registerGenerator(fakeType('beta'));
    expect(listGenerators().map((t) => t.typeId)).toEqual(['alpha', 'beta']);
  });

  it('is empty before anything is registered', () => {
    expect(listGenerators()).toEqual([]);
  });
});

describe('selectGenerator', () => {
  it('throws when nothing is registered', () => {
    expect(() => selectGenerator(mulberry32(1), ctx)).toThrow(/no generators registered/);
  });

  it('only ever returns a registered generator', () => {
    registerGenerator(fakeType('alpha'));
    registerGenerator(fakeType('beta'));
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      expect(['alpha', 'beta']).toContain(selectGenerator(rng, ctx).typeId);
    }
  });

  it('spreads selection across all registered generators', () => {
    for (const id of ['alpha', 'beta', 'gamma', 'delta']) registerGenerator(fakeType(id));
    const rng = mulberry32(7);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(selectGenerator(rng, ctx).typeId);
    expect(seen.size).toBe(4);
  });

  it('is deterministic for a given seed', () => {
    for (const id of ['alpha', 'beta', 'gamma']) registerGenerator(fakeType(id));
    expect(selectGenerator(mulberry32(5), ctx).typeId).toBe(
      selectGenerator(mulberry32(5), ctx).typeId,
    );
  });

  it('draws the peak-matching generator far more often than an off-theme one', () => {
    // 'readAnalog' is on-theme for peak 1 (Basecamp Bluff, see peakEmphasis.ts);
    // 'offsetDate' is on-theme for peak 7, not peak 1 — same answerMode, so only
    // the peak-match 5x weight should separate them.
    registerGenerator(fakeType('readAnalog'));
    registerGenerator(fakeType('offsetDate'));
    const rng = mulberry32(11);
    const counts = { readAnalog: 0, offsetDate: 0 };
    for (let i = 0; i < 2000; i++) {
      counts[selectGenerator(rng, ctx).typeId as 'readAnalog' | 'offsetDate']++;
    }
    // Expected ~5:1; assert direction and a generous ratio bound rather than
    // an exact split, since this is a randomized draw.
    expect(counts.readAnalog).toBeGreaterThan(counts.offsetDate * 3);
  });

  it('never draws a generator whose answerMode has zero weight at this difficulty', () => {
    const interactiveType: QuestionType = {
      typeId: 'gizmo',
      answerMode: 'interactive',
      generate: fakeType('gizmo').generate,
    };
    registerGenerator(fakeType('readAnalog'));
    registerGenerator(interactiveType);
    // Difficulty 1's answerModeWeights.interactive is 0 (see difficulty.ts).
    const level1Ctx: GeneratorContext = { difficulty: 1, peak: getPeak(1) };
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      expect(selectGenerator(rng, level1Ctx).typeId).toBe('readAnalog');
    }
  });
});

describe('generateQuestion', () => {
  it('delegates to the selected generator with the same context', () => {
    registerGenerator(fakeType('alpha'));
    const question = generateQuestion(mulberry32(1), ctx);
    expect(question.typeId).toBe('alpha');
    expect(question.prompt).toBe('prompt for alpha on peak 1');
  });
});
