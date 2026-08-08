# M1b — Question Registry and First Four Generators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the project's key extension point — the `Question` interface, the generator registry, and the first four question generators (read-analog MC, describe-time MC, read-calendar MC, offset-date MC) — and lock their correctness down with the generator contract test the spec calls the highest-value test in the whole project.

**Architecture:** Everything lands under `src/engine/questions/`, still pure TypeScript with zero DOM. `types.ts` holds the data shapes only. `support.ts` holds the small pure helpers every generator shares (precision picking, near-miss time pools, distinct-option assembly). `registry.ts` is a module-level `typeId -> QuestionType` map with a uniform-random selector. Each generator is one file exporting a pure `(rng, ctx) => Question` function plus a `QuestionType` record. `index.ts` is the barrel that registers the four built-ins — **application code and tests must import the registry through `src/engine/questions/index.ts`, never `registry.ts` directly**, or the built-ins will not be registered.

**Tech Stack:** TypeScript (existing strict config), Vitest (existing), `date-fns@^4` (already added by M1a Task 3, consumed indirectly through `src/engine/dateMath.ts`).

## Global Constraints

- Pure TypeScript, zero DOM/React imports anywhere under `src/engine/` (from the spec's Architecture section: "pure TS — no DOM, no React"). This whole plan is `src/engine/questions/`.
- **A wrongly-graded question is the single worst bug class in this project.** From the spec's Testing section: the contract test "catches the entire class of 'the game marked her right answer wrong' bugs, which is the one failure mode that would make her stop trusting the game." Every design decision below that looks paranoid — no AM/PM on analog-clock options, distinct-candidate pools instead of ad-hoc distractors, `buildChoiceAnswer` throwing rather than emitting a duplicate — exists to serve that constraint. Task 9's contract test is not optional polish; it is the point of this milestone.
- **Do not modify any file created by M1a** (`src/engine/rng.ts`, `timeMath.ts`, `dateMath.ts`, `difficulty.ts`, `peaks.ts`, `climb.ts`) or their tests. M1a is being implemented in parallel on its own branch; editing those files here would conflict. If a helper is missing, add it to `src/engine/questions/support.ts` instead.
- All randomness flows through an explicit `Rng` parameter. No `Math.random()`, no `Date.now()`, no zero-argument `new Date()` anywhere in a generator — generators are pure functions of `(rng, ctx)` so the contract test can replay any failure from its seed.
- Construct `Date` objects via the local-time constructor (`new Date(year, monthIndex, day)`), never by parsing a bare `'YYYY-MM-DD'` string.
- Multiple-choice options are always **distinct strings**, and no distractor may be a correct-but-differently-worded answer. In particular, an analog clock face cannot show AM/PM, so analog-clock options never carry AM/PM (see `formatClockFace` in Task 2).
- Formatting/lint: 2-space indent, single quotes, semicolons, trailing commas, 100-column print width (matches `.prettierrc.json`). `verbatimModuleSyntax` is on, so type-only imports must use `import type`.

---

## Task 1: Question, display, and answer types (`src/engine/questions/types.ts`)

**Files:**
- Create: `src/engine/questions/types.ts`
- Test: `src/engine/questions/types.test.ts`

**Interfaces:**
- Consumes: `Peak` from `../peaks` (M1a Task 5), `Rng` from `../rng` (M1a Task 1), `TimeOfDay` from `../timeMath` (M1a Task 2).
- Produces: `interface AnalogClockDisplay { kind: 'analogClock'; time: TimeOfDay; showSeconds: boolean }`, `interface CalendarDisplay { kind: 'calendar'; year: number; monthIndex: number; highlightDay: number }`, `interface NoDisplay { kind: 'none' }`, `type DisplaySpec = AnalogClockDisplay | CalendarDisplay | NoDisplay`, `interface ChoiceAnswer { kind: 'choice'; options: string[]; correctIndex: number }`, `type AnswerSpec = ChoiceAnswer`, `interface Question { id: string; typeId: string; prompt: string; display: DisplaySpec; answer: AnswerSpec; timeLimitMs: number; explainCorrect: string }`, `interface GeneratorContext { difficulty: number; peak: Peak }`, `type QuestionGenerator = (rng: Rng, ctx: GeneratorContext) => Question`, `interface QuestionType { typeId: string; generate: QuestionGenerator }`, `isCorrectChoice(answer: ChoiceAnswer, selectedIndex: number): boolean`. Every other task in this plan, and all of M1c, imports from this file (via the barrel).

- [ ] **Step 1: Write the failing test**

Create `src/engine/questions/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isCorrectChoice, type ChoiceAnswer } from './types';

const answer: ChoiceAnswer = {
  kind: 'choice',
  options: ['3:00', '4:00', '5:00', '6:00'],
  correctIndex: 2,
};

describe('isCorrectChoice', () => {
  it('accepts the declared correct index', () => {
    expect(isCorrectChoice(answer, 2)).toBe(true);
  });

  it('rejects every other option index', () => {
    expect(isCorrectChoice(answer, 0)).toBe(false);
    expect(isCorrectChoice(answer, 1)).toBe(false);
    expect(isCorrectChoice(answer, 3)).toBe(false);
  });

  it('rejects indexes outside the option list', () => {
    expect(isCorrectChoice(answer, -1)).toBe(false);
    expect(isCorrectChoice(answer, 4)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/engine/questions/types.test.ts`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/types.ts`:

```ts
import type { Peak } from '../peaks';
import type { Rng } from '../rng';
import type { TimeOfDay } from '../timeMath';

/** An analog clock face set to `time`. `showSeconds` drives the second hand. */
export interface AnalogClockDisplay {
  kind: 'analogClock';
  time: TimeOfDay;
  showSeconds: boolean;
}

/** A month grid (weeks start Sunday) with exactly one day cell highlighted. */
export interface CalendarDisplay {
  kind: 'calendar';
  year: number;
  /** 0 = January, matching `Date.prototype.getMonth()`. */
  monthIndex: number;
  /** 1-based day of month; always a day that exists in this month. */
  highlightDay: number;
}

/**
 * No visual aid — `prompt` carries everything the player needs.
 * Modelled as a union member rather than making `Question.display` optional so
 * every renderer can exhaustively `switch` on `display.kind` with no null check.
 */
export interface NoDisplay {
  kind: 'none';
}

export type DisplaySpec = AnalogClockDisplay | CalendarDisplay | NoDisplay;

/**
 * Multiple choice. `options` are display-ready strings and `correctIndex` is the
 * only grading data required, so the spec grades itself — nothing outside the
 * `AnswerSpec` needs to be consulted to mark an answer.
 *
 * Convention for the answer kinds later milestones add (setHands, pickDate,
 * number): each new union member carries its own grading data inline — a target
 * `TimeOfDay`, a target `Date`, a numeric answer plus tolerance — and gets its
 * own `isCorrect*` helper next to `isCorrectChoice` below. `Question` itself
 * never changes shape to accommodate them.
 */
export interface ChoiceAnswer {
  kind: 'choice';
  options: string[];
  correctIndex: number;
}

export type AnswerSpec = ChoiceAnswer;

export interface Question {
  /** Unique-per-generation id, prefixed with `typeId`. Usable as a React key. */
  id: string;
  typeId: string;
  prompt: string;
  display: DisplaySpec;
  answer: AnswerSpec;
  timeLimitMs: number;
  /** Shown during the ~1.5s reveal after an answer. */
  explainCorrect: string;
}

/** Everything a generator is allowed to know about the current climb. */
export interface GeneratorContext {
  difficulty: number;
  peak: Peak;
}

export type QuestionGenerator = (rng: Rng, ctx: GeneratorContext) => Question;

export interface QuestionType {
  typeId: string;
  generate: QuestionGenerator;
}

/** Grades a multiple-choice answer. See the `ChoiceAnswer` doc comment. */
export function isCorrectChoice(answer: ChoiceAnswer, selectedIndex: number): boolean {
  return selectedIndex === answer.correctIndex;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/engine/questions/types.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/types.ts src/engine/questions/types.test.ts
git commit -m "Add Question, DisplaySpec, and AnswerSpec types"
```

---

## Task 2: Shared generator helpers (`src/engine/questions/support.ts`)

**Files:**
- Create: `src/engine/questions/support.ts`
- Test: `src/engine/questions/support.test.ts`

**Interfaces:**
- Consumes: `Rng`, `shuffle`, `weightedPick` from `../rng`; `TimeOfDay`, `TimePrecision` from `../timeMath`; `DateSpan`, `DifficultyProfile` from `../difficulty`; `randomDate` from `../dateMath`; `ChoiceAnswer` from `./types`.
- Produces: `OPTION_COUNT: 4`, `PRECISIONS: readonly TimePrecision[]`, `pickPrecision(rng: Rng, profile: DifficultyProfile): TimePrecision`, `formatClockFace(t: TimeOfDay, showSeconds: boolean): string`, `shiftTime(t: TimeOfDay, deltaSeconds: number): TimeOfDay`, `distractorTimes(t: TimeOfDay, precision: TimePrecision): TimeOfDay[]`, `WEEKDAY_NAMES: readonly string[]`, `weekdayName(d: Date): string`, `dateRangeForSpan(span: DateSpan): { start: Date; end: Date }`, `randomQuestionDate(rng: Rng, span: DateSpan): Date`, `buildChoiceAnswer(rng: Rng, correct: string, candidates: readonly string[], optionCount?: number): ChoiceAnswer`, `makeQuestionId(rng: Rng, typeId: string): string`. Tasks 4–7 and Task 9 import from here.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/questions/support.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/questions/support.test.ts`
Expected: FAIL — `Cannot find module './support'`.

Note for the implementer: the two weekday assertions above (2026-11-21 = Saturday, 2026-01-01 = Thursday) are hand-computed. If either disagrees with the runtime, trust the runtime and fix the test constant — do not "fix" `weekdayName`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/support.ts`:

```ts
import { randomDate } from '../dateMath';
import type { DateSpan, DifficultyProfile } from '../difficulty';
import { shuffle, weightedPick, type Rng } from '../rng';
import type { TimeOfDay, TimePrecision } from '../timeMath';
import type { ChoiceAnswer } from './types';

/** Every multiple-choice question offers this many options. */
export const OPTION_COUNT = 4;

export const PRECISIONS: readonly TimePrecision[] = [
  'hour',
  'half',
  'quarter',
  'five',
  'minute',
  'second',
];

/**
 * Draws a time precision from the difficulty profile's weighted distribution.
 * Zero-weight precisions are filtered out first; every row of the difficulty
 * table has at least one positive weight, so this never sees an empty list.
 */
export function pickPrecision(rng: Rng, profile: DifficultyProfile): TimePrecision {
  const items = PRECISIONS.filter((p) => profile.timePrecisionWeights[p] > 0).map((p) => ({
    value: p,
    weight: profile.timePrecisionWeights[p],
  }));
  return weightedPick(rng, items);
}

/**
 * "3:05", or "9:07:04" when the question is about seconds.
 *
 * Deliberately carries no AM/PM: an analog clock face cannot show it, so an
 * option list containing both "3:15 AM" and "3:15 PM" would offer two answers
 * the player cannot tell apart, one of them marked wrong. AM/PM gets its own
 * question type on Peak 8 in a later milestone, not here.
 */
export function formatClockFace(t: TimeOfDay, showSeconds: boolean): string {
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const mm = String(t.minute).padStart(2, '0');
  if (!showSeconds) return `${hour12}:${mm}`;
  return `${hour12}:${mm}:${String(t.second).padStart(2, '0')}`;
}

const SECONDS_PER_DAY = 86_400;

/** Moves a time by `deltaSeconds`, wrapping around midnight in both directions. */
export function shiftTime(t: TimeOfDay, deltaSeconds: number): TimeOfDay {
  const raw = t.hour * 3600 + t.minute * 60 + t.second + deltaSeconds;
  const total = ((raw % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  return {
    hour: Math.floor(total / 3600),
    minute: Math.floor((total % 3600) / 60),
    second: total % 60,
  };
}

/**
 * How far apart near-miss times sit, per precision. Second-precision questions
 * step by 15s rather than 1s: a one-second difference is not a wrong answer a
 * child can distinguish, it is a coin flip.
 */
const DISTRACTOR_STEP_SECONDS: Record<TimePrecision, number> = {
  hour: 3600,
  half: 1800,
  quarter: 900,
  five: 300,
  minute: 60,
  second: 15,
};

const STEP_MULTIPLES = [1, -1, 2, -2, 3, -3, 4, -4];
const HOUR_MULTIPLES = [1, -1, 2, -2, 3, -3];

/**
 * A pool of plausible near-miss times: the same clock nudged by whole steps of
 * the question's precision, plus whole-hour misreadings (the classic "read the
 * hour hand off by one" error). Returned in a fixed order and never containing
 * `t` itself; `buildChoiceAnswer` de-duplicates and shuffles.
 */
export function distractorTimes(t: TimeOfDay, precision: TimePrecision): TimeOfDay[] {
  const step = DISTRACTOR_STEP_SECONDS[precision];
  const offsets = [...STEP_MULTIPLES.map((k) => k * step), ...HOUR_MULTIPLES.map((k) => k * 3600)];
  return offsets.map((delta) => shiftTime(t, delta));
}

/** Week starts Sunday, per the spec's Conventions row. Index matches `getDay()`. */
export const WEEKDAY_NAMES: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function weekdayName(d: Date): string {
  return WEEKDAY_NAMES[d.getDay()];
}

/**
 * The calendar window questions are drawn from, by difficulty band. Fixed years
 * (never "today") so a failing seed always reproduces. The wide band spans
 * 2024-2028 so it straddles the 2024 and 2028 leap years.
 */
export function dateRangeForSpan(span: DateSpan): { start: Date; end: Date } {
  switch (span) {
    case 'withinMonth':
    case 'acrossMonths':
      return { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };
    case 'acrossYears':
      return { start: new Date(2024, 0, 1), end: new Date(2028, 11, 31) };
  }
}

export function randomQuestionDate(rng: Rng, span: DateSpan): Date {
  const { start, end } = dateRangeForSpan(span);
  return randomDate(rng, start, end);
}

/**
 * Assembles a multiple-choice answer from an ordered candidate pool.
 *
 * Rather than rejection-sampling until the options happen to be distinct, the
 * caller hands over a pool it knows is large enough and this function takes the
 * first `optionCount - 1` *distinct* entries that are not the correct answer.
 * That makes a duplicate option, or a distractor that is secretly correct,
 * structurally impossible, and makes an undersized pool a loud, deterministic
 * crash that the contract test in Task 9 catches across every type, difficulty,
 * and seed rather than something a player discovers mid-climb.
 */
export function buildChoiceAnswer(
  rng: Rng,
  correct: string,
  candidates: readonly string[],
  optionCount: number = OPTION_COUNT,
): ChoiceAnswer {
  const seen = new Set<string>([correct]);
  const distinct: string[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    distinct.push(candidate);
  }
  if (distinct.length < optionCount - 1) {
    throw new Error(
      `buildChoiceAnswer: needed ${optionCount - 1} distinct distractors for ` +
        `"${correct}" but only got ${distinct.length}`,
    );
  }
  const chosen = shuffle(rng, distinct).slice(0, optionCount - 1);
  const options = shuffle(rng, [correct, ...chosen]);
  return { kind: 'choice', options, correctIndex: options.indexOf(correct) };
}

/** `"readAnalog-1f8x3k"` — stable for a seed, unique enough for a React key. */
export function makeQuestionId(rng: Rng, typeId: string): string {
  return `${typeId}-${Math.floor(rng() * 0xffff_ffff).toString(36)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/questions/support.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/support.ts src/engine/questions/support.test.ts
git commit -m "Add shared question-generator helpers"
```

---

## Task 3: Generator registry (`src/engine/questions/registry.ts`)

**Files:**
- Create: `src/engine/questions/registry.ts`
- Test: `src/engine/questions/registry.test.ts`

**Interfaces:**
- Consumes: `Rng`, `pick` from `../rng`; `GeneratorContext`, `Question`, `QuestionType` from `./types` (Task 1).
- Produces: `registerGenerator(type: QuestionType): void`, `getGenerator(typeId: string): QuestionType`, `hasGenerator(typeId: string): boolean`, `listGenerators(): QuestionType[]`, `resetGenerators(): void`, `selectGenerator(rng: Rng, ctx: GeneratorContext): QuestionType`, `generateQuestion(rng: Rng, ctx: GeneratorContext): Question`.

The registry ships with **no** generators registered — the four built-ins are registered by the barrel in Task 8. That is what keeps this task free of placeholder code: the tests below register fakes defined inside the test file, which are complete test doubles rather than stubs committed to `src/`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/questions/registry.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import {
  generateQuestion,
  getGenerator,
  hasGenerator,
  listGenerators,
  registerGenerator,
  resetGenerators,
  selectGenerator,
} from './registry';
import type { GeneratorContext, Question, QuestionType } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(1) };

function fakeType(typeId: string): QuestionType {
  return {
    typeId,
    generate: (_rng, generatorCtx): Question => ({
      id: `${typeId}-fixed`,
      typeId,
      prompt: `prompt for ${typeId} on peak ${generatorCtx.peak.id}`,
      display: { kind: 'none' },
      answer: { kind: 'choice', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
      timeLimitMs: 10_000,
      explainCorrect: 'because',
    }),
  };
}

beforeEach(() => {
  resetGenerators();
});

describe('registerGenerator', () => {
  it('makes a generator retrievable by typeId', () => {
    const type = fakeType('alpha');
    registerGenerator(type);
    expect(hasGenerator('alpha')).toBe(true);
    expect(getGenerator('alpha')).toBe(type);
  });

  it('rejects a duplicate typeId', () => {
    registerGenerator(fakeType('alpha'));
    expect(() => registerGenerator(fakeType('alpha'))).toThrow(/duplicate/);
  });
});

describe('getGenerator', () => {
  it('throws a named error for an unknown typeId', () => {
    expect(() => getGenerator('nope')).toThrow(/nope/);
  });
});

describe('listGenerators', () => {
  it('returns registrations in order', () => {
    registerGenerator(fakeType('alpha'));
    registerGenerator(fakeType('beta'));
    expect(listGenerators().map((t) => t.typeId)).toEqual(['alpha', 'beta']);
  });

  it('is empty before anything is registered', () => {
    expect(listGenerators()).toEqual([]);
  });
});

describe('selectGenerator', () => {
  it('throws when nothing is registered', () => {
    expect(() => selectGenerator(mulberry32(1), ctx)).toThrow(/no generators registered/);
  });

  it('only ever returns a registered generator', () => {
    registerGenerator(fakeType('alpha'));
    registerGenerator(fakeType('beta'));
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      expect(['alpha', 'beta']).toContain(selectGenerator(rng, ctx).typeId);
    }
  });

  it('spreads selection across all registered generators', () => {
    for (const id of ['alpha', 'beta', 'gamma', 'delta']) registerGenerator(fakeType(id));
    const rng = mulberry32(7);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(selectGenerator(rng, ctx).typeId);
    expect(seen.size).toBe(4);
  });

  it('is deterministic for a given seed', () => {
    for (const id of ['alpha', 'beta', 'gamma']) registerGenerator(fakeType(id));
    expect(selectGenerator(mulberry32(5), ctx).typeId).toBe(
      selectGenerator(mulberry32(5), ctx).typeId,
    );
  });
});

describe('generateQuestion', () => {
  it('delegates to the selected generator with the same context', () => {
    registerGenerator(fakeType('alpha'));
    const question = generateQuestion(mulberry32(1), ctx);
    expect(question.typeId).toBe('alpha');
    expect(question.prompt).toBe('prompt for alpha on peak 1');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/questions/registry.test.ts`
Expected: FAIL — `Cannot find module './registry'`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/registry.ts`:

```ts
import { pick, type Rng } from '../rng';
import type { GeneratorContext, Question, QuestionType } from './types';

const generators = new Map<string, QuestionType>();

export function registerGenerator(type: QuestionType): void {
  if (generators.has(type.typeId)) {
    throw new Error(`registerGenerator: duplicate typeId "${type.typeId}"`);
  }
  generators.set(type.typeId, type);
}

export function hasGenerator(typeId: string): boolean {
  return generators.has(typeId);
}

export function getGenerator(typeId: string): QuestionType {
  const type = generators.get(typeId);
  if (!type) throw new Error(`getGenerator: no generator registered for "${typeId}"`);
  return type;
}

/** Registered generators, in registration order. */
export function listGenerators(): QuestionType[] {
  return [...generators.values()];
}

/** Test-only: empties the registry so a test file can install its own fakes. */
export function resetGenerators(): void {
  generators.clear();
}

/**
 * Picks the generator for the next question.
 *
 * Selection is uniform across everything registered. Weighting by
 * `ctx.peak.emphasis` (so Calendar Ridge asks mostly calendar questions) and by
 * the difficulty profile's `answerModeWeights` is future work — it needs the
 * full generator set to be meaningful, and a uniform draw over the four M1b
 * generators is correct and sufficient until then.
 */
export function selectGenerator(rng: Rng, ctx: GeneratorContext): QuestionType {
  const types = listGenerators();
  if (types.length === 0) {
    throw new Error(
      `selectGenerator: no generators registered ` +
        `(peak ${ctx.peak.id}, difficulty ${ctx.difficulty}) — ` +
        `import from 'src/engine/questions' rather than 'src/engine/questions/registry'`,
    );
  }
  return pick(rng, types);
}

export function generateQuestion(rng: Rng, ctx: GeneratorContext): Question {
  return selectGenerator(rng, ctx).generate(rng, ctx);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/questions/registry.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/registry.ts src/engine/questions/registry.test.ts
git commit -m "Add question generator registry with uniform selection"
```

---

## Task 4: Read-analog generator (`src/engine/questions/readAnalog.ts`)

**Files:**
- Create: `src/engine/questions/readAnalog.ts`
- Test: `src/engine/questions/readAnalog.test.ts`

**Interfaces:**
- Consumes: `difficultyProfile` from `../difficulty`; `randomTime` from `../timeMath`; `Rng` from `../rng`; `buildChoiceAnswer`, `distractorTimes`, `formatClockFace`, `makeQuestionId`, `pickPrecision` from `./support` (Task 2); `GeneratorContext`, `Question`, `QuestionType` from `./types` (Task 1).
- Produces: `READ_ANALOG_TYPE_ID: 'readAnalog'`, `generateReadAnalog(rng: Rng, ctx: GeneratorContext): Question`, `readAnalogType: QuestionType`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/questions/readAnalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { generateReadAnalog, READ_ANALOG_TYPE_ID, readAnalogType } from './readAnalog';
import { formatClockFace } from './support';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(1) };

describe('generateReadAnalog', () => {
  it('shows an analog clock and asks for the time', () => {
    const q = generateReadAnalog(mulberry32(1), ctx);
    expect(q.typeId).toBe(READ_ANALOG_TYPE_ID);
    expect(q.display.kind).toBe('analogClock');
    expect(q.prompt).toBe('What time does the clock show?');
  });

  it('marks the option that matches the clock face as correct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadAnalog(mulberry32(seed), ctx);
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.answer.options[q.answer.correctIndex]).toBe(
        formatClockFace(q.display.time, q.display.showSeconds),
      );
    }
  });

  it('never offers AM or PM, which a clock face cannot show', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const option of generateReadAnalog(mulberry32(seed), ctx).answer.options) {
        expect(option).not.toMatch(/AM|PM/);
      }
    }
  });

  it('offers four distinct options', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { options } = generateReadAnalog(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
    }
  });

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateReadAnalog(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
  });

  it('only shows seconds when the question is about seconds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadAnalog(mulberry32(seed), { ...ctx, difficulty: 10 });
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      if (!q.display.showSeconds) expect(q.display.time.second).toBe(0);
    }
  });

  it('sticks to hour boundaries at difficulty 1', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadAnalog(mulberry32(seed), { ...ctx, difficulty: 1 });
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.display.time.minute).toBe(0);
      expect(q.display.time.second).toBe(0);
    }
  });

  it('explains the correct answer', () => {
    const q = generateReadAnalog(mulberry32(1), ctx);
    expect(q.explainCorrect).toContain(q.answer.options[q.answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateReadAnalog(mulberry32(42), ctx)).toEqual(generateReadAnalog(mulberry32(42), ctx));
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(readAnalogType.typeId).toBe(READ_ANALOG_TYPE_ID);
    expect(readAnalogType.generate(mulberry32(3), ctx).typeId).toBe(READ_ANALOG_TYPE_ID);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/questions/readAnalog.test.ts`
Expected: FAIL — `Cannot find module './readAnalog'`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/readAnalog.ts`:

```ts
import { difficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import { randomTime } from '../timeMath';
import {
  buildChoiceAnswer,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  pickPrecision,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const READ_ANALOG_TYPE_ID = 'readAnalog';

/** Peak 1's bread and butter: an analog face, four candidate readings. */
export function generateReadAnalog(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const precision = pickPrecision(rng, profile);
  const showSeconds = precision === 'second';
  const time = randomTime(rng, precision);
  const correct = formatClockFace(time, showSeconds);
  const candidates = distractorTimes(time, precision).map((t) => formatClockFace(t, showSeconds));
  return {
    id: makeQuestionId(rng, READ_ANALOG_TYPE_ID),
    typeId: READ_ANALOG_TYPE_ID,
    prompt: 'What time does the clock show?',
    display: { kind: 'analogClock', time, showSeconds },
    answer: buildChoiceAnswer(rng, correct, candidates),
    timeLimitMs: profile.timerMs,
    explainCorrect: `The clock shows ${correct}.`,
  };
}

export const readAnalogType: QuestionType = {
  typeId: READ_ANALOG_TYPE_ID,
  generate: generateReadAnalog,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/questions/readAnalog.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/readAnalog.ts src/engine/questions/readAnalog.test.ts
git commit -m "Add read-analog multiple-choice question generator"
```

---

## Task 5: Describe-time generator (`src/engine/questions/describeTime.ts`)

**Files:**
- Create: `src/engine/questions/describeTime.ts`
- Test: `src/engine/questions/describeTime.test.ts`

**Interfaces:**
- Consumes: `difficultyProfile` from `../difficulty`; `describeTime`, `randomTime`, `TimePrecision` from `../timeMath`; `Rng` from `../rng`; `buildChoiceAnswer`, `distractorTimes`, `formatClockFace`, `makeQuestionId`, `pickPrecision` from `./support`; `GeneratorContext`, `Question`, `QuestionType` from `./types`.
- Produces: `DESCRIBE_TIME_TYPE_ID: 'describeTime'`, `generateDescribeTime(rng: Rng, ctx: GeneratorContext): Question`, `describeTimeType: QuestionType`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/questions/describeTime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { describeTime } from '../timeMath';
import { DESCRIBE_TIME_TYPE_ID, describeTimeType, generateDescribeTime } from './describeTime';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(2) };

describe('generateDescribeTime', () => {
  it('shows an analog clock and asks for the words', () => {
    const q = generateDescribeTime(mulberry32(1), ctx);
    expect(q.typeId).toBe(DESCRIBE_TIME_TYPE_ID);
    expect(q.display.kind).toBe('analogClock');
    expect(q.prompt).toBe('Which words describe the time on the clock?');
  });

  it('marks the option that describes the displayed time as correct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateDescribeTime(mulberry32(seed), ctx);
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.answer.options[q.answer.correctIndex]).toBe(describeTime(q.display.time));
    }
  });

  it('never asks about seconds, which the wording cannot express', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateDescribeTime(mulberry32(seed), { ...ctx, difficulty: 10 });
      if (q.display.kind !== 'analogClock') throw new Error('expected an analogClock display');
      expect(q.display.showSeconds).toBe(false);
      expect(q.display.time.second).toBe(0);
    }
  });

  it('offers four distinct wordings', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { options } = generateDescribeTime(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
    }
  });

  it('produces recognisable clock language', () => {
    const wordings = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      for (const option of generateDescribeTime(mulberry32(seed), { ...ctx, difficulty: 4 }).answer
        .options) {
        wordings.add(option);
      }
    }
    const clocky = [...wordings].filter(
      (w) => w.includes("o'clock") || w.includes('past') || w.includes('to '),
    );
    expect(clocky.length).toBe(wordings.size);
  });

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateDescribeTime(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generateDescribeTime(mulberry32(42), ctx)).toEqual(
      generateDescribeTime(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(describeTimeType.typeId).toBe(DESCRIBE_TIME_TYPE_ID);
    expect(describeTimeType.generate(mulberry32(3), ctx).typeId).toBe(DESCRIBE_TIME_TYPE_ID);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/questions/describeTime.test.ts`
Expected: FAIL — `Cannot find module './describeTime'`.

Note for the implementer: the "recognisable clock language" assertion depends on M1a's `describeTime` returning strings of the form `"three o'clock"`, `"ten past three"`, or `"ten to four"`. If M1a's wording differs, adjust that one assertion to match M1a's actual output — do not change `describeTime`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/describeTime.ts`:

```ts
import { difficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import { describeTime, randomTime, type TimePrecision } from '../timeMath';
import {
  buildChoiceAnswer,
  distractorTimes,
  formatClockFace,
  makeQuestionId,
  pickPrecision,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const DESCRIBE_TIME_TYPE_ID = 'describeTime';

/** Peak 2's emphasis: turning a clock face into "quarter past three". */
export function generateDescribeTime(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  // `describeTime` speaks only in minutes, so a seconds-precision time would be
  // described as though the seconds were not there — two different clocks would
  // then share one correct wording. Cap this type at minute precision instead.
  const drawn = pickPrecision(rng, profile);
  const precision: TimePrecision = drawn === 'second' ? 'minute' : drawn;
  const time = randomTime(rng, precision);
  const correct = describeTime(time);
  const candidates = distractorTimes(time, precision).map((t) => describeTime(t));
  return {
    id: makeQuestionId(rng, DESCRIBE_TIME_TYPE_ID),
    typeId: DESCRIBE_TIME_TYPE_ID,
    prompt: 'Which words describe the time on the clock?',
    display: { kind: 'analogClock', time, showSeconds: false },
    answer: buildChoiceAnswer(rng, correct, candidates),
    timeLimitMs: profile.timerMs,
    explainCorrect: `${formatClockFace(time, false)} is ${correct}.`,
  };
}

export const describeTimeType: QuestionType = {
  typeId: DESCRIBE_TIME_TYPE_ID,
  generate: generateDescribeTime,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/questions/describeTime.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/describeTime.ts src/engine/questions/describeTime.test.ts
git commit -m "Add describe-time multiple-choice question generator"
```

---

## Task 6: Read-calendar generator (`src/engine/questions/readCalendar.ts`)

**Files:**
- Create: `src/engine/questions/readCalendar.ts`
- Test: `src/engine/questions/readCalendar.test.ts`

**Interfaces:**
- Consumes: `formatDateLong` from `../dateMath`; `difficultyProfile` from `../difficulty`; `Rng` from `../rng`; `buildChoiceAnswer`, `makeQuestionId`, `randomQuestionDate`, `weekdayName`, `WEEKDAY_NAMES` from `./support`; `GeneratorContext`, `Question`, `QuestionType` from `./types`.
- Produces: `READ_CALENDAR_TYPE_ID: 'readCalendar'`, `generateReadCalendar(rng: Rng, ctx: GeneratorContext): Question`, `readCalendarType: QuestionType`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/questions/readCalendar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { generateReadCalendar, READ_CALENDAR_TYPE_ID, readCalendarType } from './readCalendar';
import { weekdayName, WEEKDAY_NAMES } from './support';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 3, peak: getPeak(3) };

describe('generateReadCalendar', () => {
  it('shows a calendar month with one day highlighted', () => {
    const q = generateReadCalendar(mulberry32(1), ctx);
    expect(q.typeId).toBe(READ_CALENDAR_TYPE_ID);
    expect(q.display.kind).toBe('calendar');
  });

  it('highlights a day that actually exists in the displayed month', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 9 });
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      const date = new Date(q.display.year, q.display.monthIndex, q.display.highlightDay);
      expect(date.getMonth()).toBe(q.display.monthIndex);
      expect(date.getDate()).toBe(q.display.highlightDay);
    }
  });

  it('marks the weekday of the highlighted date as correct', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadCalendar(mulberry32(seed), ctx);
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      const date = new Date(q.display.year, q.display.monthIndex, q.display.highlightDay);
      expect(q.answer.options[q.answer.correctIndex]).toBe(weekdayName(date));
    }
  });

  it('only ever offers real weekday names, all distinct', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { options } = generateReadCalendar(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const option of options) expect(WEEKDAY_NAMES).toContain(option);
    }
  });

  it('names the date in the prompt so the calendar can be read against it', () => {
    const q = generateReadCalendar(mulberry32(1), ctx);
    expect(q.prompt.startsWith('What day of the week is ')).toBe(true);
    expect(q.prompt.endsWith('?')).toBe(true);
  });

  it('stays inside 2026 at the narrow difficulty bands', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 2 });
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      expect(q.display.year).toBe(2026);
    }
  });

  it('reaches other years at difficulty 8+', () => {
    const years = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
      const q = generateReadCalendar(mulberry32(seed), { ...ctx, difficulty: 9 });
      if (q.display.kind !== 'calendar') throw new Error('expected a calendar display');
      years.add(q.display.year);
    }
    expect(years.size).toBeGreaterThan(1);
  });

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateReadCalendar(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generateReadCalendar(mulberry32(42), ctx)).toEqual(
      generateReadCalendar(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(readCalendarType.typeId).toBe(READ_CALENDAR_TYPE_ID);
    expect(readCalendarType.generate(mulberry32(3), ctx).typeId).toBe(READ_CALENDAR_TYPE_ID);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/questions/readCalendar.test.ts`
Expected: FAIL — `Cannot find module './readCalendar'`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/readCalendar.ts`:

```ts
import { formatDateLong } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import type { Rng } from '../rng';
import {
  buildChoiceAnswer,
  makeQuestionId,
  randomQuestionDate,
  weekdayName,
  WEEKDAY_NAMES,
} from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const READ_CALENDAR_TYPE_ID = 'readCalendar';

/**
 * Peak 3's emphasis: find a date on a month grid and read its column heading.
 * The distractor pool is the other six weekday names, so it is distinct by
 * construction and can never contain the correct answer.
 */
export function generateReadCalendar(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const date = randomQuestionDate(rng, profile.dateSpan);
  const correct = weekdayName(date);
  const candidates = WEEKDAY_NAMES.filter((name) => name !== correct);
  const longDate = formatDateLong(date);
  return {
    id: makeQuestionId(rng, READ_CALENDAR_TYPE_ID),
    typeId: READ_CALENDAR_TYPE_ID,
    prompt: `What day of the week is ${longDate}?`,
    display: {
      kind: 'calendar',
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      highlightDay: date.getDate(),
    },
    answer: buildChoiceAnswer(rng, correct, candidates),
    timeLimitMs: profile.timerMs,
    explainCorrect: `${longDate} is a ${correct}.`,
  };
}

export const readCalendarType: QuestionType = {
  typeId: READ_CALENDAR_TYPE_ID,
  generate: generateReadCalendar,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/questions/readCalendar.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/readCalendar.ts src/engine/questions/readCalendar.test.ts
git commit -m "Add read-calendar multiple-choice question generator"
```

---

## Task 7: Offset-date generator (`src/engine/questions/offsetDate.ts`)

**Files:**
- Create: `src/engine/questions/offsetDate.ts`
- Test: `src/engine/questions/offsetDate.test.ts`

**Interfaces:**
- Consumes: `formatDateLong`, `offsetDate`, `DateOffsetUnit` from `../dateMath`; `DateSpan`, `difficultyProfile` from `../difficulty`; `pick`, `randInt`, `Rng` from `../rng`; `buildChoiceAnswer`, `makeQuestionId`, `randomQuestionDate` from `./support`; `GeneratorContext`, `Question`, `QuestionType` from `./types`.
- Produces: `OFFSET_DATE_TYPE_ID: 'offsetDate'`, `generateOffsetDate(rng: Rng, ctx: GeneratorContext): Question`, `offsetDateType: QuestionType`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/questions/offsetDate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDateLong } from '../dateMath';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { generateOffsetDate, OFFSET_DATE_TYPE_ID, offsetDateType } from './offsetDate';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 5, peak: getPeak(7) };

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Parses "November 21, 2026" back into a local-time Date. */
function parseLongDate(text: string): Date {
  const match = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(text);
  if (!match) throw new Error(`not a long-form date: ${text}`);
  const monthIndex = MONTH_NAMES.indexOf(match[1]);
  if (monthIndex < 0) throw new Error(`unknown month: ${match[1]}`);
  return new Date(Number(match[3]), monthIndex, Number(match[2]));
}

