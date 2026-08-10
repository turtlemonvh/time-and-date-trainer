import { describe, expect, it } from 'vitest';
import { validateSprite } from '../sprite';
import { bodyIdle, bodyClimb, bodySlip, bodyCheer } from './body';
import { hairShort, hairPuffy, hairPigtails } from './hair';
import { helmetClassic } from './helmet';
import { harnessBasic } from './harness';
import type { Sprite } from '../types';

const BODY_POSES: readonly [string, Sprite][] = [
  ['bodyIdle', bodyIdle],
  ['bodyClimb', bodyClimb],
  ['bodySlip', bodySlip],
  ['bodyCheer', bodyCheer],
];

const HAIR_STYLES: readonly [string, Sprite][] = [
  ['hairShort', hairShort],
  ['hairPuffy', hairPuffy],
  ['hairPigtails', hairPigtails],
];

describe('layered character sprites', () => {
  it.each([
    ...BODY_POSES,
    ...HAIR_STYLES,
    ['helmetClassic', helmetClassic],
    ['harnessBasic', harnessBasic],
  ])('%s is well-formed', (_name, sprite) => {
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('every body pose has an identical face (rows 0-5) — only bodyCheer varies below that, for raised arms', () => {
    for (const [, pose] of BODY_POSES) {
      expect(pose.grid.slice(0, 6)).toEqual(bodyIdle.grid.slice(0, 6));
    }
  });

  it('bodyIdle, bodyClimb, and bodySlip share an identical head (rows 0-9); bodyCheer only differs there', () => {
    for (const [, pose] of [
      ['bodyClimb', bodyClimb],
      ['bodySlip', bodySlip],
    ] as const) {
      expect(pose.grid.slice(0, 10)).toEqual(bodyIdle.grid.slice(0, 10));
    }
    expect(bodyCheer.grid.slice(0, 10)).not.toEqual(bodyIdle.grid.slice(0, 10));
  });

  it('every headgear/harness overlay shares the body’s dimensions', () => {
    for (const [, overlay] of [
      ...HAIR_STYLES,
      ['helmetClassic', helmetClassic],
      ['harnessBasic', harnessBasic],
    ] as const) {
      expect(overlay.w).toBe(bodyIdle.w);
      expect(overlay.h).toBe(bodyIdle.h);
    }
  });

  it('harness never marks a pixel in the head/neck rows (0-9)', () => {
    for (const row of harnessBasic.grid.slice(0, 10)) {
      expect(row).toBe('.'.repeat(harnessBasic.w));
    }
  });

  it('headgear never marks a pixel below the head rows (9+)', () => {
    for (const [, sprite] of [...HAIR_STYLES, ['helmetClassic', helmetClassic]] as const) {
      for (const row of sprite.grid.slice(9)) {
        expect(row).toBe('.'.repeat(sprite.w));
      }
    }
  });

  it('every hair style is visually distinct from the others', () => {
    for (let i = 0; i < HAIR_STYLES.length; i++) {
      for (let j = i + 1; j < HAIR_STYLES.length; j++) {
        expect(HAIR_STYLES[i][1].grid).not.toEqual(HAIR_STYLES[j][1].grid);
      }
    }
  });

  it('no headgear covers the eyes — row 5, columns 6 and 11, must stay transparent', () => {
    // Regression test: hairPuffy's first draft filled column 6 on row 5 (a
    // full-width cap reaching the eye), painting hair color over the eye
    // pixel body.ts draws underneath. Column 6 mirrors to column 11 (see
    // mirrorRow — the sprite is 18 wide, col i mirrors to col 17-i).
    for (const [, sprite] of [...HAIR_STYLES, ['helmetClassic', helmetClassic]] as const) {
      const eyeRow = sprite.grid[5];
      expect(eyeRow[6]).toBe('.');
      expect(eyeRow[11]).toBe('.');
    }
  });
});
