import { describe, expect, it } from 'vitest';
import { difficultyProfile } from '../difficulty';
import { getPeak } from '../peaks';
import { mulberry32 } from '../rng';
import { to24Hour } from '../timeMath';
import { generateHour24, HOUR24_TYPE_ID, hour24Type } from './hour24';
import { timeLimitFor } from './support';
import { expectChoiceAnswer } from './testSupport';
import type { GeneratorContext } from './types';

const ctx: GeneratorContext = { difficulty: 8, peak: getPeak(8) };

const TO_24_PATTERN = /^What is (\d{1,2}):(\d{2}) (AM|PM) in 24-hour time\?$/;
const TO_12_PATTERN = /^What is (\d{2}):(\d{2}) in 12-hour time\?$/;

describe('generateHour24', () => {
  it('asks a notation-conversion question with no visual aid', () => {
    const q = generateHour24(mulberry32(1), ctx);
    expect(q.typeId).toBe(HOUR24_TYPE_ID);
    expect(q.display.kind).toBe('none');
    expect(q.prompt.startsWith('What is ')).toBe(true);
  });

  it('offers four distinct options, all in the same notation as the answer', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateHour24(mulberry32(seed), ctx);
      const { options } = expectChoiceAnswer(q);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      const to24 = TO_24_PATTERN.test(q.prompt);
      for (const option of options) {
        if (to24) {
          expect(option).toMatch(/^\d{2}:\d{2}$/);
        } else {
          expect(option).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
        }
      }
    }
  });

  it('produces both conversion directions across enough draws', () => {
    const directions = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const q = generateHour24(mulberry32(seed), ctx);
      directions.add(q.prompt.includes('24-hour') ? 'to24' : 'to12');
    }
    expect(directions.size).toBe(2);
  });

  it('computes the correct conversion independently of the generator, both directions', () => {
    for (let seed = 0; seed < 300; seed++) {
      const q = generateHour24(mulberry32(seed), ctx);
      const answer = expectChoiceAnswer(q);
      const declared = answer.options[answer.correctIndex];
      const to24Match = TO_24_PATTERN.exec(q.prompt);
      const to12Match = TO_12_PATTERN.exec(q.prompt);
      if (to24Match) {
        const [, hourText, minuteText, period] = to24Match;
        const hour24 = to24Hour(Number(hourText), period === 'PM');
        expect(declared).toBe(`${String(hour24).padStart(2, '0')}:${minuteText}`);
        continue;
      }
      if (to12Match) {
        const [, hourText, minuteText] = to12Match;
        const hour24 = Number(hourText);
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const period = hour24 < 12 ? 'AM' : 'PM';
        expect(declared).toBe(`${hour12}:${minuteText} ${period}`);
        continue;
      }
      throw new Error(`unexpected prompt: ${q.prompt}`);
    }
  });

  it("uses the difficulty profile timer, scaled by this type's own multiplier", () => {
    for (const difficulty of [1, 5, 10]) {
      const q = generateHour24(mulberry32(1), { ...ctx, difficulty });
      expect(q.timeLimitMs).toBe(timeLimitFor(difficultyProfile(difficulty), 1.2));
    }
  });

  it('restates the question in the explanation', () => {
    const q = generateHour24(mulberry32(1), ctx);
    const answer = expectChoiceAnswer(q);
    expect(q.explainCorrect).toContain(answer.options[answer.correctIndex]);
  });

  it('is deterministic for a given seed', () => {
    expect(generateHour24(mulberry32(42), ctx)).toEqual(generateHour24(mulberry32(42), ctx));
  });

  it('exports a QuestionType wired to the generator', () => {
    expect(hour24Type.typeId).toBe(HOUR24_TYPE_ID);
    expect(hour24Type.answerMode).toBe('choice');
    expect(hour24Type.generate(mulberry32(3), ctx).typeId).toBe(HOUR24_TYPE_ID);
  });
});
