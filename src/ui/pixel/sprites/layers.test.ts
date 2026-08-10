import { describe, expect, it } from 'vitest';
import { validateSprite } from '../sprite';
import { bodyBase } from './body';
import { hairShort } from './hair';
import { helmetClassic } from './helmet';
import { harnessBasic } from './harness';

describe('layered character sprites', () => {
  it.each([
    ['bodyBase', bodyBase],
    ['hairShort', hairShort],
    ['helmetClassic', helmetClassic],
    ['harnessBasic', harnessBasic],
  ])('%s is well-formed', (_name, sprite) => {
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('every headgear/harness overlay shares bodyBase’s dimensions', () => {
    for (const overlay of [hairShort, helmetClassic, harnessBasic]) {
      expect(overlay.w).toBe(bodyBase.w);
      expect(overlay.h).toBe(bodyBase.h);
    }
  });

  it('harness never marks a pixel in the head/neck rows (0-9)', () => {
    for (const row of harnessBasic.grid.slice(0, 10)) {
      expect(row).toBe('.'.repeat(harnessBasic.w));
    }
  });

  it('headgear never marks a pixel below the head rows (9+)', () => {
    for (const sprite of [hairShort, helmetClassic]) {
      for (const row of sprite.grid.slice(9)) {
        expect(row).toBe('.'.repeat(sprite.w));
      }
    }
  });
});
