import { describe, expect, it } from 'vitest';
import { validateSprite } from '../sprite';
import { bodyIdle, bodyClimb, bodySlip, bodyCheer } from './body';
import { hairShort } from './hair';
import { helmetClassic } from './helmet';
import { harnessBasic } from './harness';
import type { Sprite } from '../types';

const BODY_POSES: readonly [string, Sprite][] = [
  ['bodyIdle', bodyIdle],
  ['bodyClimb', bodyClimb],
  ['bodySlip', bodySlip],
  ['bodyCheer', bodyCheer],
];

describe('layered character sprites', () => {
  it.each([
    ...BODY_POSES,
    ['hairShort', hairShort],
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
    for (const overlay of [hairShort, helmetClassic, harnessBasic]) {
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
    for (const sprite of [hairShort, helmetClassic]) {
      for (const row of sprite.grid.slice(9)) {
        expect(row).toBe('.'.repeat(sprite.w));
      }
    }
  });
});
