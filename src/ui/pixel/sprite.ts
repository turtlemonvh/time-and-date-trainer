import type { Sprite } from './types';

/**
 * Throws if a hand-authored sprite is malformed: a row's length doesn't
 * match `w`, the grid doesn't have `h` rows, or a grid character has no
 * matching entry in `slots` (and isn't `.`, the transparent marker). Catches
 * the exact class of typo that's easy to make authoring a grid as an array
 * of strings, and easy to miss just by reading it.
 */
export function validateSprite(sprite: Sprite): void {
  const { w, h, grid, slots } = sprite;
  if (grid.length !== h) {
    throw new Error(`validateSprite: expected ${h} rows, got ${grid.length}`);
  }
  for (const [rowIndex, row] of grid.entries()) {
    if (row.length !== w) {
      throw new Error(`validateSprite: row ${rowIndex} has length ${row.length}, expected ${w}`);
    }
    for (const char of row) {
      if (char !== '.' && !(char in slots)) {
        throw new Error(`validateSprite: row ${rowIndex} uses unknown slot "${char}"`);
      }
    }
  }
}
