import { mirrorRow } from './mirrorRow';
import type { Sprite } from '../types';

const EMPTY = mirrorRow('.........');
const dome = (halfWidth: number) => '.'.repeat(9 - halfWidth) + 'H'.repeat(halfWidth);
const strap = (halfWidth: number) => 'H'.repeat(halfWidth) + '.'.repeat(9 - halfWidth);

/**
 * A climbing helmet: rounded dome, a brim ring, a thin chin strap trailing
 * toward the jaw. Same overlay contract as `hair.ts` — swap one for the
 * other over `bodyBase` for the "helmet vs. hair" choice.
 */
export const helmetClassic: Sprite = {
  w: 18,
  h: 28,
  grid: [
    mirrorRow(dome(4)), // 0
    mirrorRow(dome(7)), // 1
    mirrorRow(dome(8)), // 2: overhangs skin(4)
    mirrorRow(dome(8)), // 3
    mirrorRow(dome(9)), // 4: brim, full width
    mirrorRow(strap(1)), // 5: chin strap
    mirrorRow(strap(1)), // 6
    EMPTY, // 7
    EMPTY, // 8
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
  slots: { H: 'helmet' },
};
