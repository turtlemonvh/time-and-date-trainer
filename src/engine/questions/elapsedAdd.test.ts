import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { ELAPSED_ADD_TYPE_ID, elapsedAddType, generateElapsedAdd } from './elapsedAdd';
import { timeLimitFor } from './support';
import { expectChoiceAnswer } from './testSupport';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 5, peak: getPeak(6) };

/** Parses a bare 12-hour, no-AM/PM clock label like "3:05" into minutes-since-midnight-mod-720. */
function parseClockToHalfDayMinutes(text: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) throw new Error(`not a clock label: ${text}`);
  return (Number(match[1]) % 12) * 60 + Number(match[2]);
}

describe('generateElapsedAdd', () => {
  it('asks an elapsed-time-arithmetic question with no visual aid', () => {
    const q = generateElapsedAdd(mulberry32(1), ctx);
    expect(q.typeId).toBe(ELAPSED_ADD_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.prompt.startsWith("It's ")).toBe(true);
    expect(q.prompt.endsWith('?')).toBe(true);
  });

  it('offers four distinct clock-face-formatted options with no AM/PM', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateElapsedAdd(mulberry32(seed), ctx);
      const { options } = expectChoiceAnswer(q);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      for (const option of options) {
        expect(option).toMatch(/^\d{1,2}:\d{2}$/);
        expect(option).not.toMatch(/AM|PM/);
      }
    }
  });

  it('computes the correct result independently of the generator, forward and backward', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateElapsedAdd(mulberry32(seed), ctx);
      const forwardMatch = /^It's (\d{1,2}):(\d{2})\. What time will it be in (.+)\?$/.exec(
        q.prompt,
      );
      const backwardMatch = /^It's (\d{1,2}):(\d{2})\. What time was it (.+) ago\?$/.exec(q.prompt);
      const match = forwardMatch ?? backwardMatch;
      if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
      const startHalfDayMin = (Number(match[1]) % 12) * 60 + Number(match[2]);
      const durationText = match[3];
      const hourPart = /(\d+) hours?/.exec(durationText);
      const minutePart = /(\d+) minutes?/.exec(durationText);
      const durationMinutes =
        (hourPart ? Number(hourPart[1]) * 60 : 0) + (minutePart ? Number(minutePart[1]) : 0);
      const sign = forwardMatch ? 1 : -1;
      const expectedHalfDayMin = (((startHalfDayMin + sign * durationMinutes) % 720) + 720) % 720;
      const answer = expectChoiceAnswer(q);
      const declaredHalfDayMin = parseClockToHalfDayMinutes(answer.options[answer.correctIndex]);
      expect(declaredHalfDayMin).toBe(expectedHalfDayMin);
    }
  });

  it('produces both forward and backward questions', () => {
    const directions = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const q = generateElapsedAdd(mulberry32(seed), ctx);
      directions.add(q.prompt.includes('will it be') ? 'forward' : 'backward');
    }
    expect(directions.size).toBe(2);
  });

  it('never says "1 minutes" or "1 hours"', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateElapsedAdd(mulberry32(seed), { ...ctx, difficulty: 6 });
      expect(q.prompt).not.toMatch(/\b1 (minutes|hours)\b/);
    }
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateElapsedAdd(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(timeLimitFor(difficultyProfile(difficulty), 1.2));
    }
  });

  it('restates the question in the explanation', () => {
    const q = generateElapsedAdd(mulberry32(1), ctx);
    const answer = expectChoiceAnswer(q);
    expect(q.explainCorrect).toContain(answer.options[answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateElapsedAdd(mulberry32(42), ctx)).toEqual(
      generateElapsedAdd(mulberry32(42), ctx),
    );
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(elapsedAddType.typeId).toBe(ELAPSED_ADD_TYPE_ID);
    expect(elapsedAddType.answerMode).toBe('choice');
    expect(elapsedAddType.generate(mulberry32(3), ctx).typeId).toBe(ELAPSED_ADD_TYPE_ID);
  });
});
