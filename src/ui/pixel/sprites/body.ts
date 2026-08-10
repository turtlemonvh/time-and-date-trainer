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
 *
 * Rows 0-9 (the head) are shared across every pose via `HEAD_ROWS`, with
 * `bodyCheer` merging raised-arm pixels into rows 6-9 on top of that shared
 * base (headgear sprites are transparent from row 7 down, so this never
 * conflicts with hair/helmet). Rows 10-19 (torso) vary per pose via
 * `armWidths` — deliberately large swings between poses, not subtle ones,
 * since a 1-2px width difference doesn't read as a different pose at this
 * resolution. Rows 20-27 (legs/shoes) are shared.
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

/** Left-half overlay merge: `overlay`'s non-'.' chars replace `base`'s. */
const mergeLeft = (base: string, overlay: string) =>
  base
    .split('')
    .map((baseChar, i) => (overlay[i] === '.' ? baseChar : overlay[i]))
    .join('');

const HEAD_LEFT = [
  '.........', // 0: clearance for headgear
  '.........', // 1
  skin(4), // 2: head top
  skin(6), // 3
  skin(7), // 4
  skinWithEye(7, 6), // 5: eyes
  skin(7), // 6
  skin(7), // 7
  skin(6), // 8
  skin(3), // 9: neck
];

/** Raised-arm pixels merged onto HEAD_LEFT[6..9] for the cheer pose. */
const CHEER_ARM_LEFT = ['JJ.......', 'JJ.......', 'JJJ......', 'JJJJJ....'];

const HEAD_ROWS = HEAD_LEFT.map(mirrorRow);
const CHEER_HEAD_ROWS = HEAD_LEFT.map((row, i) =>
  i >= 6 ? mirrorRow(mergeLeft(row, CHEER_ARM_LEFT[i - 6])) : mirrorRow(row),
);

const LEG_ROWS = [
  mirrorRow(legWear('P')), // 20
  mirrorRow(legWear('P')), // 21
  mirrorRow(legWear('P')), // 22
  mirrorRow(legWear('P')), // 23
  mirrorRow(legWear('P')), // 24
  mirrorRow(legWear('P')), // 25
  mirrorRow(legWear('B')), // 26: shoes
  mirrorRow(legWear('B')), // 27
];

/** `armWidths` is exactly 10 half-widths for the torso rows (10-19). */
function buildBody(armWidths: number[], headRows: readonly string[] = HEAD_ROWS): Sprite {
  if (armWidths.length !== 10) {
    throw new Error(`buildBody: expected 10 armWidths (rows 10-19), got ${armWidths.length}`);
  }
  return {
    w: 18,
    h: 28,
    grid: [...headRows, ...armWidths.map((width) => mirrorRow(shirt(width))), ...LEG_ROWS],
    slots: { K: 'skin', J: 'shirt', P: 'pants', B: 'shoes', E: 'eyes' },
  };
}

/** Arms at sides — the resting pose. */
export const bodyIdle = buildBody([7, 9, 9, 9, 8, 8, 7, 6, 5, 4]);

/** Arms pulled in tight and forward, gripping — narrow throughout. */
export const bodyClimb = buildBody([6, 5, 4, 4, 4, 4, 4, 4, 4, 4]);

/** Arms flung wide and held there — a sustained, off-balance T-shape. */
export const bodySlip = buildBody([9, 9, 9, 9, 9, 9, 9, 9, 8, 6]);

/** Arms raised above the shoulders (rows 6-9) — torso narrows since the
 * arms are no longer at its sides. */
export const bodyCheer = buildBody([5, 5, 5, 5, 4, 4, 4, 4, 4, 4], CHEER_HEAD_ROWS);
