import { describe, expect, it } from 'vitest';
import { describeDifficultyComparisonTable, describeDifficultyLevel } from './difficultyDescribe';

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

describe('describeDifficultyComparisonTable', () => {
  // Peak 10 (Summit of Hours) is on-theme for every generator, so its
  // relevant-item set is the broadest available — the closest thing to
  // "everything" now that items are peak-filtered. It's still missing
  // '24-hour time' (see the dedicated test below): no generator, including
  // peak 8's own hour24.ts, actually reads that field.
  const BROADEST_PEAK = 10;

  it('never includes "24-hour time" for any peak — no generator reads that field', () => {
    for (let peakId = 1; peakId <= 10; peakId++) {
      const rows = describeDifficultyComparisonTable(1, 10, peakId);
      expect(rows.some((r) => r.item === '24-hour time')).toBe(false);
    }
  });

  it("returns peak 10's broadest set: every item except 24-hour time", () => {
    const rows = describeDifficultyComparisonTable(1, 10, BROADEST_PEAK);
    const items = rows.map((r) => r.item).sort();
    expect(items).toEqual(
      [
        'Answer order',
        'Answer style',
        'Clock numbers',
        'Clock precision',
        'Dates',
        'Time-in-words',
        'Timer',
      ].sort(),
    );
  });

  it('filters clock-only rows for a clock-reading peak (1: Basecamp Bluff)', () => {
    const rows = describeDifficultyComparisonTable(1, 10, 1);
    const items = rows.map((r) => r.item);
    expect(items).toEqual(
      expect.arrayContaining(['Clock precision', 'Clock numbers', 'Answer order']),
    );
    expect(items).not.toContain('Dates');
    expect(items).not.toContain('Time-in-words');
  });

  it('filters clock-only rows for a calendar-reading peak (3: Calendar Ridge)', () => {
    const rows = describeDifficultyComparisonTable(1, 10, 3);
    const items = rows.map((r) => r.item);
    expect(items).toEqual(expect.arrayContaining(['Dates', 'Answer order']));
    expect(items).not.toContain('Clock precision');
    expect(items).not.toContain('Clock numbers');
    expect(items).not.toContain('Time-in-words');
  });

  it('always includes Timer and Answer style, regardless of peak', () => {
    for (let peakId = 1; peakId <= 10; peakId++) {
      const items = describeDifficultyComparisonTable(1, 10, peakId).map((r) => r.item);
      expect(items).toContain('Timer');
      expect(items).toContain('Answer style');
    }
  });

  it('drops "Answer order" for an interactive-only peak (4: The Hourglass)', () => {
    // setHands is 'interactive' mode — there's no choice list to shuffle.
    const items = describeDifficultyComparisonTable(1, 10, 4).map((r) => r.item);
    expect(items).not.toContain('Answer order');
  });

  it('marks every row unchanged, and current equal to next, comparing a level to itself', () => {
    for (let level = 1; level <= 10; level++) {
      const rows = describeDifficultyComparisonTable(level, level, BROADEST_PEAK);
      for (const row of rows) {
        expect(row.changed).toBe(false);
        expect(row.current).toEqual(row.next);
      }
    }
  });

  it('flags exactly the two rows that change from difficulty 1 to 2 (timer and time-in-words)', () => {
    // D1 and D2 share the same dominant clock precision (hour) and the same
    // dominant answer mode (choice) per difficulty.ts's real weights — only
    // the timer and the describePhrasing tier actually change here.
    const rows = describeDifficultyComparisonTable(1, 2, BROADEST_PEAK);
    const changed = rows.filter((r) => r.changed).map((r) => r.item);
    expect(changed).toEqual(['Timer', 'Time-in-words']);
  });

  it('flags every remaining row as changed from difficulty 1 to 10', () => {
    const rows = describeDifficultyComparisonTable(1, 10, BROADEST_PEAK);
    expect(rows.every((r) => r.changed)).toBe(true);
  });

  it('every row has a non-empty item label and current/next value', () => {
    const rows = describeDifficultyComparisonTable(3, 7, BROADEST_PEAK);
    for (const row of rows) {
      expect(row.item.trim().length).toBeGreaterThan(0);
      expect(row.current.trim().length).toBeGreaterThan(0);
      expect(row.next.trim().length).toBeGreaterThan(0);
    }
  });

  it('leaves clock numbers unchanged between difficulty 2 and 3', () => {
    const rows = describeDifficultyComparisonTable(2, 3, BROADEST_PEAK);
    const byItem = Object.fromEntries(rows.map((r) => [r.item, r]));
    expect(byItem['Clock numbers'].changed).toBe(false);
  });

  it('reads sensibly in either direction — current/next swap, changed stays the same set', () => {
    const up = describeDifficultyComparisonTable(3, 8, BROADEST_PEAK);
    const down = describeDifficultyComparisonTable(8, 3, BROADEST_PEAK);
    for (let i = 0; i < up.length; i++) {
      expect(up[i].current).toEqual(down[i].next);
      expect(up[i].next).toEqual(down[i].current);
      expect(up[i].changed).toBe(down[i].changed);
    }
  });

  it('clamps out-of-range levels the same way difficultyProfile does', () => {
    expect(describeDifficultyComparisonTable(0, 5, BROADEST_PEAK)).toEqual(
      describeDifficultyComparisonTable(1, 5, BROADEST_PEAK),
    );
    expect(describeDifficultyComparisonTable(5, 99, BROADEST_PEAK)).toEqual(
      describeDifficultyComparisonTable(5, 10, BROADEST_PEAK),
    );
  });

  it('throws for an out-of-range peak id', () => {
    expect(() => describeDifficultyComparisonTable(1, 5, 999)).toThrow();
  });
});
