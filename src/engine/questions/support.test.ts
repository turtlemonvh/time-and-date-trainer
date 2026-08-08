import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { mulberry32 } from '../rng';
import {
  buildChoiceAnswer,
  dateRangeForSpan,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  OPTION_COUNT,
  pickPrecision,
  randomQuestionDate,
  shiftTime,
  weekdayName,
  WEEKDAY_NAMES,
} from './support';

describe('formatClockFace', () => {
  it('formats without AM/PM because a clock face cannot show it', () => {
    expect(formatClockFace({ hour: 15, minute: 5, second: 0 }, false)).toBe('3:05');
    expect(formatClockFace({ hour: 3, minute: 5, second: 0 }, false)).toBe('3:05');
  });

  it('renders midnight and noon as 12', () => {
    expect(formatClockFace({ hour: 0, minute: 0, second: 0 }, false)).toBe('12:00');
    expect(formatClockFace({ hour: 12, minute: 30, second: 0 }, false)).toBe('12:30');
  });

  it('includes zero-padded seconds when asked', () => {
    expect(formatClockFace({ hour: 9, minute: 7, second: 4 }, true)).toBe('9:07:04');
  });
});

describe('shiftTime', () => {
  it('adds seconds and carries into minutes and hours', () => {
    expect(shiftTime({ hour: 1, minute: 59, second: 50 }, 20)).toEqual({
      hour: 2,
      minute: 0,
      second: 10,
    });
  });

  it('wraps backwards past midnight', () => {
    expect(shiftTime({ hour: 0, minute: 10, second: 0 }, -1200)).toEqual({
      hour: 23,
      minute: 50,
      second: 0,
    });
  });

  it('wraps forwards past midnight', () => {
    expect(shiftTime({ hour: 23, minute: 30, second: 0 }, 3600)).toEqual({
      hour: 0,
      minute: 30,
      second: 0,
    });
  });
});

describe('distractorTimes', () => {
  it('never reproduces the source time at any precision', () => {
    const source = { hour: 3, minute: 15, second: 9 };
    for (const precision of ['hour', 'half', 'quarter', 'five', 'minute', 'second'] as const) {
      for (const candidate of distractorTimes(source, precision)) {
        expect(candidate).not.toEqual(source);
      }
    }
  });

  it('yields at least three distinct clock faces at every precision', () => {
    const source = { hour: 3, minute: 0, second: 0 };
    for (const precision of ['hour', 'half', 'quarter', 'five', 'minute', 'second'] as const) {
      const showSeconds = precision === 'second';
      const faces = new Set(
        distractorTimes(source, precision).map((t) => formatClockFace(t, showSeconds)),
      );
      faces.delete(formatClockFace(source, showSeconds));
      expect(faces.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps hour-precision distractors on the hour', () => {
    for (const candidate of distractorTimes({ hour: 3, minute: 0, second: 0 }, 'hour')) {
      expect(candidate.minute).toBe(0);
      expect(candidate.second).toBe(0);
    }
  });
});

describe('pickPrecision', () => {
  it('only ever returns a precision with a positive weight', () => {
    const rng = mulberry32(1);
    const profile = difficultyProfile(1);
    for (let i = 0; i < 100; i++) {
      expect(profile.timePrecisionWeights[pickPrecision(rng, profile)]).toBeGreaterThan(0);
    }
  });

  it('covers every difficulty without throwing', () => {
    for (let level = 1; level <= 10; level++) {
      const rng = mulberry32(level);
      const profile = difficultyProfile(level);
      for (let i = 0; i < 50; i++) {
        expect(profile.timePrecisionWeights[pickPrecision(rng, profile)]).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const profile = difficultyProfile(5);
    expect(pickPrecision(mulberry32(9), profile)).toBe(pickPrecision(mulberry32(9), profile));
  });
});

describe('weekdayName', () => {
  it('names the weekday with Sunday first', () => {
    expect(WEEKDAY_NAMES[0]).toBe('Sunday');
    // 2026-11-21 is a Saturday.
    expect(weekdayName(new Date(2026, 10, 21))).toBe('Saturday');
    // 2026-01-01 is a Thursday.
    expect(weekdayName(new Date(2026, 0, 1))).toBe('Thursday');
  });
});

describe('dateRangeForSpan / randomQuestionDate', () => {
  it('keeps the narrow spans inside 2026', () => {
    for (const span of ['withinMonth', 'acrossMonths'] as const) {
      const { start, end } = dateRangeForSpan(span);
      expect(start.getFullYear()).toBe(2026);
      expect(end.getFullYear()).toBe(2026);
    }
  });

  it('widens to a multi-year window including leap years for acrossYears', () => {
    const { start, end } = dateRangeForSpan('acrossYears');
    expect(start.getFullYear()).toBe(2024);
    expect(end.getFullYear()).toBe(2028);
  });

  it('returns fresh Date objects each call so callers cannot mutate the table', () => {
    expect(dateRangeForSpan('acrossYears').start).not.toBe(dateRangeForSpan('acrossYears').start);
  });

  it('generates dates inside the span window', () => {
    const rng = mulberry32(4);
    const { start, end } = dateRangeForSpan('acrossMonths');
    for (let i = 0; i < 100; i++) {
      const d = randomQuestionDate(rng, 'acrossMonths');
      expect(d.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(d.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  });
});

describe('buildChoiceAnswer', () => {
  it('produces the requested number of distinct options containing the correct one', () => {
    const answer = buildChoiceAnswer(mulberry32(1), 'a', ['b', 'c', 'd', 'e']);
    expect(answer.kind).toBe('choice');
    expect(answer.options).toHaveLength(OPTION_COUNT);
    expect(new Set(answer.options).size).toBe(OPTION_COUNT);
    expect(answer.options[answer.correctIndex]).toBe('a');
  });

  it('drops candidates equal to the correct answer', () => {
    const answer = buildChoiceAnswer(mulberry32(2), 'a', ['a', 'b', 'a', 'c', 'd']);
    expect(answer.options).toHaveLength(OPTION_COUNT);
    expect(answer.options.filter((o) => o === 'a')).toHaveLength(1);
  });

  it('drops duplicate candidates', () => {
    const answer = buildChoiceAnswer(mulberry32(3), 'a', ['b', 'b', 'c', 'c', 'd', 'd']);
    expect(new Set(answer.options).size).toBe(OPTION_COUNT);
  });

  it('throws loudly when a generator supplies too few distinct distractors', () => {
    expect(() => buildChoiceAnswer(mulberry32(4), 'a', ['a', 'b', 'b'])).toThrow(
      /distinct distractors/,
    );
  });

  it('does not always put the correct answer in the same slot', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 40; seed++) {
      positions.add(buildChoiceAnswer(mulberry32(seed), 'a', ['b', 'c', 'd', 'e']).correctIndex);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a given seed', () => {
    const a = buildChoiceAnswer(mulberry32(11), 'a', ['b', 'c', 'd', 'e']);
    const b = buildChoiceAnswer(mulberry32(11), 'a', ['b', 'c', 'd', 'e']);
    expect(a).toEqual(b);
  });
});

describe('makeQuestionId', () => {
  it('prefixes the id with the type id', () => {
    const id = makeQuestionId(mulberry32(1), 'readAnalog');
    expect(id.startsWith('readAnalog-')).toBe(true);
    expect(id.length).toBeGreaterThan('readAnalog-'.length);
  });

  it('produces different ids from a continuing rng stream', () => {
    const rng = mulberry32(1);
    expect(makeQuestionId(rng, 'x')).not.toBe(makeQuestionId(rng, 'x'));
  });
});
