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

  describe('at the production diameter (129)', () => {
    // Higher-density grid used by AnalogClock, dense enough to carry both
    // the 12 hour/major ticks and 60 fine minute ticks distinctly.
    const face = generateClockFace(129);

    it('is well-formed and declares a minuteTick slot', () => {
      expect(() => validateSprite(face)).not.toThrow();
      expect(face.slots.t).toBe('minuteTick');
    });

    it("still marks major ticks at 12 and 3 o'clock", () => {
      expect(face.grid[5][64]).toBe('M');
      expect(face.grid[64][123]).toBe('M');
    });

    it('marks thin minute ticks between the hour positions', () => {
      // A minute position near 12 o'clock that is not itself an hour mark.
      expect(face.grid[6][57]).toBe('t');
    });
  });
});
