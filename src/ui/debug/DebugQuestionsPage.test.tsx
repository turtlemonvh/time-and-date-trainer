import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugQuestionsPage from './DebugQuestionsPage';

function questionIds(): string[] {
  return screen.getAllByTestId('question-id').map((el) => el.textContent ?? '');
}

describe('DebugQuestionsPage', () => {
  it('renders three questions for each of the nine generators', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    expect(screen.getAllByTestId('question-card')).toHaveLength(27);
  });

  it('shows every registered question type', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    for (const typeId of [
      'readAnalog',
      'describeTime',
      'readCalendar',
      'offsetDate',
      'elapsedAdd',
      'elapsedBetween',
      'setHands',
      'dayOfWeek',
      'nthWeekday',
    ]) {
      expect(screen.getAllByText(typeId).length).toBe(3);
    }
  });

  it('marks exactly one option correct on every choice-kind card, and shows an answer summary otherwise', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    for (const card of screen.getAllByTestId('question-card')) {
      const correctOptions = within(card).queryAllByTestId('correct-option');
      if (correctOptions.length > 0) {
        expect(correctOptions).toHaveLength(1);
        expect(within(card).getAllByTestId('option')).toHaveLength(3);
      } else {
        expect(within(card).getByTestId('question-answer').textContent).not.toBe('');
      }
    }
  });

  it('shows the prompt, the display summary, and the explanation on every card', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    for (const card of screen.getAllByTestId('question-card')) {
      expect(within(card).getByTestId('question-prompt').textContent).not.toBe('');
      expect(within(card).getByTestId('question-display').textContent).not.toBe('');
      expect(within(card).getByTestId('question-explain').textContent).not.toBe('');
      expect(within(card).getByTestId('question-time-limit').textContent).toMatch(/\d+ ms/);
    }
  });

  it('dumps the raw display spec as JSON for inspection', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    const dumps = screen.getAllByTestId('display-json');
    expect(dumps).toHaveLength(27);
    for (const dump of dumps) {
      expect(() => JSON.parse(dump.textContent ?? '')).not.toThrow();
    }
  });

  it('generates a different batch when Regenerate is clicked', async () => {
    const user = userEvent.setup();
    render(<DebugQuestionsPage initialSeed={1} />);
    const before = questionIds();
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    const after = questionIds();
    expect(after).toHaveLength(27);
    expect(after).not.toEqual(before);
  });

  it('regenerates when the difficulty changes', async () => {
    const user = userEvent.setup();
    render(<DebugQuestionsPage initialSeed={1} />);
    const before = questionIds();
    await user.selectOptions(screen.getByLabelText('Difficulty'), '9');
    expect(screen.getByLabelText('Difficulty')).toHaveValue('9');
    expect(questionIds()).not.toEqual(before);
  });

  it('offers all ten difficulties and all ten peaks', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    expect(within(screen.getByLabelText('Difficulty')).getAllByRole('option')).toHaveLength(10);
    expect(within(screen.getByLabelText('Peak')).getAllByRole('option')).toHaveLength(10);
  });

  it('regenerates when the peak changes', async () => {
    const user = userEvent.setup();
    render(<DebugQuestionsPage initialSeed={1} />);
    const before = questionIds();
    await user.selectOptions(screen.getByLabelText('Peak'), '3');
    expect(screen.getByLabelText('Peak')).toHaveValue('3');
    expect(questionIds()).not.toEqual(before);
  });

  it('shows the seed so a batch can be reproduced', () => {
    render(<DebugQuestionsPage initialSeed={4242} />);
    expect(screen.getByTestId('seed').textContent).toBe('4242');
  });

  it('produces the same batch of question ids for the same seed, difficulty, and peak', () => {
    const { unmount } = render(<DebugQuestionsPage initialSeed={4242} />);
    const first = questionIds();
    unmount();

    render(<DebugQuestionsPage initialSeed={4242} />);
    const second = questionIds();

    expect(second).toEqual(first);
  });
});
