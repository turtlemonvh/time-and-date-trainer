import { applyCorrect, applyMiss, createClimb, isFastAnswer, type ClimbState } from './climb';
import type { Peak } from './peaks';
import { generateQuestion } from './questions';
import type { Rng } from './rng';

/** A simulated player's behavior: how often they answer correctly, and how
 * much of a question's own time limit they typically spend before
 * answering. Both are constant across the whole simulated run — this is a
 * pacing/tuning check, not a model of a player getting better over time. */
export interface PacingProfile {
  /** 0-1: probability any given question is answered correctly. */
  accuracy: number;
  /** 0-1: elapsed time as a fraction of the question's own `timeLimitMs`. */
  answerSpeedFraction: number;
}

export interface PacingSimulationResult {
  /** Total simulated time to summit, across every attempt (a fall restarts
   * the peak from the bottom, per the design spec — this is the time a real
   * player retrying would actually spend, not just the first attempt). */
  totalElapsedMs: number;
  questionsAnswered: number;
  /** How many climb attempts it took, including any that fell. 1 if the
   * player summited on the first try. */
  attempts: number;
}

/** Safety valve against a runaway loop from a future climb-rule bug, not a
 * realistic count — a real climb resolves in well under this many
 * questions even at the highest peak and worst plausible accuracy. */
const MAX_QUESTIONS_PER_ATTEMPT = 1000;
const MAX_ATTEMPTS = 200;

function runOneAttempt(
  rng: Rng,
  peak: Peak,
  difficulty: number,
  profile: PacingProfile,
): { state: ClimbState; elapsedMs: number; questionsAnswered: number } {
  let state = createClimb(peak, difficulty);
  let elapsedMs = 0;
  let questionsAnswered = 0;
  while (state.status === 'climbing') {
    if (questionsAnswered >= MAX_QUESTIONS_PER_ATTEMPT) {
      throw new Error(
        `simulatePeakCompletion: exceeded ${MAX_QUESTIONS_PER_ATTEMPT} questions in one ` +
          `attempt — peak ${peak.id}, difficulty ${difficulty}`,
      );
    }
    const question = generateQuestion(rng, { difficulty, peak });
    const questionElapsedMs = Math.round(question.timeLimitMs * profile.answerSpeedFraction);
    const correct = rng() < profile.accuracy;
    state = correct
      ? applyCorrect(state, isFastAnswer(questionElapsedMs, question.timeLimitMs))
      : applyMiss(state);
    elapsedMs += questionElapsedMs;
    questionsAnswered++;
  }
  return { state, elapsedMs, questionsAnswered };
}

/**
 * Simulates a player with a fixed `profile` climbing `peak` at `difficulty`
 * until they summit, retrying from the bottom on every fall (matching the
 * design spec's own rule: a fall loses the level and retries, it doesn't
 * end the session) — so the result reflects real end-to-end completion
 * time, not just a single attempt's outcome. Pure function, no React: this
 * exists so a test can assert pacing (2-5 minutes per peak, per the design
 * spec's testing-strategy section) without a browser.
 */
export function simulatePeakCompletion(
  rng: Rng,
  peak: Peak,
  difficulty: number,
  profile: PacingProfile,
): PacingSimulationResult {
  let totalElapsedMs = 0;
  let totalQuestionsAnswered = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { state, elapsedMs, questionsAnswered } = runOneAttempt(rng, peak, difficulty, profile);
    totalElapsedMs += elapsedMs;
    totalQuestionsAnswered += questionsAnswered;
    if (state.status === 'summited') {
      return { totalElapsedMs, questionsAnswered: totalQuestionsAnswered, attempts: attempt };
    }
  }
  throw new Error(
    `simulatePeakCompletion: exceeded ${MAX_ATTEMPTS} attempts without summiting — ` +
      `peak ${peak.id}, difficulty ${difficulty}`,
  );
}
