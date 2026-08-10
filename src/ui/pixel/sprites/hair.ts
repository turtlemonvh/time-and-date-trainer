import { mirrorRow } from './mirrorRow';
import type { Sprite } from '../types';

const cap = (halfWidth: number) => '.'.repeat(9 - halfWidth) + 'H'.repeat(halfWidth);
const sideburn = (halfWidth: number) => 'H'.repeat(halfWidth) + '.'.repeat(9 - halfWidth);

/**
 * A headgear overlay, same 18x28 grid as the body layer, drawn on top of
 * it. `headRows` covers rows 0-8 (the head); everything below is padded
 * transparent automatically, so this composites cleanly over the body
 * regardless of what it's drawing there, and swaps for `helmet.ts` (or
 * another hair style) without touching `body.ts`.
 */
function buildHair(headRows: string[]): Sprite {
  const EMPTY = mirrorRow('.........');
  const padding = new Array<string>(28 - headRows.length).fill(EMPTY);
  return {
    w: 18,
    h: 28,
    grid: [...headRows.map(mirrorRow), ...padding],
    slots: { H: 'hair' },
  };
}

/** Short, with sideburns tapering down past the ears. */
export const hairShort = buildHair([
  cap(3), // 0
  cap(6), // 1
  cap(7), // 2: overhangs skin(4)
  cap(8), // 3: overhangs skin(6)
  sideburn(2), // 4
  sideburn(2), // 5
  sideburn(2), // 6
  sideburn(1), // 7
]);

/**
 * Full and round, no sideburns — reads as curlier/fuller hair. Stops at
 * row 4: `cap(5)` at row 5 (the eye row — see `body.ts`'s `skinWithEye`)
 * reached column 6, which is exactly where the eye pixel sits, so the
 * puff painted over it. `hairShort`/`hairPigtails` never hit this because
 * their row 5 is a narrow sideburn at the far outer edge, nowhere near
 * column 6.
 */
export const hairPuffy = buildHair([
  cap(6), // 0
  cap(8), // 1
  cap(9), // 2: full width
  cap(9), // 3
  cap(7), // 4
]);

/**
 * Twin buns at ear height, separated from the cap by a 1px gap so they
 * read as detached bumps rather than a slightly-wider cap edge — an
 * earlier attempt placed the buns at the very top of the head, tucked
 * into the crown's own curve, and they were nearly invisible at normal
 * scale. Cap is narrowed at rows 2-3 to make room.
 */
export const hairPigtails = buildHair([
  cap(3), // 0
  cap(5), // 1
  'HH.HHHHHH', // 2: bun(2) + gap + cap(6)
  'HHH.HHHHH', // 3: bun(3) + gap + cap(5) — widest point of the bun
  'HH.HH....', // 4: bun(2) + gap + sideburn(2)
  'H.H......', // 5: bun tapers to 1, sideburn(1)
  sideburn(2), // 6
  sideburn(1), // 7
]);
