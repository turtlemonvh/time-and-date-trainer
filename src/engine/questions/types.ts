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
