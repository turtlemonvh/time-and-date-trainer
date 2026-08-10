import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../engine/rng';
import { validateSprite } from './sprite';
import { generateMountain } from './mountain';

describe('generateMountain', () => {
  it('produces a well-formed sprite', () => {
    const sprite = generateMountain(mulberry32(1), 48, 20, 16);
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('is deterministic for a given seed', () => {
    const a = generateMountain(mulberry32(42), 48, 20, 16);
    const b = generateMountain(mulberry32(42), 48, 20, 16);
    expect(a.grid).toEqual(b.grid);
  });

  it('produces a different silhouette for a different seed', () => {
    const a = generateMountain(mulberry32(1), 48, 20, 16);
    const b = generateMountain(mulberry32(2), 48, 20, 16);
    expect(a.grid).not.toEqual(b.grid);
  });

  it('has both rock and snow pixels when the snowline is between 0 and 1', () => {
    const sprite = generateMountain(mulberry32(1), 48, 20, 16, 0.25);
    const allPixels = sprite.grid.join('');
    expect(allPixels).toContain('R');
    expect(allPixels).toContain('S');
  });

  it('has no snow when snowlineFraction is 0', () => {
    const sprite = generateMountain(mulberry32(1), 48, 20, 16, 0);
    expect(sprite.grid.join('')).not.toContain('S');
  });

  it('the bottom row is entirely rock or snow — the mountain reaches the base everywhere', () => {
    const sprite = generateMountain(mulberry32(1), 48, 20, 16);
    const bottomRow = sprite.grid[sprite.grid.length - 1];
    expect(bottomRow).not.toContain('.');
  });

  it('the top row is entirely sky when peakHeight is well under the sprite height', () => {
    const sprite = generateMountain(mulberry32(1), 48, 20, 10);
    expect(sprite.grid[0]).toBe('.'.repeat(sprite.w));
  });
});
