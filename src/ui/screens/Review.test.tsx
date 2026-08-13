import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Review from './Review';

describe('Review', () => {
  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<Review onBack={onBack} />);
    fireEvent.click(screen.getByTestId('review-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows the curriculum browser with a peak and difficulty selector', () => {
    render(<Review onBack={vi.fn()} />);
    expect(screen.getByTestId('review-peak')).toBeInTheDocument();
    expect(screen.getByTestId('review-difficulty')).toBeInTheDocument();
  });

  it('offers all 10 peaks and all 10 difficulty levels', () => {
    render(<Review onBack={vi.fn()} />);
    expect(within(screen.getByTestId('review-peak')).getAllByRole('option')).toHaveLength(10);
    expect(within(screen.getByTestId('review-difficulty')).getAllByRole('option')).toHaveLength(10);
  });

  it('shows difficulty bullets that change with the selected level', () => {
    render(<Review onBack={vi.fn()} />);
    const before = screen.getByTestId('review-difficulty-bullets').textContent;
    fireEvent.change(screen.getByTestId('review-difficulty'), { target: { value: '10' } });
    const after = screen.getByTestId('review-difficulty-bullets').textContent;
    expect(after).not.toEqual(before);
  });

  it('shows sample questions for the selected peak and difficulty', () => {
    render(<Review onBack={vi.fn()} />);
    const samples = screen.getAllByTestId('review-sample-question');
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(within(sample).getByTestId('review-sample-prompt').textContent).not.toEqual('');
    }
  });

  it('regenerates sample questions deterministically for the same peak+difficulty', () => {
    const { unmount } = render(<Review onBack={vi.fn()} />);
    const first = screen.getByTestId('review-sample-questions').textContent;
    unmount();
    render(<Review onBack={vi.fn()} />);
    const second = screen.getByTestId('review-sample-questions').textContent;
    expect(second).toEqual(first);
  });

  it('only ever shows questions on-theme for the selected peak', () => {
    render(<Review onBack={vi.fn()} />);
    // Peak 1 (Basecamp Bluff) is matched exclusively to readAnalog, whose
    // display renders as an analog clock — never a calendar or "no visual".
    for (const sample of screen.getAllByTestId('review-sample-question')) {
      expect(sample.textContent).toContain('analog clock');
    }
  });

  it('switches sample questions when a different peak is selected', () => {
    render(<Review onBack={vi.fn()} />);
    const before = screen.getByTestId('review-sample-questions').textContent;
    fireEvent.change(screen.getByTestId('review-peak'), { target: { value: '3' } });
    const after = screen.getByTestId('review-sample-questions').textContent;
    expect(after).not.toEqual(before);
  });
});
