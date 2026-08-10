import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewPlayer from './PreviewPlayer';

describe('PreviewPlayer', () => {
  it('renders the first question of a 12-question batch', () => {
    render(<PreviewPlayer initialSeed={1} />);
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 1 of 12');
  });

  it('shows the prompt, the answer choices, and the explanation', () => {
    render(<PreviewPlayer initialSeed={1} />);
    const card = screen.getByTestId('preview-card');
    expect(within(card).getByTestId('preview-prompt').textContent).not.toBe('');
    expect(within(card).getByTestId('preview-explain').textContent).not.toBe('');
    expect(within(card).getByTestId('choice-grid')).toBeInTheDocument();
    expect(within(card).getAllByTestId(/^choice-option-/).length).toBeGreaterThanOrEqual(2);
  });

  it("renders the real AnalogClock widget for readAnalog's display (index 0, by generator registration order)", () => {
    render(<PreviewPlayer initialSeed={1} />);
    expect(
      within(screen.getByTestId('preview-display')).getByTestId('analog-clock'),
    ).toBeInTheDocument();
  });

  it('renders the real CalendarMonth widget for readCalendar questions', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    // readAnalog(0-2), describeTime(3-5), readCalendar(6-8): 6 clicks reaches index 6.
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByTestId('preview-next'));
    }
    expect(
      within(screen.getByTestId('preview-display')).getByTestId('calendar-month'),
    ).toBeInTheDocument();
  });

  it('renders no display widget for offsetDate questions (display kind "none")', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    // readAnalog(0-2), describeTime(3-5), readCalendar(6-8), offsetDate(9-11): 9 clicks reaches index 9.
    for (let i = 0; i < 9; i++) {
      await user.click(screen.getByTestId('preview-next'));
    }
    expect(screen.getByTestId('preview-display')).toBeEmptyDOMElement();
  });

  it('reveals correctness when an option is picked, and resets on the next question', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    const firstOption = screen.getAllByTestId(/^choice-option-/)[0];
    expect(firstOption).not.toHaveAttribute('data-state');
    await user.click(firstOption);
    expect(firstOption).toHaveAttribute('data-state');

    await user.click(screen.getByTestId('preview-next'));
    for (const option of screen.getAllByTestId(/^choice-option-/)) {
      expect(option).not.toHaveAttribute('data-state');
    }
  });

  it('advances to the next question when Next is clicked', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    const firstPrompt = screen.getByTestId('preview-prompt').textContent;
    await user.click(screen.getByTestId('preview-next'));
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 2 of 12');
    // Not a strict requirement that the prompt text differs (two generators could
    // coincidentally produce the same prompt), but the progress counter moving is.
    void firstPrompt;
  });

  it('advances when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 2 of 12');
  });

  it('does not advance when Enter is pressed inside a select', () => {
    render(<PreviewPlayer initialSeed={1} />);
    fireEvent.keyDown(screen.getByTestId('preview-difficulty'), { key: 'Enter' });
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 1 of 12');
  });

  it('wraps to a fresh batch after the last question', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    for (let i = 0; i < 12; i++) {
      await user.click(screen.getByTestId('preview-next'));
    }
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 1 of 12');
  });

  it('resets to question 1 and regenerates when difficulty changes', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    await user.click(screen.getByTestId('preview-next'));
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 2 of 12');
    await user.selectOptions(screen.getByTestId('preview-difficulty'), '9');
    expect(screen.getByTestId('preview-difficulty')).toHaveValue('9');
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 1 of 12');
  });

  it('resets to question 1 and regenerates when peak changes', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    const firstQuestionId = screen.getByTestId('preview-id').textContent;
    await user.click(screen.getByTestId('preview-next'));
    await user.selectOptions(screen.getByTestId('preview-peak'), '3');
    expect(screen.getByTestId('preview-peak')).toHaveValue('3');
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 1 of 12');
    // Same seed, different peak: the batch content must actually change, not
    // just the index — otherwise the Peak selector silently does nothing.
    expect(screen.getByTestId('preview-id').textContent).not.toBe(firstQuestionId);
  });

  it('regenerates and resets to question 1 when Regenerate is clicked', async () => {
    const user = userEvent.setup();
    render(<PreviewPlayer initialSeed={1} />);
    await user.click(screen.getByTestId('preview-next'));
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(screen.getByTestId('preview-progress').textContent).toBe('Question 1 of 12');
  });

  it('offers all ten difficulties and all ten peaks', () => {
    render(<PreviewPlayer initialSeed={1} />);
    expect(within(screen.getByTestId('preview-difficulty')).getAllByRole('option')).toHaveLength(
      10,
    );
    expect(within(screen.getByTestId('preview-peak')).getAllByRole('option')).toHaveLength(10);
  });
});
