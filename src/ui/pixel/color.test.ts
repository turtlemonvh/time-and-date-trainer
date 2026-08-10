import { describe, expect, it } from 'vitest';
import { lighten } from './color';

describe('lighten', () => {
  it('leaves a color unchanged at amount 0', () => {
    expect(lighten('#336699', 0)).toBe('#336699');
  });

  it('produces white at amount 1', () => {
    expect(lighten('#336699', 1)).toBe('#ffffff');
  });

  it('produces an intermediate mix at amount 0.5', () => {
    // 0 + (255 - 0) * 0.5 = 127.5, rounds up to 128 = 0x80
    expect(lighten('#000000', 0.5)).toBe('#808080');
  });

  it('preserves a leading # and zero-pads single-digit hex channels', () => {
    expect(lighten('#010203', 0)).toBe('#010203');
  });
});
