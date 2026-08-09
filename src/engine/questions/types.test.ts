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

  it('rejects indexes outside the option list, via an explicit bounds check', () => {
    // These don't numerically equal `correctIndex` (2) either, so this alone
    // wouldn't distinguish a real bounds check from one that just happens to
    // pass by falling through to the equality comparison — the case below does.
    expect(isCorrectChoice(answer, -1)).toBe(false);
    expect(isCorrectChoice(answer, 4)).toBe(false);
    // Out-of-range but numerically equal to correctIndex if bounds weren't
    // checked: an answer set with only 3 options, "correct" at index 2 lying
    // just past the end. A missing bounds check would report this as correct.
    const tooShort: ChoiceAnswer = { kind: 'choice', options: ['x', 'y'], correctIndex: 2 };
    expect(isCorrectChoice(tooShort, 2)).toBe(false);
  });
});
