import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../engine/rng';
import { validateSprite } from './sprite';
import { generateMountainScene, DEFAULT_BANDS } from './mountainScene';

describe('generateMountainScene', () => {
  it('produces one layer per band, all well-formed', () => {
    const layers = generateMountainScene(mulberry32(1), 64, 24, 18, '#6b6459', '#f4f4f4');
    expect(layers).toHaveLength(DEFAULT_BANDS.length);
    for (const layer of layers) {
      expect(() => validateSprite(layer.sprite)).not.toThrow();
    }
  });

  it('is deterministic for a given seed', () => {
    const a = generateMountainScene(mulberry32(42), 64, 24, 18, '#6b6459', '#f4f4f4');
    const b = generateMountainScene(mulberry32(42), 64, 24, 18, '#6b6459', '#f4f4f4');
    expect(a.map((l) => l.sprite.grid)).toEqual(b.map((l) => l.sprite.grid));
  });

  it('each band has its own independently-drawn silhouette, not the same ridge scaled', () => {
    const layers = generateMountainScene(mulberry32(1), 64, 24, 18, '#6b6459', '#f4f4f4');
    const grids = layers.map((l) => l.sprite.grid.join(''));
    expect(new Set(grids).size).toBe(grids.length);
  });

  it('farther bands are paler than nearer ones', () => {
    const layers = generateMountainScene(mulberry32(1), 64, 24, 18, '#000000', '#000000');
    // fade increases toward the back (DEFAULT_BANDS is back-to-front, fade descending toward 0),
    // so each rock color should be lighter (closer to white, i.e. a bigger hex value) than the
    // next band's.
    for (let i = 0; i < layers.length - 1; i++) {
      const value = (hex: string) => parseInt(hex.slice(1), 16);
      expect(value(layers[i].palette.rock)).toBeGreaterThan(value(layers[i + 1].palette.rock));
    }
  });

  it('the frontmost band keeps the exact theme colors (no fade)', () => {
    const layers = generateMountainScene(mulberry32(1), 64, 24, 18, '#123456', '#abcdef');
    const front = layers[layers.length - 1];
    expect(front.palette.rock).toBe('#123456');
    expect(front.palette.snow).toBe('#abcdef');
  });
});
