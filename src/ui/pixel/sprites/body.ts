import { mirrorRow } from './mirrorRow';
import type { Sprite } from '../types';

/**
 * Base body: skin (face/neck/hands), shirt, pants, shoes. The head area is
 * a bare skin oval on purpose — `hair.ts`/`helmet.ts` are separate overlay
 * sprites of the same w/h, drawn on top, so headgear is swappable without
 * touching this file. `harness.ts` overlays the torso/legs the same way.
 *
 * Each row is written as a left half (9 columns, outer edge to center) and
 * mirrored — see `mirrorRow` — so symmetry is structural, not something to
 * get right by eye across an 18-wide string.
 */
const skin = (halfWidth: number) => '.'.repeat(9 - halfWidth) + 'K'.repeat(halfWidth);
const shirt = (halfWidth: number) => '.'.repeat(9 - halfWidth) + 'J'.repeat(halfWidth);
const legWear = (fill: string) => '....' + fill.repeat(3) + '..';

/** Skin row at `halfWidth`, with one eye punched in at column index `eyeAt`. */
const skinWithEye = (halfWidth: number, eyeAt: number) => {
  const row = skin(halfWidth).split('');
  row[eyeAt] = 'E';
  return row.join('');
};

export const bodyBase: Sprite = {
  w: 18,
  h: 28,
  grid: [
    mirrorRow('.........'), // 0: clearance for headgear
    mirrorRow('.........'), // 1
    mirrorRow(skin(4)), // 2: head top
    mirrorRow(skin(6)), // 3
    mirrorRow(skin(7)), // 4
    mirrorRow(skinWithEye(7, 6)), // 5: eyes
    mirrorRow(skin(7)), // 6
    mirrorRow(skin(7)), // 7
    mirrorRow(skin(6)), // 8
    mirrorRow(skin(3)), // 9: neck
    mirrorRow(shirt(7)), // 10: shoulders
    mirrorRow(shirt(9)), // 11: arms out
    mirrorRow(shirt(9)), // 12
    mirrorRow(shirt(9)), // 13
    mirrorRow(shirt(8)), // 14
    mirrorRow(shirt(8)), // 15
    mirrorRow(shirt(7)), // 16
    mirrorRow(shirt(6)), // 17
    mirrorRow(shirt(5)), // 18
    mirrorRow(shirt(4)), // 19: waist
    mirrorRow(legWear('P')), // 20: legs
    mirrorRow(legWear('P')), // 21
    mirrorRow(legWear('P')), // 22
    mirrorRow(legWear('P')), // 23
    mirrorRow(legWear('P')), // 24
    mirrorRow(legWear('P')), // 25
    mirrorRow(legWear('B')), // 26: shoes
    mirrorRow(legWear('B')), // 27
  ],
  slots: { K: 'skin', J: 'shirt', P: 'pants', B: 'shoes', E: 'eyes' },
};
