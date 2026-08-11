import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Climb from './Climb';
import { CHARACTER_PRESETS } from '../character/presets';
import type { Peak } from '../../engine/peaks';
import type { Question } from '../../engine/questions';

// Matches Climb.tsx's internal REVEAL_MS — kept as a separate constant here
// since the component doesn't export it.
const REVEAL_MS = 1500;

const FIXED_QUESTION: Question = {
  id: 'test-question',
  typeId: 'testType',
  prompt: 'What is the answer?',
  display: { kind: 'none' },
  answer: { kind: 'choice', options: ['Right', 'Wrong'], correctIndex: 0 },
  timeLimitMs: 5000,
  explainCorrect: 'Because Right is right.',
};

vi.mock('../../engine/questions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../engine/questions')>();
  return { ...actual, generateQuestion: vi.fn(() => FIXED_QUESTION) };
});

const preset = CHARACTER_PRESETS[0];
const shortPeak: Peak = { id: 99, name: 'Test Peak', emphasis: 'Testing', height: 3 };

function answerCorrect() {
  fireEvent.click(screen.getByTestId('choice-option-0'));
  act(() => {
    vi.advanceTimersByTime(REVEAL_MS);
  });
}

function answerWrong() {
  fireEvent.click(screen.getByTestId('choice-option-1'));
  act(() => {
    vi.advanceTimersByTime(REVEAL_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Climb', () => {
  it('renders the prompt and choice options', () => {
    render(
      <Climb
        peak={shortPeak}
        difficulty={5}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={vi.fn()}
      />,
    );
    expect(screen.getByTestId('climb-prompt')).toHaveTextContent('What is the answer?');
    expect(screen.getByTestId('choice-option-0')).toHaveTextContent('Right');
    expect(screen.getByTestId('choice-option-1')).toHaveTextContent('Wrong');
  });

  it('calls onSummit once enough correct answers reach the peak height', () => {
    const onSummit = vi.fn();
    render(
      <Climb
        peak={shortPeak}
        difficulty={5}
        characterPreset={preset}
        seed={1}
        onSummit={onSummit}
        onFall={vi.fn()}
      />,
    );
    answerCorrect();
    expect(onSummit).not.toHaveBeenCalled();
    answerCorrect();
    expect(onSummit).not.toHaveBeenCalled();
    answerCorrect();
    expect(onSummit).toHaveBeenCalledTimes(1);
    const [finalState, elapsedMs] = onSummit.mock.calls[0];
    expect(finalState.status).toBe('summited');
    expect(finalState.position).toBe(3);
    expect(typeof elapsedMs).toBe('number');
  });

  it('calls onFall once misses exceed the fall-risk capacity', () => {
    const onFall = vi.fn();
    // Difficulty 1-3 -> fallRiskCapacity 5, so 6 misses fall.
    render(
      <Climb
        peak={shortPeak}
        difficulty={1}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={onFall}
      />,
    );
    for (let i = 0; i < 5; i++) {
      answerWrong();
      expect(onFall).not.toHaveBeenCalled();
    }
    answerWrong();
    expect(onFall).toHaveBeenCalledTimes(1);
    expect(onFall.mock.calls[0][0].status).toBe('fell');
  });

  it('reveals the correct answer and disables the grid during the beat', () => {
    render(
      <Climb
        peak={shortPeak}
        difficulty={5}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('choice-option-1'));
    expect(screen.getByTestId('choice-option-0')).toHaveAttribute('data-state', 'correct');
    expect(screen.getByTestId('choice-option-1')).toHaveAttribute('data-state', 'incorrect');
    expect(screen.getByTestId('choice-option-0')).toBeDisabled();
    expect(screen.getByTestId('climb-explain')).toHaveTextContent('Because Right is right.');
  });

  it('reports every answer via onQuestionAnswered, including correctness and elapsed time', () => {
    const onQuestionAnswered = vi.fn();
    render(
      <Climb
        peak={shortPeak}
        difficulty={5}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={vi.fn()}
        onQuestionAnswered={onQuestionAnswered}
      />,
    );
    fireEvent.click(screen.getByTestId('choice-option-1'));
    expect(onQuestionAnswered).toHaveBeenCalledWith('testType', false, expect.any(Number));
  });

  it('auto-misses on timeout with no answer selected', () => {
    const onQuestionAnswered = vi.fn();
    render(
      <Climb
        peak={shortPeak}
        difficulty={1}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={vi.fn()}
        onQuestionAnswered={onQuestionAnswered}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(FIXED_QUESTION.timeLimitMs);
    });
    expect(onQuestionAnswered).toHaveBeenCalledWith('testType', false, expect.any(Number));
    expect(screen.getByTestId('choice-option-0')).toHaveAttribute('data-state', 'correct');
  });

  it('increments the boost meter on a correct answer and resets it on a miss', () => {
    render(
      <Climb
        peak={shortPeak}
        difficulty={5}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={vi.fn()}
      />,
    );
    expect(screen.queryAllByTestId('boost-pip-filled')).toHaveLength(0);
    // An instant answer (0ms elapsed under fake timers) counts as "fast" -> +2 boost.
    answerCorrect();
    expect(screen.getAllByTestId('boost-pip-filled')).toHaveLength(2);
    answerWrong();
    expect(screen.queryAllByTestId('boost-pip-filled')).toHaveLength(0);
  });

  it('gives only +1 boost for a correct answer past the halfway point of the timer', () => {
    render(
      <Climb
        peak={shortPeak}
        difficulty={5}
        characterPreset={preset}
        seed={1}
        onSummit={vi.fn()}
        onFall={vi.fn()}
      />,
    );
    // Over half of the 5000ms time limit -> not "fast".
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    answerCorrect();
    expect(screen.getAllByTestId('boost-pip-filled')).toHaveLength(1);
  });
});
