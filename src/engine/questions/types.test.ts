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
