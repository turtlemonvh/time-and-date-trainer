# M1a — Engine Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, DOM-free foundation of the game engine — a seeded PRNG, time/date generation and formatting, the difficulty-to-parameters mapping, the ten peak definitions, and the climb state machine — each exhaustively unit tested. Nothing here touches React or the DOM; later plans (M1b, M1c) build the question system and a debug UI on top of it.

**Architecture:** All code lives under `src/engine/`, one file per concern, each independently testable with zero cross-imports to React/DOM. `climb.ts` and `difficulty.ts` are pure reducers/lookup tables with no randomness. `rng.ts` is the only source of randomness in the whole engine — every other generator takes an `Rng` as an explicit parameter so tests are fully deterministic.

**Tech Stack:** TypeScript (existing strict config), Vitest (existing), `date-fns@^4` (new runtime dependency for calendar arithmetic).

## Global Constraints

- Pure TypeScript, zero DOM/React imports anywhere under `src/engine/` (from spec's Architecture section: "pure TS — no DOM, no React").
- All randomness flows through an explicit `Rng` parameter (a seeded `() => number` function) — nothing calls `Math.random()` directly, so every generator is reproducible in tests (from spec's `rng.ts` description: "seeded mulberry32 PRNG (reproducible tests)").
- US conventions: 12-hour AM/PM time formatting, month-first date formatting (e.g. "November 21, 2026"), 24-hour clock only enabled at difficulty 8+ (from spec's Conventions row).
- Construct `Date` objects via the local-time constructor (`new Date(year, monthIndex, day)`), never by parsing a bare `'YYYY-MM-DD'` string (which `Date` parses as UTC midnight and can display as the previous day in negative-UTC-offset timezones). This applies to every task and test in this plan that touches `dateMath.ts`.
- Difficulty profile values must match the spec's qualitative bands exactly: D1 ≈ all-hour precision, D5 mostly five-minute, D9–10 includes seconds; timer 20s at D1 down to 7s at D10; D1–3 mostly multiple choice, D8–10 mostly free input; date span within-month (D1–3) → across-months (D4–7) → across-years (D8–10); 24-hour clock at D8+.

---

## Task 1: Seeded RNG (`src/engine/rng.ts`)

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/rng.test.ts`

**Interfaces:**
- Produces: `type Rng = () => number` (returns a float in `[0, 1)`), `mulberry32(seed: number): Rng`, `randInt(rng: Rng, min: number, max: number): number` (inclusive both ends), `pick<T>(rng: Rng, items: readonly T[]): T`, `interface WeightedItem<T> { value: T; weight: number }`, `weightedPick<T>(rng: Rng, items: readonly WeightedItem<T>[]): T`, `shuffle<T>(rng: Rng, items: readonly T[]): T[]` (returns a new array, does not mutate input). Every later task in this plan (and every task in M1b) imports `Rng`, `randInt`, `pick`, or `weightedPick` from this file.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, pick, randInt, shuffle, weightedPick } from './rng';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('always returns values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt', () => {
  it('stays within inclusive bounds over many draws', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(randInt(mulberry32(99), 0, 100)).toBe(randInt(mulberry32(99), 0, 100));
  });

  it('handles min === max', () => {
    expect(randInt(mulberry32(1), 5, 5)).toBe(5);
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = mulberry32(3);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });

  it('throws on an empty array', () => {
    expect(() => pick(mulberry32(1), [])).toThrow();
  });
});

describe('weightedPick', () => {
  it('heavily favors a heavily-weighted item', () => {
    const rng = mulberry32(5);
    const items = [
      { value: 'rare', weight: 1 },
      { value: 'common', weight: 99 },
    ];
    const counts = { rare: 0, common: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[weightedPick(rng, items) as 'rare' | 'common']++;
    }
    expect(counts.common).toBeGreaterThan(counts.rare * 10);
  });

  it('throws on an empty array', () => {
    expect(() => weightedPick(mulberry32(1), [])).toThrow();
  });

  it('throws when total weight is zero', () => {
    expect(() => weightedPick(mulberry32(1), [{ value: 'x', weight: 0 }])).toThrow();
  });
});

describe('shuffle', () => {
  it('returns an array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(mulberry32(1), input);
    expect(result.slice().sort()).toEqual(input.slice().sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    shuffle(mulberry32(1), input);
    expect(input).toEqual(copy);
  });

  it('is deterministic for a given seed', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(mulberry32(42), input)).toEqual(shuffle(mulberry32(42), input));
  });

  it('produces a different order than the input for a large enough array', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(mulberry32(1), input)).not.toEqual(input);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/rng.test.ts`
Expected: FAIL — `Cannot find module './rng'`.

- [ ] **Step 3: Implement**

Create `src/engine/rng.ts`:

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: items must not be empty');
  return items[randInt(rng, 0, items.length - 1)];
}

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

export function weightedPick<T>(rng: Rng, items: readonly WeightedItem<T>[]): T {
  if (items.length === 0) throw new Error('weightedPick: items must not be empty');
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) throw new Error('weightedPick: total weight must be positive');
  let roll = rng() * total;
  for (const item of items) {
    if (roll < item.weight) return item.value;
    roll -= item.weight;
  }
  return items[items.length - 1].value;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/rng.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts src/engine/rng.test.ts
git commit -m "Add seeded RNG with weighted pick and shuffle helpers"
```

---

## Task 2: Time generation and formatting (`src/engine/timeMath.ts`)

**Files:**
- Create: `src/engine/timeMath.ts`
- Test: `src/engine/timeMath.test.ts`

**Interfaces:**
- Consumes: `Rng`, `randInt` from `./rng` (Task 1).
- Produces: `type TimePrecision = 'hour' | 'half' | 'quarter' | 'five' | 'minute' | 'second'`, `interface TimeOfDay { hour: number; minute: number; second: number }` (24-hour internal representation, `hour` 0–23), `randomTime(rng: Rng, precision: TimePrecision): TimeOfDay`, `formatTime12(t: TimeOfDay, opts?: { seconds?: boolean }): string`, `describeTime(t: TimeOfDay): string`. M1b's generators and `difficulty.ts` (Task 4 of this plan) import `TimePrecision`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/timeMath.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { describeTime, formatTime12, randomTime } from './timeMath';

describe('randomTime', () => {
  it('snaps to hour boundaries', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'hour');
      expect(t.minute).toBe(0);
      expect(t.second).toBe(0);
    }
  });

  it('snaps to half-hour boundaries', () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'half');
      expect([0, 30]).toContain(t.minute);
    }
  });

  it('snaps to quarter-hour boundaries', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'quarter');
      expect([0, 15, 30, 45]).toContain(t.minute);
    }
  });

  it('snaps to five-minute boundaries', () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(rng, 'five');
      expect(t.minute % 5).toBe(0);
    }
  });

  it('allows any minute at minute precision, with zero seconds', () => {
    const rng = mulberry32(5);
    const minutes = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const t = randomTime(rng, 'minute');
      minutes.add(t.minute);
      expect(t.second).toBe(0);
    }
    expect(minutes.size).toBeGreaterThan(10);
  });

  it('produces varied seconds at second precision', () => {
    const rng = mulberry32(6);
    const seconds = new Set<number>();
    for (let i = 0; i < 300; i++) {
      seconds.add(randomTime(rng, 'second').second);
    }
    expect(seconds.size).toBeGreaterThan(10);
  });

  it('always produces an hour in [0, 23]', () => {
    const rng = mulberry32(8);
    for (let i = 0; i < 200; i++) {
      const t = randomTime(rng, 'hour');
      expect(t.hour).toBeGreaterThanOrEqual(0);
      expect(t.hour).toBeLessThanOrEqual(23);
    }
  });
});

describe('formatTime12', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatTime12({ hour: 0, minute: 0, second: 0 })).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime12({ hour: 12, minute: 0, second: 0 })).toBe('12:00 PM');
  });

  it('formats a morning time', () => {
    expect(formatTime12({ hour: 1, minute: 5, second: 0 })).toBe('1:05 AM');
  });

  it('formats an afternoon time', () => {
    expect(formatTime12({ hour: 13, minute: 5, second: 0 })).toBe('1:05 PM');
  });

  it('includes seconds when requested', () => {
    expect(formatTime12({ hour: 15, minute: 45, second: 9 }, { seconds: true })).toBe(
      '3:45:09 PM',
    );
  });
});

describe('describeTime', () => {
  it('describes exact hours as o\'clock', () => {
    expect(describeTime({ hour: 3, minute: 0, second: 0 })).toBe("three o'clock");
    expect(describeTime({ hour: 0, minute: 0, second: 0 })).toBe("twelve o'clock");
    expect(describeTime({ hour: 12, minute: 0, second: 0 })).toBe("twelve o'clock");
  });

  it('describes quarter past and quarter to', () => {
    expect(describeTime({ hour: 3, minute: 15, second: 0 })).toBe('quarter past three');
    expect(describeTime({ hour: 3, minute: 45, second: 0 })).toBe('quarter to four');
  });

  it('describes half past', () => {
    expect(describeTime({ hour: 3, minute: 30, second: 0 })).toBe('half past three');
  });

  it('describes arbitrary minutes past and to the hour', () => {
    expect(describeTime({ hour: 3, minute: 10, second: 0 })).toBe('ten past three');
    expect(describeTime({ hour: 3, minute: 50, second: 0 })).toBe('ten to four');
  });

  it('wraps the hour word at the top of the clock', () => {
    expect(describeTime({ hour: 23, minute: 45, second: 0 })).toBe('quarter to twelve');
    expect(describeTime({ hour: 11, minute: 45, second: 0 })).toBe('quarter to twelve');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/timeMath.test.ts`
Expected: FAIL — `Cannot find module './timeMath'`.

- [ ] **Step 3: Implement**

Create `src/engine/timeMath.ts`:

```ts
import { randInt, type Rng } from './rng';

export type TimePrecision = 'hour' | 'half' | 'quarter' | 'five' | 'minute' | 'second';

export interface TimeOfDay {
  hour: number;
  minute: number;
  second: number;
}

const PRECISION_STEP_MINUTES: Record<TimePrecision, number> = {
  hour: 60,
  half: 30,
  quarter: 15,
  five: 5,
  minute: 1,
  second: 1,
};

export function randomTime(rng: Rng, precision: TimePrecision): TimeOfDay {
  const hour = randInt(rng, 0, 23);
  const step = PRECISION_STEP_MINUTES[precision];
  const steps = 60 / step;
  const minute = randInt(rng, 0, steps - 1) * step;
  const second = precision === 'second' ? randInt(rng, 0, 59) : 0;
  return { hour, minute, second };
}

export function formatTime12(t: TimeOfDay, opts: { seconds?: boolean } = {}): string {
  const period = t.hour < 12 ? 'AM' : 'PM';
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const mm = String(t.minute).padStart(2, '0');
  const base = opts.seconds ? `${hour12}:${mm}:${String(t.second).padStart(2, '0')}` : `${hour12}:${mm}`;
  return `${base} ${period}`;
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
  'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine',
];

function hourWord(hour24: number): string {
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return NUMBER_WORDS[h12];
}

export function describeTime(t: TimeOfDay): string {
  const { hour, minute } = t;
  const nextHour = (hour + 1) % 24;
  if (minute === 0) return `${hourWord(hour)} o'clock`;
  if (minute === 15) return `quarter past ${hourWord(hour)}`;
  if (minute === 30) return `half past ${hourWord(hour)}`;
  if (minute === 45) return `quarter to ${hourWord(nextHour)}`;
  if (minute < 30) return `${NUMBER_WORDS[minute]} past ${hourWord(hour)}`;
  return `${NUMBER_WORDS[60 - minute]} to ${hourWord(nextHour)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/timeMath.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/timeMath.ts src/engine/timeMath.test.ts
git commit -m "Add time generation, 12-hour formatting, and natural-language description"
```

---

## Task 3: Date generation and formatting (`src/engine/dateMath.ts`)

**Files:**
- Create: `src/engine/dateMath.ts`
- Test: `src/engine/dateMath.test.ts`

**Interfaces:**
- Consumes: `Rng`, `randInt` from `./rng` (Task 1); `addDays`, `addWeeks`, `addMonths`, `format` from `date-fns`.
- Produces: `randomDate(rng: Rng, start: Date, end: Date): Date`, `formatDateLong(d: Date): string` (e.g. `"November 21, 2026"`), `type DateOffsetUnit = 'day' | 'week' | 'month'`, `offsetDate(d: Date, amount: number, unit: DateOffsetUnit): Date`.

- [ ] **Step 1: Add the date-fns dependency**

Run: `pnpm add date-fns`

- [ ] **Step 2: Write the failing tests**

Create `src/engine/dateMath.test.ts`. Note every `Date` in this file is built with the local-time constructor (`new Date(year, monthIndex, day)`), never a parsed ISO string:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { formatDateLong, offsetDate, randomDate } from './dateMath';

describe('randomDate', () => {
  it('stays within the inclusive range', () => {
    const rng = mulberry32(1);
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 10);
    for (let i = 0; i < 50; i++) {
      const d = randomDate(rng, start, end);
      expect(d.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(d.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  });

  it('is deterministic for a given seed', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    expect(randomDate(mulberry32(7), start, end)).toEqual(randomDate(mulberry32(7), start, end));
  });

  it('returns the single valid date when start equals end', () => {
    const only = new Date(2026, 5, 15);
    expect(randomDate(mulberry32(1), only, only)).toEqual(only);
  });

  it('throws when end is before start', () => {
    const start = new Date(2026, 5, 15);
    const end = new Date(2026, 5, 1);
    expect(() => randomDate(mulberry32(1), start, end)).toThrow();
  });
});

describe('formatDateLong', () => {
  it('formats a single-digit day', () => {
    expect(formatDateLong(new Date(2026, 10, 5))).toBe('November 5, 2026');
  });

  it('formats a double-digit day', () => {
    expect(formatDateLong(new Date(2026, 10, 21))).toBe('November 21, 2026');
  });

  it('formats January correctly (month index 0)', () => {
    expect(formatDateLong(new Date(2026, 0, 1))).toBe('January 1, 2026');
  });
});

describe('offsetDate', () => {
  it('offsets by days', () => {
    expect(offsetDate(new Date(2026, 0, 1), 5, 'day')).toEqual(new Date(2026, 0, 6));
  });

  it('offsets by weeks', () => {
    expect(offsetDate(new Date(2026, 0, 1), 2, 'week')).toEqual(new Date(2026, 0, 15));
  });

  it('offsets by months', () => {
    expect(offsetDate(new Date(2026, 0, 15), 1, 'month')).toEqual(new Date(2026, 1, 15));
  });

  it('clamps at month end when the target month is shorter', () => {
    // Jan 31 + 1 month -> Feb has only 28 days in 2026 (not a leap year)
    expect(offsetDate(new Date(2026, 0, 31), 1, 'month')).toEqual(new Date(2026, 1, 28));
  });

  it('handles negative offsets', () => {
    expect(offsetDate(new Date(2026, 0, 10), -5, 'day')).toEqual(new Date(2026, 0, 5));
  });

  it('crosses a leap day correctly', () => {
    // 2028 is a leap year
    expect(offsetDate(new Date(2028, 1, 28), 1, 'day')).toEqual(new Date(2028, 1, 29));
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/dateMath.test.ts`
Expected: FAIL — `Cannot find module './dateMath'`.

- [ ] **Step 4: Implement**

Create `src/engine/dateMath.ts`:

```ts
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { randInt, type Rng } from './rng';

export function randomDate(rng: Rng, start: Date, end: Date): Date {
  if (end.getTime() < start.getTime()) {
    throw new Error('randomDate: end must not be before start');
  }
  const spanDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  const offset = randInt(rng, 0, spanDays);
  return addDays(start, offset);
}

export function formatDateLong(d: Date): string {
  return format(d, 'MMMM d, yyyy');
}

export type DateOffsetUnit = 'day' | 'week' | 'month';

export function offsetDate(d: Date, amount: number, unit: DateOffsetUnit): Date {
  switch (unit) {
    case 'day':
      return addDays(d, amount);
    case 'week':
      return addWeeks(d, amount);
    case 'month':
      return addMonths(d, amount);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/dateMath.test.ts`
Expected: all tests PASS. If the month-end clamping test fails, check the installed `date-fns` version's `addMonths` behavior — it should clamp (Jan 31 + 1 month = Feb 28/29), which is standard `date-fns` behavior; if the installed version differs, adjust the test to match actual (documented) behavior rather than working around it silently.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/engine/dateMath.ts src/engine/dateMath.test.ts
git commit -m "Add date generation, long-form formatting, and offset arithmetic"
```

---

## Task 4: Difficulty profile (`src/engine/difficulty.ts`)

**Files:**
- Create: `src/engine/difficulty.ts`
- Test: `src/engine/difficulty.test.ts`

**Interfaces:**
- Consumes: `TimePrecision` from `./timeMath` (Task 2).
- Produces: `type AnswerMode = 'choice' | 'interactive' | 'free'`, `type DateSpan = 'withinMonth' | 'acrossMonths' | 'acrossYears'`, `interface DifficultyProfile { level: number; timePrecisionWeights: Record<TimePrecision, number>; timerMs: number; answerModeWeights: Record<AnswerMode, number>; dateSpan: DateSpan; hour24: boolean }`, `difficultyProfile(level: number): DifficultyProfile`. M1b's generators and the future climb/UI code call `difficultyProfile` to get all difficulty-dependent parameters from a single source.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/difficulty.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { difficultyProfile } from './difficulty';

describe('difficultyProfile', () => {
  it('D1 is almost entirely hour precision, slow timer, mostly multiple choice', () => {
    const p = difficultyProfile(1);
    expect(p.level).toBe(1);
    expect(p.timePrecisionWeights.hour).toBeGreaterThan(0);
    expect(p.timePrecisionWeights.second).toBe(0);
    expect(p.timerMs).toBe(20000);
    expect(p.answerModeWeights.choice).toBeGreaterThan(p.answerModeWeights.interactive);
    expect(p.answerModeWeights.choice).toBeGreaterThan(p.answerModeWeights.free);
    expect(p.dateSpan).toBe('withinMonth');
    expect(p.hour24).toBe(false);
  });

  it('D5 weights five-minute precision most heavily', () => {
    const p = difficultyProfile(5);
    const weights = p.timePrecisionWeights;
    const maxWeight = Math.max(weights.hour, weights.half, weights.quarter, weights.five, weights.minute, weights.second);
    expect(weights.five).toBe(maxWeight);
  });

  it('D9 and D10 include nonzero second precision', () => {
    expect(difficultyProfile(9).timePrecisionWeights.second).toBeGreaterThan(0);
    expect(difficultyProfile(10).timePrecisionWeights.second).toBeGreaterThan(0);
  });

  it('D10 has the fastest timer', () => {
    expect(difficultyProfile(10).timerMs).toBe(7000);
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

  it('maps date span to the spec\'s three bands', () => {
    for (const d of [1, 2, 3]) expect(difficultyProfile(d).dateSpan).toBe('withinMonth');
    for (const d of [4, 5, 6, 7]) expect(difficultyProfile(d).dateSpan).toBe('acrossMonths');
    for (const d of [8, 9, 10]) expect(difficultyProfile(d).dateSpan).toBe('acrossYears');
  });

  it('enables 24-hour clock only at D8 and above', () => {
    for (const d of [1, 2, 3, 4, 5, 6, 7]) expect(difficultyProfile(d).hour24).toBe(false);
    for (const d of [8, 9, 10]) expect(difficultyProfile(d).hour24).toBe(true);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/difficulty.test.ts`
Expected: FAIL — `Cannot find module './difficulty'`.

- [ ] **Step 3: Implement**

Create `src/engine/difficulty.ts`:

```ts
import type { TimePrecision } from './timeMath';

export type AnswerMode = 'choice' | 'interactive' | 'free';
export type DateSpan = 'withinMonth' | 'acrossMonths' | 'acrossYears';

export interface DifficultyProfile {
  level: number;
  timePrecisionWeights: Record<TimePrecision, number>;
  timerMs: number;
  answerModeWeights: Record<AnswerMode, number>;
  dateSpan: DateSpan;
  hour24: boolean;
}

interface DifficultyRow {
  timePrecisionWeights: Record<TimePrecision, number>;
  timerMs: number;
  answerModeWeights: Record<AnswerMode, number>;
  dateSpan: DateSpan;
  hour24: boolean;
}

// One row per difficulty level 1-10. Values are hand-tuned to match the
// spec's qualitative bands exactly (see this plan's Global Constraints),
// not derived from a formula, so each row can be adjusted independently
// during playtesting without touching a curve.
const TABLE: DifficultyRow[] = [
  {
    timePrecisionWeights: { hour: 10, half: 0, quarter: 0, five: 0, minute: 0, second: 0 },
    timerMs: 20000,
    answerModeWeights: { choice: 10, interactive: 0, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 7, half: 3, quarter: 0, five: 0, minute: 0, second: 0 },
    timerMs: 18500,
    answerModeWeights: { choice: 10, interactive: 0, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 3, half: 6, quarter: 1, five: 0, minute: 0, second: 0 },
    timerMs: 17000,
    answerModeWeights: { choice: 9, interactive: 1, free: 0 },
    dateSpan: 'withinMonth',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 1, half: 4, quarter: 4, five: 1, minute: 0, second: 0 },
    timerMs: 15500,
    answerModeWeights: { choice: 7, interactive: 3, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 2, quarter: 3, five: 5, minute: 0, second: 0 },
    timerMs: 14000,
    answerModeWeights: { choice: 6, interactive: 4, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 1, quarter: 2, five: 6, minute: 1, second: 0 },
    timerMs: 12500,
    answerModeWeights: { choice: 5, interactive: 5, free: 0 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 1, five: 5, minute: 4, second: 0 },
    timerMs: 11000,
    answerModeWeights: { choice: 4, interactive: 5, free: 1 },
    dateSpan: 'acrossMonths',
    hour24: false,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 3, minute: 6, second: 1 },
    timerMs: 9500,
    answerModeWeights: { choice: 2, interactive: 5, free: 3 },
    dateSpan: 'acrossYears',
    hour24: true,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 1, minute: 6, second: 3 },
    timerMs: 8000,
    answerModeWeights: { choice: 1, interactive: 4, free: 5 },
    dateSpan: 'acrossYears',
    hour24: true,
  },
  {
    timePrecisionWeights: { hour: 0, half: 0, quarter: 0, five: 0, minute: 4, second: 6 },
    timerMs: 7000,
    answerModeWeights: { choice: 1, interactive: 3, free: 6 },
    dateSpan: 'acrossYears',
    hour24: true,
  },
];

export function difficultyProfile(level: number): DifficultyProfile {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  return { level: clamped, ...TABLE[clamped - 1] };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/difficulty.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/difficulty.ts src/engine/difficulty.test.ts
git commit -m "Add difficulty-to-parameters lookup table"
```

---

## Task 5: Peak definitions (`src/engine/peaks.ts`)

**Files:**
- Create: `src/engine/peaks.ts`
- Test: `src/engine/peaks.test.ts`

**Interfaces:**
- Produces: `interface Peak { id: number; name: string; emphasis: string; height: number }`, `PEAKS: readonly Peak[]` (10 entries, ids 1–10 in order), `getPeak(id: number): Peak` (throws for an invalid id). M1b's registry imports `Peak` and `PEAKS`; `climb.ts` (Task 6 of this plan) imports `Peak`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/peaks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPeak, PEAKS } from './peaks';

describe('PEAKS', () => {
  it('has exactly 10 peaks with ids 1 through 10 in order', () => {
    expect(PEAKS).toHaveLength(10);
    expect(PEAKS.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('has heights rising from 20 at Peak 1 to 30 at Peak 10', () => {
    expect(PEAKS.map((p) => p.height)).toEqual([20, 21, 22, 23, 24, 26, 27, 28, 29, 30]);
  });

  it('gives every peak a non-empty name and emphasis', () => {
    for (const peak of PEAKS) {
      expect(peak.name.length).toBeGreaterThan(0);
      expect(peak.emphasis.length).toBeGreaterThan(0);
    }
  });
});

describe('getPeak', () => {
  it('returns the peak with the matching id', () => {
    expect(getPeak(1).name).toBe('Basecamp Bluff');
    expect(getPeak(10).name).toBe('Summit of Hours');
  });

  it('throws for an id that does not exist', () => {
    expect(() => getPeak(0)).toThrow();
    expect(() => getPeak(11)).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/peaks.test.ts`
Expected: FAIL — `Cannot find module './peaks'`.

- [ ] **Step 3: Implement**

Create `src/engine/peaks.ts`:

```ts
export interface Peak {
  id: number;
  name: string;
  emphasis: string;
  height: number;
}

export const PEAKS: readonly Peak[] = [
  { id: 1, name: 'Basecamp Bluff', emphasis: 'Reading analog clocks', height: 20 },
  { id: 2, name: 'Sundial Spire', emphasis: 'Time in words, like "quarter past"', height: 21 },
  { id: 3, name: 'Calendar Ridge', emphasis: 'Reading calendars and dates', height: 22 },
  { id: 4, name: 'The Hourglass', emphasis: 'Setting clock hands', height: 23 },
  { id: 5, name: 'Weekday Wall', emphasis: 'Days of the week, nth weekday', height: 24 },
  { id: 6, name: 'Elapsed Escarpment', emphasis: 'Elapsed time arithmetic', height: 26 },
  { id: 7, name: 'Monthfall Pass', emphasis: 'Date math across months', height: 27 },
  { id: 8, name: 'The Meridian', emphasis: 'AM/PM and 24-hour time', height: 28 },
  { id: 9, name: 'Leap Crag', emphasis: 'Leap years and long spans', height: 29 },
  { id: 10, name: 'Summit of Hours', emphasis: 'Everything, mixed', height: 30 },
];

export function getPeak(id: number): Peak {
  const peak = PEAKS.find((p) => p.id === id);
  if (!peak) throw new Error(`getPeak: no peak with id ${id}`);
  return peak;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/peaks.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/peaks.ts src/engine/peaks.test.ts
git commit -m "Add the ten peak definitions"
```

---

## Task 6: Climb state machine (`src/engine/climb.ts`)

**Files:**
- Create: `src/engine/climb.ts`
- Test: `src/engine/climb.test.ts`

**Interfaces:**
- Consumes: `Peak` from `./peaks` (Task 5).
- Produces: `type ClimbStatus = 'climbing' | 'summited' | 'fell'`, `interface ClimbState { peakId: number; height: number; position: number; boost: number; boostCapacity: number; fallRisk: number; fallRiskCapacity: number; status: ClimbStatus }`, `createClimb(peak: Peak, difficulty: number): ClimbState`, `applyCorrect(state: ClimbState, fast: boolean): ClimbState`, `applyMiss(state: ClimbState): ClimbState`. Both reducers return a new state object (never mutate the input) and are no-ops once `status !== 'climbing'`. This is the state machine the UI (a later milestone) drives directly.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/climb.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyCorrect, applyMiss, createClimb } from './climb';
import { getPeak } from './peaks';

const peak1 = getPeak(1); // height 20

describe('createClimb', () => {
  it('starts at position 0, no boost, no fall risk, climbing', () => {
    const state = createClimb(peak1, 5);
    expect(state.position).toBe(0);
    expect(state.boost).toBe(0);
    expect(state.fallRisk).toBe(0);
    expect(state.status).toBe('climbing');
    expect(state.height).toBe(20);
    expect(state.boostCapacity).toBe(5);
  });

  it('sets fall-risk capacity to 5 for difficulty 1-3', () => {
    expect(createClimb(peak1, 1).fallRiskCapacity).toBe(5);
    expect(createClimb(peak1, 3).fallRiskCapacity).toBe(5);
  });

  it('sets fall-risk capacity to 4 for difficulty 4-7', () => {
    expect(createClimb(peak1, 4).fallRiskCapacity).toBe(4);
    expect(createClimb(peak1, 7).fallRiskCapacity).toBe(4);
  });

  it('sets fall-risk capacity to 3 for difficulty 8-10', () => {
    expect(createClimb(peak1, 8).fallRiskCapacity).toBe(3);
    expect(createClimb(peak1, 10).fallRiskCapacity).toBe(3);
  });
});

describe('applyCorrect', () => {
  it('advances by 1 step when not boosted', () => {
    const state = applyCorrect(createClimb(peak1, 5), false);
    expect(state.position).toBe(1);
  });

  it('increments boost by 1 on a normal-speed correct answer', () => {
    const state = applyCorrect(createClimb(peak1, 5), false);
    expect(state.boost).toBe(1);
  });

  it('increments boost by 2 on a fast correct answer', () => {
    const state = applyCorrect(createClimb(peak1, 5), true);
    expect(state.boost).toBe(2);
  });

  it('clamps boost at capacity and does not overflow', () => {
    let state = createClimb(peak1, 5);
    for (let i = 0; i < 5; i++) state = applyCorrect(state, true); // +2 each, would overflow to 10
    expect(state.boost).toBe(5);
  });

  it('doubles step gain once boost reaches capacity', () => {
    let state = createClimb(peak1, 5);
    // Fill boost to capacity (5) with fast answers: +2,+2,+2,+2,+2 -> clamps at 5 on the 3rd
    state = applyCorrect(state, true); // boost 2, pos 1
    state = applyCorrect(state, true); // boost 4, pos 2
    state = applyCorrect(state, true); // boost capped at 5, pos 3 (still normal speed this answer, since boost was 4 before it)
    expect(state.boost).toBe(5);
    const beforeBoostedStep = state.position;
    state = applyCorrect(state, false); // boost was already at capacity -> this step is worth 2
    expect(state.position).toBe(beforeBoostedStep + 2);
  });

  it('reaches summited exactly at height and clamps position there', () => {
    let state = createClimb(peak1, 5); // height 20
    for (let i = 0; i < 20; i++) state = applyCorrect(state, false);
    expect(state.status).toBe('summited');
    expect(state.position).toBe(20);
    const beforeExtra = state;
    state = applyCorrect(state, false);
    expect(state).toEqual(beforeExtra); // no-op once summited
  });
});

describe('applyMiss', () => {
  it('decrements position by 1, floored at 0', () => {
    let state = createClimb(peak1, 5);
    state = applyCorrect(state, false); // position 1
    state = applyMiss(state);
    expect(state.position).toBe(0);
    state = applyMiss(state);
    expect(state.position).toBe(0); // floored, not negative
  });

  it('resets boost to 0 immediately, even if it was at capacity', () => {
    let state = createClimb(peak1, 5);
    for (let i = 0; i < 5; i++) state = applyCorrect(state, true);
    expect(state.boost).toBe(5);
    state = applyMiss(state);
    expect(state.boost).toBe(0);
  });

  it('increments fall risk on each miss up to capacity', () => {
    let state = createClimb(peak1, 1); // fallRiskCapacity 5
    for (let i = 0; i < 5; i++) {
      state = applyMiss(state);
      expect(state.status).toBe('climbing');
    }
    expect(state.fallRisk).toBe(5);
  });

  it('falls on the miss after fall risk reaches capacity (capacity + 1 total misses)', () => {
    let state = createClimb(peak1, 1); // fallRiskCapacity 5, so 6 misses fall
    for (let i = 0; i < 5; i++) state = applyMiss(state);
    expect(state.status).toBe('climbing');
    state = applyMiss(state); // 6th miss
    expect(state.status).toBe('fell');
  });

  it('allows exactly 4 misses at difficulty 4-7 before falling on the 5th', () => {
    let state = createClimb(peak1, 5); // fallRiskCapacity 4
    for (let i = 0; i < 4; i++) state = applyMiss(state);
    expect(state.status).toBe('climbing');
    state = applyMiss(state);
    expect(state.status).toBe('fell');
  });

  it('allows exactly 3 misses at difficulty 8-10 before falling on the 4th', () => {
    let state = createClimb(peak1, 8); // fallRiskCapacity 3
    for (let i = 0; i < 3; i++) state = applyMiss(state);
    expect(state.status).toBe('climbing');
    state = applyMiss(state);
    expect(state.status).toBe('fell');
  });

  it('is a no-op once fallen', () => {
    let state = createClimb(peak1, 1);
    for (let i = 0; i < 6; i++) state = applyMiss(state);
    expect(state.status).toBe('fell');
    const fallen = state;
    state = applyMiss(state);
    expect(state).toEqual(fallen);
    state = applyCorrect(state, true);
    expect(state).toEqual(fallen);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/climb.test.ts`
Expected: FAIL — `Cannot find module './climb'`.

- [ ] **Step 3: Implement**

Create `src/engine/climb.ts`:

```ts
import type { Peak } from './peaks';

export type ClimbStatus = 'climbing' | 'summited' | 'fell';

export interface ClimbState {
  peakId: number;
  height: number;
  position: number;
  boost: number;
  boostCapacity: number;
  fallRisk: number;
  fallRiskCapacity: number;
  status: ClimbStatus;
}

const BOOST_CAPACITY = 5;

function fallRiskCapacityForDifficulty(difficulty: number): number {
  if (difficulty <= 3) return 5;
  if (difficulty <= 7) return 4;
  return 3;
}

export function createClimb(peak: Peak, difficulty: number): ClimbState {
  return {
    peakId: peak.id,
    height: peak.height,
    position: 0,
    boost: 0,
    boostCapacity: BOOST_CAPACITY,
    fallRisk: 0,
    fallRiskCapacity: fallRiskCapacityForDifficulty(difficulty),
    status: 'climbing',
  };
}

export function applyCorrect(state: ClimbState, fast: boolean): ClimbState {
  if (state.status !== 'climbing') return state;
  const speedMultiplier = state.boost >= state.boostCapacity ? 2 : 1;
  const position = Math.min(state.height, state.position + speedMultiplier);
  const boost = Math.min(state.boostCapacity, state.boost + (fast ? 2 : 1));
  const status: ClimbStatus = position >= state.height ? 'summited' : 'climbing';
  return { ...state, position, boost, status };
}

export function applyMiss(state: ClimbState): ClimbState {
  if (state.status !== 'climbing') return state;
  if (state.fallRisk >= state.fallRiskCapacity) {
    return { ...state, status: 'fell' };
  }
  return {
    ...state,
    position: Math.max(0, state.position - 1),
    boost: 0,
    fallRisk: state.fallRisk + 1,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/climb.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/climb.ts src/engine/climb.test.ts
git commit -m "Add the climb state machine (boost, fall risk, summit, fall)"
```

---

## Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full local check suite**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Expected: all pass. `pnpm test` should now show 6 engine test files plus the 2 pre-existing ones (`src/App.test.tsx`, `scripts/pixelIcon.test.ts`) — 8 test files total.

- [ ] **Step 2: Confirm zero DOM/React imports in the engine**

Run: `grep -rn "from 'react'\|from \"react\"\|document\.\|window\." src/engine/`
Expected: no matches. If any file under `src/engine/` imports React or touches `document`/`window`, that's a Global Constraint violation — fix before considering this plan done.

---

## Post-M1a

This plan produces no user-visible change (no UI wiring) — it's the pure-function foundation. M1b (question types, registry, and the first four generators) builds directly on top of `rng.ts`, `timeMath.ts`, `dateMath.ts`, `difficulty.ts`, and `peaks.ts`. M1c (the `/debug/questions` dev page) builds on M1b. Both get their own plans.