describe('generateOffsetDate', () => {
  it('asks a date-arithmetic question with no visual aid', () => {
    const q = generateOffsetDate(mulberry32(1), ctx);
    expect(q.typeId).toBe(OFFSET_DATE_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.prompt.startsWith('What date is ')).toBe(true);
    expect(q.prompt.endsWith('?')).toBe(true);
  });

  it('offers four distinct long-form dates', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { options } = generateOffsetDate(mulberry32(seed), ctx).answer;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const option of options) expect(option).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    }
  });

  it('never says "1 days"', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 1 });
      expect(q.prompt).not.toMatch(/\b1 (days|weeks|months)\b/);
    }
  });

  it('keeps difficulty 1-3 questions inside a single month, moving forward', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 2 });
      const match = /^What date is (\d+) (day|days) after (.+)\?$/.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      const start = parseLongDate(match[3]);
      const correct = parseLongDate(q.answer.options[q.answer.correctIndex]);
      expect(correct.getMonth()).toBe(start.getMonth());
      expect(correct.getFullYear()).toBe(start.getFullYear());
    }
  });

  it('computes the correct date independently of the generator', () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 2 });
      const match = /^What date is (\d+) (day|days) after (.+)\?$/.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      const amount = Number(match[1]);
      const start = parseLongDate(match[3]);
      const expected = new Date(start.getFullYear(), start.getMonth(), start.getDate() + amount);
      expect(q.answer.options[q.answer.correctIndex]).toBe(formatDateLong(expected));
    }
  });

  it('asks about weeks and months once the span widens', () => {
    const units = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 6 });
      const match = /^What date is \d+ (day|days|week|weeks|month|months) /.exec(q.prompt);
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      units.add(match[1].replace(/s$/, ''));
    }
    expect(units).toContain('week');
    expect(units).toContain('month');
  });

  it('asks "before" as well as "after" once the span widens', () => {
    const directions = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const q = generateOffsetDate(mulberry32(seed), { ...ctx, difficulty: 6 });
      directions.add(q.prompt.includes(' after ') ? 'after' : 'before');
    }
    expect(directions.size).toBe(2);
  });

  it('uses the difficulty profile timer', () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateOffsetDate(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
    }
  });

  it('restates the question in the explanation', () => {
    const q = generateOffsetDate(mulberry32(1), ctx);
    expect(q.explainCorrect).toContain(q.answer.options[q.answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateOffsetDate(mulberry32(42), ctx)).toEqual(generateOffsetDate(mulberry32(42), ctx));
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(offsetDateType.typeId).toBe(OFFSET_DATE_TYPE_ID);
    expect(offsetDateType.generate(mulberry32(3), ctx).typeId).toBe(OFFSET_DATE_TYPE_ID);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/engine/questions/offsetDate.test.ts`
Expected: FAIL — `Cannot find module './offsetDate'`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/offsetDate.ts`:

```ts
import { formatDateLong, offsetDate, type DateOffsetUnit } from '../dateMath';
import { difficultyProfile, type DateSpan } from '../difficulty';
import { pick, randInt, type Rng } from '../rng';
import { buildChoiceAnswer, makeQuestionId, randomQuestionDate } from './support';
import type { GeneratorContext, Question, QuestionType } from './types';

export const OFFSET_DATE_TYPE_ID = 'offsetDate';

interface OffsetPlan {
  start: Date;
  unit: DateOffsetUnit;
  amount: number;
  forward: boolean;
}

const UNIT_LABELS: Record<DateOffsetUnit, { one: string; many: string }> = {
  day: { one: 'day', many: 'days' },
  week: { one: 'week', many: 'weeks' },
  month: { one: 'month', many: 'months' },
};

/**
 * Chooses the start date and the jump, sized so the answer lands where the
 * difficulty band's declared date span says it should.
 */
function planOffset(rng: Rng, span: DateSpan): OffsetPlan {
  switch (span) {
    case 'withinMonth': {
      // Start on days 1-14 and move forward 1-14 days, so the answer lands on
      // day 2-28 — a day that exists in every month, in the same month.
      const monthIndex = randInt(rng, 0, 11);
      const start = new Date(2026, monthIndex, randInt(rng, 1, 14));
      return { start, unit: 'day', amount: randInt(rng, 1, 14), forward: true };
    }
    case 'acrossMonths': {
      const start = randomQuestionDate(rng, 'acrossMonths');
      const unit = pick(rng, ['day', 'week', 'month'] as const);
      const amount =
        unit === 'day'
          ? randInt(rng, 8, 25)
          : unit === 'week'
            ? randInt(rng, 2, 6)
            : randInt(rng, 1, 4);
      return { start, unit, amount, forward: rng() < 0.5 };
    }
    case 'acrossYears': {
      const start = randomQuestionDate(rng, 'acrossYears');
      const unit = pick(rng, ['week', 'month'] as const);
      const amount = unit === 'week' ? randInt(rng, 10, 40) : randInt(rng, 5, 20);
      return { start, unit, amount, forward: rng() < 0.5 };
    }
  }
}

/**
 * Peak 7's emphasis: "what date is three weeks after ...".
 *
 * Every candidate is a real date produced by `offsetDate`, differing from the
 * answer by the count, the unit, or the direction — the three ways a child
 * actually gets this wrong. Because they are all distinct offsets of the same
 * start date they cannot collide with the correct answer.
 */
export function generateOffsetDate(rng: Rng, ctx: GeneratorContext): Question {
  const profile = difficultyProfile(ctx.difficulty);
  const plan = planOffset(rng, profile.dateSpan);
  const sign = plan.forward ? 1 : -1;
  const correct = formatDateLong(offsetDate(plan.start, sign * plan.amount, plan.unit));
  const altUnit: DateOffsetUnit = plan.unit === 'day' ? 'week' : 'day';
  const candidates = [
    offsetDate(plan.start, sign * (plan.amount + 1), plan.unit),
    offsetDate(plan.start, sign * (plan.amount - 1), plan.unit),
    offsetDate(plan.start, -sign * plan.amount, plan.unit),
    offsetDate(plan.start, sign * (plan.amount + 2), plan.unit),
    offsetDate(plan.start, sign * plan.amount, altUnit),
    offsetDate(plan.start, sign * (plan.amount + 3), plan.unit),
    offsetDate(plan.start, sign * (plan.amount + 7), plan.unit),
  ].map((d) => formatDateLong(d));

  const label = UNIT_LABELS[plan.unit];
  const unitWord = plan.amount === 1 ? label.one : label.many;
  const direction = plan.forward ? 'after' : 'before';
  const longStart = formatDateLong(plan.start);
  return {
    id: makeQuestionId(rng, OFFSET_DATE_TYPE_ID),
    typeId: OFFSET_DATE_TYPE_ID,
    prompt: `What date is ${plan.amount} ${unitWord} ${direction} ${longStart}?`,
    display: { kind: 'none' },
    answer: buildChoiceAnswer(rng, correct, candidates),
    timeLimitMs: profile.timerMs,
    explainCorrect: `${plan.amount} ${unitWord} ${direction} ${longStart} is ${correct}.`,
  };
}

export const offsetDateType: QuestionType = {
  typeId: OFFSET_DATE_TYPE_ID,
  generate: generateOffsetDate,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/engine/questions/offsetDate.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/offsetDate.ts src/engine/questions/offsetDate.test.ts
git commit -m "Add offset-date multiple-choice question generator"
```

---

## Task 8: Barrel and built-in registration (`src/engine/questions/index.ts`)

**Files:**
- Create: `src/engine/questions/index.ts`
- Test: `src/engine/questions/index.test.ts`

**Interfaces:**
- Consumes: the four `QuestionType` records from Tasks 4–7; `registerGenerator` from `./registry`.
- Produces: `BUILT_IN_QUESTION_TYPES: readonly QuestionType[]` (order: `readAnalog`, `describeTime`, `readCalendar`, `offsetDate`), plus re-exports of everything in `./types`, `./registry`, and the four generator modules. Importing this module registers the four built-ins as a side effect. **M1c and all later UI code import from `src/engine/questions` (this file), never from `./registry` directly.**

- [ ] **Step 1: Write the failing test**

Create `src/engine/questions/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import {
  BUILT_IN_QUESTION_TYPES,
  generateQuestion,
  getGenerator,
  listGenerators,
  type GeneratorContext,
} from './index';

const ctx: GeneratorContext = { difficulty: 4, peak: getPeak(1) };

describe('questions barrel', () => {
  it('registers the four M1b generators in order', () => {
    expect(listGenerators().map((t) => t.typeId)).toEqual([
      'readAnalog',
      'describeTime',
      'readCalendar',
      'offsetDate',
    ]);
  });

  it('exposes the same list as BUILT_IN_QUESTION_TYPES', () => {
    expect(BUILT_IN_QUESTION_TYPES.map((t) => t.typeId)).toEqual(
      listGenerators().map((t) => t.typeId),
    );
  });

  it('resolves each built-in by typeId', () => {
    for (const type of BUILT_IN_QUESTION_TYPES) {
      expect(getGenerator(type.typeId)).toBe(type);
    }
  });

  it('generates questions from every registered type over enough draws', () => {
    const rng = mulberry32(1);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(generateQuestion(rng, ctx).typeId);
    expect(seen.size).toBe(BUILT_IN_QUESTION_TYPES.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/engine/questions/index.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Implement**

Create `src/engine/questions/index.ts`:

```ts
import { describeTimeType } from './describeTime';
import { offsetDateType } from './offsetDate';
import { readAnalogType } from './readAnalog';
import { readCalendarType } from './readCalendar';
import { registerGenerator } from './registry';
import type { QuestionType } from './types';

/**
 * The generators shipped in M1b, in the order they are registered.
 *
 * Importing this module registers them. Always reach the registry through this
 * barrel (`import { generateQuestion } from '../engine/questions'`) rather than
 * through `./registry`, or the registry will be empty.
 */
export const BUILT_IN_QUESTION_TYPES: readonly QuestionType[] = [
  readAnalogType,
  describeTimeType,
  readCalendarType,
  offsetDateType,
];

for (const type of BUILT_IN_QUESTION_TYPES) {
  registerGenerator(type);
}

export * from './types';
export * from './registry';
export * from './readAnalog';
export * from './describeTime';
export * from './readCalendar';
export * from './offsetDate';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/engine/questions/index.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/questions/index.ts src/engine/questions/index.test.ts
git commit -m "Register the four built-in question generators"
```

---

## Task 9: Generator contract test (`src/engine/questions/contract.test.ts`)

**Files:**
- Test: `src/engine/questions/contract.test.ts` (deliberately has no source twin — it is the cross-cutting test the spec calls the highest-value test in the project)

**Interfaces:**
- Consumes: `BUILT_IN_QUESTION_TYPES`, `generateQuestion`, `isCorrectChoice`, the four `*_TYPE_ID` constants, and the `AnswerSpec` / `DisplaySpec` / `Question` types from `./index`; `formatClockFace`, `OPTION_COUNT`, `weekdayName` from `./support`; `describeTime` from `../timeMath`; `difficultyProfile` from `../difficulty`; `PEAKS` from `../peaks`; `mulberry32` from `../rng`.
- Produces: nothing — pure verification.

This is written last precisely because it must pass against all four real generators at once. If it fails, the generator is wrong, not the test.

- [ ] **Step 1: Write the test**

Create `src/engine/questions/contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { PEAKS } from '../peaks';
import { mulberry32 } from '../rng';
import { describeTime } from '../timeMath';
import {
  BUILT_IN_QUESTION_TYPES,
  DESCRIBE_TIME_TYPE_ID,
  generateQuestion,
  isCorrectChoice,
  OFFSET_DATE_TYPE_ID,
  READ_ANALOG_TYPE_ID,
  READ_CALENDAR_TYPE_ID,
  type AnswerSpec,
  type DisplaySpec,
  type Question,
} from './index';
import { formatClockFace, OPTION_COUNT, weekdayName } from './support';

const SEED_COUNT = 200;
const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Distinct, reproducible seed per (difficulty, index) pair. */
function seedFor(difficulty: number, index: number): number {
  return difficulty * 104_729 + index * 7919 + 1;
}

function assertDisplayWellFormed(display: DisplaySpec): void {
  switch (display.kind) {
    case 'analogClock': {
      const { hour, minute, second } = display.time;
      for (const value of [hour, minute, second]) expect(Number.isInteger(value)).toBe(true);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThanOrEqual(59);
      if (!display.showSeconds) expect(second).toBe(0);
      return;
    }
    case 'calendar': {
      expect(Number.isInteger(display.year)).toBe(true);
      expect(display.monthIndex).toBeGreaterThanOrEqual(0);
      expect(display.monthIndex).toBeLessThanOrEqual(11);
      // The highlighted day must exist in the highlighted month.
      const date = new Date(display.year, display.monthIndex, display.highlightDay);
      expect(date.getFullYear()).toBe(display.year);
      expect(date.getMonth()).toBe(display.monthIndex);
      expect(date.getDate()).toBe(display.highlightDay);
      return;
    }
    case 'none':
      return;
  }
}

function assertAnswerGrades(answer: AnswerSpec): void {
  expect(answer.kind).toBe('choice');
  expect(answer.options).toHaveLength(OPTION_COUNT);
  for (const option of answer.options) {
    expect(typeof option).toBe('string');
    expect(option.trim().length).toBeGreaterThan(0);
  }
  // No duplicate option text: a duplicate means a "wrong" answer that is
  // word-for-word identical to the right one.
  expect(new Set(answer.options).size).toBe(OPTION_COUNT);
  expect(Number.isInteger(answer.correctIndex)).toBe(true);
  expect(answer.correctIndex).toBeGreaterThanOrEqual(0);
  expect(answer.correctIndex).toBeLessThan(OPTION_COUNT);

  // The declared correct answer validates true...
  expect(isCorrectChoice(answer, answer.correctIndex)).toBe(true);
  // ...and every distractor validates false.
  for (let i = 0; i < answer.options.length; i++) {
    if (i === answer.correctIndex) continue;
    expect(isCorrectChoice(answer, i)).toBe(false);
    expect(answer.options[i]).not.toBe(answer.options[answer.correctIndex]);
  }
}

/**
 * Re-derives the right answer from the question's own display, independently of
 * whatever the generator believed. This is the assertion that actually catches
 * "the game marked her right answer wrong".
 */
function assertDeclaredAnswerMatchesDisplay(q: Question): void {
  const declared = q.answer.options[q.answer.correctIndex];
  switch (q.typeId) {
    case READ_ANALOG_TYPE_ID: {
      expect(q.display.kind).toBe('analogClock');
      if (q.display.kind !== 'analogClock') return;
      expect(declared).toBe(formatClockFace(q.display.time, q.display.showSeconds));
      // A clock face cannot show AM/PM, so no option may claim it.
      for (const option of q.answer.options) expect(option).not.toMatch(/AM|PM/);
      return;
    }
    case DESCRIBE_TIME_TYPE_ID: {
      expect(q.display.kind).toBe('analogClock');
      if (q.display.kind !== 'analogClock') return;
      expect(declared).toBe(describeTime(q.display.time));
      return;
    }
    case READ_CALENDAR_TYPE_ID: {
      expect(q.display.kind).toBe('calendar');
      if (q.display.kind !== 'calendar') return;
      const date = new Date(q.display.year, q.display.monthIndex, q.display.highlightDay);
      expect(declared).toBe(weekdayName(date));
      return;
    }
    case OFFSET_DATE_TYPE_ID: {
      // No display to re-derive from; offsetDate.test.ts re-computes the
      // arithmetic straight from the prompt instead.
      expect(q.display.kind).toBe('none');
      expect(declared).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      return;
    }
    default:
      throw new Error(
        `contract test has no cross-check for typeId "${q.typeId}" — add one when adding a type`,
      );
  }
}

function assertWellFormed(q: Question, typeId: string, difficulty: number): void {
  expect(q.typeId).toBe(typeId);
  expect(q.id.startsWith(`${typeId}-`)).toBe(true);
  expect(q.id.length).toBeGreaterThan(typeId.length + 1);
  expect(q.prompt.trim().length).toBeGreaterThan(0);
  expect(q.explainCorrect.trim().length).toBeGreaterThan(0);

  // The time limit is sane: a whole number of ms, exactly what the difficulty
  // table declares for a multiple-choice question, and inside a band a child
  // can actually work within.
  expect(Number.isInteger(q.timeLimitMs)).toBe(true);
  expect(q.timeLimitMs).toBe(difficultyProfile(difficulty).timerMs);
  expect(q.timeLimitMs).toBeGreaterThanOrEqual(5_000);
  expect(q.timeLimitMs).toBeLessThanOrEqual(30_000);

  assertDisplayWellFormed(q.display);
  assertAnswerGrades(q.answer);
  assertDeclaredAnswerMatchesDisplay(q);
}

describe('generator contract', () => {
  for (const type of BUILT_IN_QUESTION_TYPES) {
    describe(type.typeId, () => {
      for (const difficulty of DIFFICULTIES) {
        it(`is well formed at difficulty ${difficulty} over ${SEED_COUNT} seeds`, () => {
          for (let index = 0; index < SEED_COUNT; index++) {
            const rng = mulberry32(seedFor(difficulty, index));
            const peak = PEAKS[index % PEAKS.length];
            assertWellFormed(type.generate(rng, { difficulty, peak }), type.typeId, difficulty);
          }
        });
      }
    });
  }

  describe('registry selection', () => {
    for (const difficulty of DIFFICULTIES) {
      it(`produces well-formed questions at difficulty ${difficulty}`, () => {
        const rng = mulberry32(seedFor(difficulty, 999));
        for (let index = 0; index < SEED_COUNT; index++) {
          const peak = PEAKS[index % PEAKS.length];
          const q = generateQuestion(rng, { difficulty, peak });
          assertWellFormed(q, q.typeId, difficulty);
        }
      });
    }
  });

  it('has a cross-check for every registered type', () => {
    const covered = [
      READ_ANALOG_TYPE_ID,
      DESCRIBE_TIME_TYPE_ID,
      READ_CALENDAR_TYPE_ID,
      OFFSET_DATE_TYPE_ID,
    ];
    for (const type of BUILT_IN_QUESTION_TYPES) {
      expect(covered).toContain(type.typeId);
    }
  });
});
```

- [ ] **Step 2: Run the contract test**

Run: `pnpm exec vitest run src/engine/questions/contract.test.ts`
Expected: all tests PASS — 51 test cases (4 types x 10 difficulties, 10 registry cases, 1 coverage check), generating 10,000 questions per run.

If anything fails, the message names the type and the difficulty, and `seedFor(difficulty, index)` reproduces the exact question. **Fix the generator, never the assertion** — an assertion loosened here is exactly the bug this milestone exists to prevent. The one legitimate exception is `SEED_COUNT` if the suite turns out to be unbearably slow; measure first (it should run in well under a second) before touching it.

- [ ] **Step 3: Commit**

```bash
git add src/engine/questions/contract.test.ts
git commit -m "Add generator contract test across every type, difficulty, and seed"
```

---

## Task 10: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full local check suite**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Expected: all pass. `pnpm test` should now show M1a's six engine test files, the two pre-existing files (`src/App.test.tsx`, `scripts/pixelIcon.test.ts`), and nine new files from this plan (`types`, `support`, `registry`, `readAnalog`, `describeTime`, `readCalendar`, `offsetDate`, `index`, `contract`) — 17 test files total.

If `pnpm format:check` reports differences, run `pnpm format`, re-run `pnpm test`, and amend the relevant commit — do not leave the repo unformatted.

- [ ] **Step 2: Confirm zero DOM/React imports in the engine**

Run: `grep -rn "from 'react'\|from \"react\"\|document\.\|window\." src/engine/`
Expected: no matches.

- [ ] **Step 3: Confirm no M1a file was modified**

Run: `git diff --name-only main -- src/engine | grep -v '^src/engine/questions/'`
Expected: no output. If `rng.ts`, `timeMath.ts`, `dateMath.ts`, `difficulty.ts`, `peaks.ts`, or `climb.ts` appears, revert that change — it belongs in M1a.

- [ ] **Step 4: Confirm no generator reaches for ambient state**

Run: `grep -rn "Math.random\|Date.now()\|new Date()" src/engine/questions/`
Expected: no matches. Every generator must be a pure function of `(rng, ctx)`.

---

## Post-M1b

The engine can now produce and grade questions, but nothing renders them. M1c adds the dev-only `/debug/questions` page that lists what these generators produce at any difficulty and peak. It consumes exactly these exports: `BUILT_IN_QUESTION_TYPES`, `type Question`, `type DisplaySpec`, and `type GeneratorContext` from `src/engine/questions`; `PEAKS` and `getPeak` from `src/engine/peaks`; `mulberry32` from `src/engine/rng`.

Further out: M3 turns `DisplaySpec` into real widgets (`AnalogClock`, `CalendarMonth`) and `ChoiceAnswer` into `ChoiceGrid`. M5 adds the remaining generators from the spec's file list (`setHands`, `elapsedAdd`, `elapsedBetween`, `digitalToAnalog`, `hour24`, `countBetween`, `nthWeekday`, `countWeekdays`, `dayOfWeek`), the `setHands` / `pickDate` / `number` answer kinds with their own `isCorrect*` helpers alongside `isCorrectChoice`, and replaces `selectGenerator`'s uniform draw with weighting by `ctx.peak.emphasis` and the difficulty profile's `answerModeWeights`. Each of those extends the contract test's cross-check switch rather than replacing it — the `default: throw` in `assertDeclaredAnswerMatchesDisplay` makes forgetting impossible.
