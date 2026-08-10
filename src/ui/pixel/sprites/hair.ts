import { mirrorRow } from './mirrorRow';
import type { Sprite } from '../types';

const EMPTY = mirrorRow('.........');
const cap = (halfWidth: number) => '.'.repeat(9 - halfWidth) + 'H'.repeat(halfWidth);
const sideburn = (halfWidth: number) => 'H'.repeat(halfWidth) + '.'.repeat(9 - halfWidth);

/**
 * A headgear overlay, same 18x28 grid as the body layer, drawn on top of it.
 * Only rows 0-8 (the head) are non-empty — everything below is
 * transparent, so this composites cleanly over the body regardless of
 * what it's drawing there. Swap this for `helmet.ts` (or add another hair
 * style here later) without touching `body.ts`.
 */
export const hairShort: Sprite = {
  w: 18,
  h: 28,
  grid: [
    mirrorRow(cap(3)), // 0
    mirrorRow(cap(6)), // 1
    mirrorRow(cap(7)), // 2: overhangs skin(4)
    mirrorRow(cap(8)), // 3: overhangs skin(6)
    mirrorRow(sideburn(2)), // 4
    mirrorRow(sideburn(2)), // 5
    mirrorRow(sideburn(2)), // 6
    mirrorRow(sideburn(1)), // 7
    EMPTY, // 8: jaw clear
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
  ],
  slots: { H: 'hair' },
};
