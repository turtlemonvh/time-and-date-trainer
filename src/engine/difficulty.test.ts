import { describe, expect, it } from 'vitest';
import { difficultyProfile } from './difficulty';

describe('difficultyProfile', () => {
  it('D1 is almost entirely hour precision, slow timer, mostly multiple choice', () => {
    const p = difficultyProfile(1);
    expect(p.level).toBe(1);
    expect(p.timePrecisionWeights.hour).toBeGreaterThan(0);
    expect(p.timePrecisionWeights.second).toBe(0);
    expect(p.timerMs).toBe(30000);
    expect(p.answerModeWeights.choice).toBeGreaterThan(p.answerModeWeights.interactive);
    expect(p.answerModeWeights.choice).toBeGreaterThan(p.answerModeWeights.free);
    expect(p.dateSpan).toBe('withinMonth');
    expect(p.hour24).toBe(false);
  });

  it('D5 weights five-minute precision most heavily', () => {
    const p = difficultyProfile(5);
    const weights = p.timePrecisionWeights;
    const maxWeight = Math.max(
      weights.hour,
      weights.half,
      weights.quarter,
      weights.five,
      weights.minute,
      weights.second,
    );
    expect(weights.five).toBe(maxWeight);
  });

  it('D9 and D10 include nonzero second precision', () => {
    expect(difficultyProfile(9).timePrecisionWeights.second).toBeGreaterThan(0);
    expect(difficultyProfile(10).timePrecisionWeights.second).toBeGreaterThan(0);
  });

  it('D10 has the fastest timer', () => {
    expect(difficultyProfile(10).timerMs).toBe(12000);
  });

  it('timer decreases monotonically from D1 to D10', () => {
    for (let d = 1; d < 10; d++) {
      expect(difficultyProfile(d).timerMs).toBeGreaterThan(difficultyProfile(d + 1).timerMs);
    }
  });

  it('D8-10 weight free input over choice', () => {
    for (const d of [8, 9, 10]) {
      const p = difficultyProfile(d);
      expect(p.answerModeWeights.free).toBeGreaterThan(p.answerModeWeights.choice);
    }
  });

  it("maps date span to the spec's three bands", () => {
    for (const d of [1, 2, 3]) expect(difficultyProfile(d).dateSpan).toBe('withinMonth');
    for (const d of [4, 5, 6, 7]) expect(difficultyProfile(d).dateSpan).toBe('acrossMonths');
    for (const d of [8, 9, 10]) expect(difficultyProfile(d).dateSpan).toBe('acrossYears');
  });

  it('enables 24-hour clock only at D8 and above', () => {
    for (const d of [1, 2, 3, 4, 5, 6, 7]) expect(difficultyProfile(d).hour24).toBe(false);
    for (const d of [8, 9, 10]) expect(difficultyProfile(d).hour24).toBe(true);
  });

  it('shows clock numerals through D8, hides them at D9-10', () => {
    for (const d of [1, 2, 3, 4, 5, 6, 7, 8]) expect(difficultyProfile(d).clockNumerals).toBe(true);
    for (const d of [9, 10]) expect(difficultyProfile(d).clockNumerals).toBe(false);
  });

  it('clamps out-of-range levels', () => {
    expect(difficultyProfile(0).level).toBe(1);
    expect(difficultyProfile(-5).level).toBe(1);
    expect(difficultyProfile(11).level).toBe(10);
    expect(difficultyProfile(999).level).toBe(10);
  });

  it('rounds non-integer levels', () => {
    expect(difficultyProfile(3.4).level).toBe(3);
    expect(difficultyProfile(3.6).level).toBe(4);
  });
});
