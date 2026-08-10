import { mirrorRow } from './mirrorRow';
import type { Sprite } from '../types';

const EMPTY = mirrorRow('.........');
const diagonal = (pos: number) => '.'.repeat(pos) + 'S' + '.'.repeat(8 - pos);
const belt = (halfWidth: number) => '.'.repeat(9 - halfWidth) + 'S'.repeat(halfWidth);
const legLoop = '....SSS..';

/**
 * Climbing harness: two chest straps crossing in an X (a single diagonal
 * pixel per row, left half only — mirroring gives the matching strap from
 * the other shoulder, so the two naturally cross), a waist belt sized to
 * hug `bodyBase`'s torso silhouette at each row rather than a fixed width,
 * and a leg-loop band at the top of each leg. Overlays on top of
 * `bodyBase` and whichever headgear sprite is drawn (harness never
 * touches rows 0-9, the head/neck).
 */
export const harnessBasic: Sprite = {
  w: 18,
  h: 28,
  grid: [
    EMPTY, // 0
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY, // 9
    mirrorRow(diagonal(1)), // 10: shoulder strap start
    mirrorRow(diagonal(2)), // 11
    mirrorRow(diagonal(3)), // 12
    mirrorRow(diagonal(4)), // 13
    mirrorRow(diagonal(5)), // 14
    mirrorRow(diagonal(6)), // 15: straps cross near center
    mirrorRow(belt(7)), // 16: waist belt, matches torso width
    mirrorRow(belt(6)), // 17
    mirrorRow(belt(5)), // 18
    mirrorRow(belt(4)), // 19
    mirrorRow(legLoop), // 20: leg loops
    EMPTY, // 21
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY, // 27
  ],
  slots: { S: 'harness' },
};
