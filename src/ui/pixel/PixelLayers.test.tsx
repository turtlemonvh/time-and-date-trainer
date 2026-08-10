import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PixelLayers from './PixelLayers';
import type { Sprite } from './types';

const base: Sprite = { w: 2, h: 2, grid: ['H.', '.H'], slots: { H: 'hair' } };
const overlay: Sprite = { w: 2, h: 2, grid: ['.S', 'S.'], slots: { S: 'harness' } };

describe('PixelLayers', () => {
  it('sizes the canvas from the first layer', () => {
    const { container } = render(
      <PixelLayers
        layers={[
          { sprite: base, palette: { hair: '#000' } },
          { sprite: overlay, palette: { harness: '#fff' } },
        ]}
        scale={10}
      />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas?.width).toBe(20);
    expect(canvas?.height).toBe(20);
  });

  it('renders with zero layers without throwing', () => {
    expect(() => render(<PixelLayers layers={[]} />)).not.toThrow();
  });
});
