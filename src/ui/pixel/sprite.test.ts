import { describe, expect, it } from 'vitest';
import { validateSprite } from './sprite';
import type { Sprite } from './types';

const valid: Sprite = {
  w: 3,
  h: 2,
  grid: ['.H.', 'HHH'],
  slots: { H: 'hair' },
};

describe('validateSprite', () => {
  it('accepts a well-formed sprite', () => {
    expect(() => validateSprite(valid)).not.toThrow();
  });

  it('throws when the row count does not match h', () => {
    expect(() => validateSprite({ ...valid, grid: ['.H.'] })).toThrow(/rows/);
  });

  it('throws when a row length does not match w', () => {
    expect(() => validateSprite({ ...valid, grid: ['.H', 'HHH'] })).toThrow(/row 0/);
  });

  it('throws when a grid character has no matching slot', () => {
    expect(() => validateSprite({ ...valid, grid: ['.X.', 'HHH'] })).toThrow(/unknown slot/);
  });

  it('treats "." as transparent, not a slot key', () => {
    expect(() => validateSprite({ w: 1, h: 1, grid: ['.'], slots: {} })).not.toThrow();
  });
});
