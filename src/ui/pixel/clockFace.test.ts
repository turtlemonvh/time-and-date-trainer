import { describe, expect, it } from 'vitest';
import { generateClockFace } from './clockFace';
import { validateSprite } from './sprite';

describe('generateClockFace', () => {
  it('is well-formed', () => {
    const face = generateClockFace(33);
    expect(() => validateSprite(face)).not.toThrow();
  });

  it('is circular: corners are transparent, center is face-colored', () => {
    const face = generateClockFace(33);
    expect(face.grid[0][0]).toBe('.');
    expect(face.grid[16][16]).toBe('F');
  });

  it('has a rim ring around the edge', () => {
    const face = generateClockFace(33);
    // Straight up from center should land on the rim near the top edge.
    expect(face.grid[0].includes('R')).toBe(true);
  });

  it("marks major ticks at 12 and 3 o'clock, inside the rim ring", () => {
    const face = generateClockFace(33);
    // 12 o'clock: straight up from center (16,16), inside the tick band.
    expect(face.grid[2][16]).toBe('M');
    // 3 o'clock: straight right from center, inside the tick band.
    expect(face.grid[16][30]).toBe('M');
  });

  it('produces the requested diameter', () => {
    const face = generateClockFace(41);
    expect(face.w).toBe(41);
    expect(face.h).toBe(41);
    expect(face.grid).toHaveLength(41);
    expect(face.grid.every((row) => row.length === 41)).toBe(true);
  });
});
