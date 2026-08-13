import { describe, expect, it } from 'vitest';
import { describeDifficultyDelta, describeDifficultyLevel } from './difficultyDescribe';

describe('describeDifficultyLevel', () => {
  it('returns exactly 8 non-empty bullets — one per DifficultyProfile field', () => {
    for (let level = 1; level <= 10; level++) {
      const bullets = describeDifficultyLevel(level);
      expect(bullets).toHaveLength(8);
      for (const bullet of bullets) {
        expect(typeof bullet).toBe('string');
        expect(bullet.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('describes difficulty 1 as easy, choice-only, coarse, 12-hour', () => {
    const bullets = describeDifficultyLevel(1).join(' | ');
    expect(bullets).toContain('the hour');
    expect(bullets).toContain('Multiple choice only');
    expect(bullets).toContain('Dates stay within the same month');
    expect(bullets).toContain('Sticks to 12-hour AM/PM time');
    expect(bullets).toContain('Clock face shows the numbers 1-12');
    expect(bullets).toContain('Answer choices are shown in order');
  });

  it('describes difficulty 10 as hard, mostly free-typed, fine precision, 24-hour', () => {
    const bullets = describeDifficultyLevel(10).join(' | ');
    expect(bullets).toContain('the exact second');
    expect(bullets).toContain('typed-in answers');
    expect(bullets).toContain('Dates can span different years, including leap years');
    expect(bullets).toContain('Uses 24-hour time');
    expect(bullets).toContain('Clock face has no numbers');
    expect(bullets).toContain('Answer choices are shuffled');
  });

  it('clamps out-of-range levels the same way difficultyProfile does', () => {
    expect(describeDifficultyLevel(0)).toEqual(describeDifficultyLevel(1));
    expect(describeDifficultyLevel(99)).toEqual(describeDifficultyLevel(10));
  });

  it('is deterministic', () => {
    expect(describeDifficultyLevel(5)).toEqual(describeDifficultyLevel(5));
  });
});

describe('describeDifficultyDelta', () => {
  it('returns an empty array comparing a level to itself', () => {
    for (let level = 1; level <= 10; level++) {
      expect(describeDifficultyDelta(level, level)).toEqual([]);
    }
  });

  it('describes exactly the two fields that actually change from difficulty 1 to 2 (timer and phrasing)', () => {
    // D1 and D2 share the same dominant clock precision (hour) and the same
    // dominant answer mode (choice) — per difficulty.ts's real weights, only
    // the timer and the describePhrasing tier actually change here.
    const delta = describeDifficultyDelta(1, 2);
    expect(delta).toHaveLength(2);
    expect(delta.some((b) => b.includes('Timer'))).toBe(true);
    expect(delta.some((b) => b.includes('Time-in-words'))).toBe(true);
  });

  it('mentions every changed dimension from difficulty 1 to 10 — all 8 fields differ', () => {
    const bullets = describeDifficultyDelta(1, 10);
    expect(bullets).toHaveLength(8);
    const delta = bullets.join(' | ');
    expect(delta).toContain('Clock precision');
    expect(delta).toContain('Timer');
    expect(delta).toContain('Mostly');
    expect(delta).toContain('Dates');
    expect(delta).toContain('24-hour time is introduced');
    expect(delta).toContain('Clock numbers disappear');
    expect(delta).toContain('Time-in-words');
    expect(delta).toContain('shuffled');
  });

  it('reads sensibly in either direction (going down a level, not just up)', () => {
    const up = describeDifficultyDelta(3, 8);
    const down = describeDifficultyDelta(8, 3);
    expect(up.length).toBe(down.length);
    expect(up.length).toBeGreaterThan(0);
    // Not asserting the two are textually inverse — just that both directions
    // produce real, non-empty output rather than only working "upward".
  });

  it('never mentions a field that has the same dominant value on both sides', () => {
    // Difficulty 2 and 3 both keep hour24 false and clockNumerals true —
    // neither bullet should appear.
    const delta = describeDifficultyDelta(2, 3).join(' | ');
    expect(delta).not.toContain('24-hour');
    expect(delta).not.toContain('Clock numbers');
  });
});
