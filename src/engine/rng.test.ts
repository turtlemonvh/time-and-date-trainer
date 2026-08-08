import { describe, expect, it } from 'vitest';
import { mulberry32, pick, randInt, shuffle, weightedPick } from './rng';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('always returns values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt', () => {
  it('stays within inclusive bounds over many draws', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(randInt(mulberry32(99), 0, 100)).toBe(randInt(mulberry32(99), 0, 100));
  });

  it('handles min === max', () => {
    expect(randInt(mulberry32(1), 5, 5)).toBe(5);
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = mulberry32(3);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });

  it('throws on an empty array', () => {
    expect(() => pick(mulberry32(1), [])).toThrow();
  });
});

describe('weightedPick', () => {
  it('heavily favors a heavily-weighted item', () => {
    const rng = mulberry32(5);
    const items = [
      { value: 'rare', weight: 1 },
      { value: 'common', weight: 99 },
    ];
    const counts = { rare: 0, common: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[weightedPick(rng, items) as 'rare' | 'common']++;
    }
    expect(counts.common).toBeGreaterThan(counts.rare * 10);
  });

  it('throws on an empty array', () => {
    expect(() => weightedPick(mulberry32(1), [])).toThrow();
  });

  it('throws when total weight is zero', () => {
    expect(() => weightedPick(mulberry32(1), [{ value: 'x', weight: 0 }])).toThrow();
  });
});

describe('shuffle', () => {
  it('returns an array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(mulberry32(1), input);
    expect(result.slice().sort()).toEqual(input.slice().sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    shuffle(mulberry32(1), input);
    expect(input).toEqual(copy);
  });

  it('is deterministic for a given seed', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(mulberry32(42), input)).toEqual(shuffle(mulberry32(42), input));
  });

  it('produces a different order than the input for a large enough array', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(mulberry32(1), input)).not.toEqual(input);
  });
});
