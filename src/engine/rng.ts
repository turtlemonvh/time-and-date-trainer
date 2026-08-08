export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: items must not be empty');
  return items[randInt(rng, 0, items.length - 1)];
}

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

export function weightedPick<T>(rng: Rng, items: readonly WeightedItem<T>[]): T {
  if (items.length === 0) throw new Error('weightedPick: items must not be empty');
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) throw new Error('weightedPick: total weight must be positive');
  let roll = rng() * total;
  for (const item of items) {
    if (roll < item.weight) return item.value;
    roll -= item.weight;
  }
  return items[items.length - 1].value;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
