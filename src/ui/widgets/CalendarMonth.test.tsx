import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CalendarMonth from './CalendarMonth';

describe('CalendarMonth', () => {
  it('renders the correct weekday alignment and day count for a known month', () => {
    // August 2026: 1st is a Saturday, 31 days.
    render(<CalendarMonth year={2026} monthIndex={7} />);
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent('August 2026');
    const days = screen.getAllByTestId('calendar-day');
    expect(days).toHaveLength(31);
    expect(days[0]).toHaveTextContent('1');
    expect(days[30]).toHaveTextContent('31');
  });

  it('highlights the given day only while its month is in view', () => {
    render(<CalendarMonth year={2026} monthIndex={7} highlightDay={15} />);
    expect(screen.getByTestId('calendar-day-highlighted')).toHaveTextContent('15');

    fireEvent.click(screen.getByTestId('calendar-next-month'));
    expect(screen.queryByTestId('calendar-day-highlighted')).not.toBeInTheDocument();
  });

  it('gives the highlighted day a visibly different background, not just a different testid', () => {
    render(<CalendarMonth year={2026} monthIndex={7} highlightDay={15} />);
    const highlighted = screen.getByTestId('calendar-day-highlighted');
    const plain = screen.getAllByTestId('calendar-day')[0];
    expect(highlighted.style.background).not.toBe('');
    expect(highlighted.style.background).not.toBe(plain.style.background);
  });

  it('navigates to the next month, wrapping the year at December', () => {
    render(<CalendarMonth year={2025} monthIndex={11} />);
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent('December 2025');
    fireEvent.click(screen.getByTestId('calendar-next-month'));
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent('January 2026');
  });

  it('navigates to the previous month, wrapping the year at January', () => {
    render(<CalendarMonth year={2026} monthIndex={0} />);
    fireEvent.click(screen.getByTestId('calendar-prev-month'));
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent('December 2025');
  });

  it('handles a leap-year February correctly', () => {
    render(<CalendarMonth year={2024} monthIndex={1} />);
    expect(screen.getAllByTestId('calendar-day')).toHaveLength(29);
  });

  it('renders day cells as plain text when no onDayClick is given', () => {
    const { container } = render(<CalendarMonth year={2026} monthIndex={7} />);
    const grid = within(container).getByRole('grid');
    expect(grid.querySelector('button[data-testid="calendar-day"]')).toBeNull();
  });

  it('makes day cells clickable and reports the clicked day when onDayClick is given', () => {
    const onDayClick = vi.fn();
    render(<CalendarMonth year={2026} monthIndex={7} onDayClick={onDayClick} />);
    fireEvent.click(screen.getAllByTestId('calendar-day')[9]);
    expect(onDayClick).toHaveBeenCalledWith(10, 2026, 7);
  });
});
