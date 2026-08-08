import { describe, expect, it } from 'vitest';
import { mulberry32, weightedPick, type WeightedItem } from './rng';
import { difficultyProfile } from './difficulty';
import { randomTime, type TimePrecision } from './timeMath';

function weightedItems(weights: Record<TimePrecision, number>): WeightedItem<TimePrecision>[] {
  return (Object.entries(weights) as [TimePrecision, number][])
    .filter(([, weight]) => weight > 0)
    .map(([value, weight]) => ({ value, weight }));
}

describe('difficulty -> precision -> randomTime integration', () => {
  it('only ever draws precisions with nonzero weight at each difficulty', () => {
    for (let d = 1; d <= 10; d++) {
      const profile = difficultyProfile(d);
      const items = weightedItems(profile.timePrecisionWeights);
      const allowed = new Set(items.map((i) => i.value));
      const rng = mulberry32(1000 + d);
      for (let i = 0; i < 100; i++) {
        const precision = weightedPick(rng, items);
        expect(allowed.has(precision)).toBe(true);
      }
    }
  });

  it('D1 always produces hour-boundary times end to end', () => {
    const profile = difficultyProfile(1);
    const items = weightedItems(profile.timePrecisionWeights);
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      const precision = weightedPick(rng, items);
      const time = randomTime(rng, precision);
      expect(time.minute).toBe(0);
      expect(time.second).toBe(0);
    }
  });

  it('never produces a nonzero second at difficulty 1-7 (seconds are D8+ territory)', () => {
    for (let d = 1; d <= 7; d++) {
      const profile = difficultyProfile(d);
      const items = weightedItems(profile.timePrecisionWeights);
      const rng = mulberry32(2000 + d);
      for (let i = 0; i < 100; i++) {
        const precision = weightedPick(rng, items);
        const time = randomTime(rng, precision);
        expect(time.second).toBe(0);
      }
    }
  });
});
