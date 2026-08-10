import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PixelCanvas from './PixelCanvas';
import type { Palette, Sprite } from './types';

const sprite: Sprite = {
  w: 2,
  h: 2,
  grid: ['H.', '.H'],
  slots: { H: 'hair' },
};

const palette: Palette = { hair: '#ff0000' };

describe('PixelCanvas', () => {
  it('sizes the canvas to sprite dimensions times scale', () => {
    const { container } = render(<PixelCanvas sprite={sprite} palette={palette} scale={10} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.width).toBe(20);
    expect(canvas?.height).toBe(20);
  });

  it('defaults to a scale of 8', () => {
    const { container } = render(<PixelCanvas sprite={sprite} palette={palette} />);
    const canvas = container.querySelector('canvas');
    expect(canvas?.width).toBe(16);
    expect(canvas?.height).toBe(16);
  });

  it('does not throw when the palette is missing a color for a used slot', () => {
    expect(() => render(<PixelCanvas sprite={sprite} palette={{}} />)).not.toThrow();
  });
});
