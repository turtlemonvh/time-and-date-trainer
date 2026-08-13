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

// Peak 10 ("Everything, mixed") matches every typeId regardless of name — used
// for tests exercising generic registry mechanics that have nothing to do with
// peak-matching itself, so they aren't coupled to real peakEmphasis.ts content.
const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(10) };

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

  it('only ever draws a peak-matching generator, never an off-theme one', () => {
    // 'readAnalog' is on-theme for peak 1 (Basecamp Bluff, see peakEmphasis.ts);
    // 'offsetDate' is on-theme for peak 7, not peak 1 — so on peak 1, offsetDate
    // must never be drawn at all.
    registerGenerator(fakeType('readAnalog'));
    registerGenerator(fakeType('offsetDate'));
    const peak1Ctx: GeneratorContext = { difficulty: 3, peak: getPeak(1) };
    const rng = mulberry32(11);
    for (let i = 0; i < 500; i++) {
      expect(selectGenerator(rng, peak1Ctx).typeId).toBe('readAnalog');
    }
  });

  it('among a peak with several on-theme generators, still gates by answerMode', () => {
    // Peak 5 (Weekday Wall) matches 'dayOfWeek' (choice), 'nthWeekday'
    // (interactive), and 'countWeekdays' (free) in the real peakEmphasis.ts
    // mapping. At difficulty 1, interactive/free weight is 0 — only the
    // choice-mode one should ever be drawn, even though all three are
    // equally on-theme.
    registerGenerator({ ...fakeType('dayOfWeek'), answerMode: 'choice' });
    registerGenerator({ ...fakeType('nthWeekday'), answerMode: 'interactive' });
    registerGenerator({ ...fakeType('countWeekdays'), answerMode: 'free' });
    const level1Peak5: GeneratorContext = { difficulty: 1, peak: getPeak(5) };
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      expect(selectGenerator(rng, level1Peak5).typeId).toBe('dayOfWeek');
    }
  });

  it('falls back to a uniform draw across on-theme generators when every one is answer-mode-gated to zero', () => {
    // Peak 4 (The Hourglass) matches only 'setHands', an interactive-mode type.
    // At difficulty 1, answerModeWeights.interactive is 0 — with no other on-theme
    // generator to fall back on, selectGenerator must still draw 'setHands' rather
    // than throwing or silently drawing something off-theme.
    registerGenerator({ ...fakeType('setHands'), answerMode: 'interactive' });
    registerGenerator(fakeType('readAnalog')); // off-theme for peak 4, must never be drawn
    const level1Peak4: GeneratorContext = { difficulty: 1, peak: getPeak(4) };
    const rng = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      expect(selectGenerator(rng, level1Peak4).typeId).toBe('setHands');
    }
  });

  it('throws when a peak has no registered on-theme generator at all', () => {
    registerGenerator(fakeType('readAnalog')); // on-theme for peak 1 only
    const peak4Ctx: GeneratorContext = { difficulty: 5, peak: getPeak(4) };
    expect(() => selectGenerator(mulberry32(1), peak4Ctx)).toThrow(/no registered on-theme/);
  });
});

describe('generateQuestion', () => {
  it('delegates to the selected generator with the same context', () => {
    registerGenerator(fakeType('alpha'));
    const question = generateQuestion(mulberry32(1), ctx);
    expect(question.typeId).toBe('alpha');
    expect(question.prompt).toBe('prompt for alpha on peak 10');
  });
});
