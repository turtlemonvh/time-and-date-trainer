import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  it('shows no date selected initially', () => {
    render(<DatePicker initialYear={2026} initialMonthIndex={7} />);
    expect(screen.getByTestId('date-picker-value')).toHaveTextContent('No date selected');
  });

  it('shows the picked date after clicking a day', () => {
    render(<DatePicker initialYear={2026} initialMonthIndex={7} />);
    fireEvent.click(screen.getAllByTestId('calendar-day')[9]);
    expect(screen.getByTestId('date-picker-value')).toHaveTextContent('August 10, 2026');
  });

  it('calls onChange with the picked date', () => {
    const onChange = vi.fn();
    render(<DatePicker initialYear={2026} initialMonthIndex={7} onChange={onChange} />);
    fireEvent.click(screen.getAllByTestId('calendar-day')[9]);
    expect(onChange).toHaveBeenCalledWith({ year: 2026, monthIndex: 7, day: 10 });
  });

  it('picks the correct date after navigating to a different month', () => {
    const onChange = vi.fn();
    render(<DatePicker initialYear={2026} initialMonthIndex={7} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('calendar-next-month'));
    fireEvent.click(screen.getAllByTestId('calendar-day')[0]);
    expect(onChange).toHaveBeenCalledWith({ year: 2026, monthIndex: 8, day: 1 });
    expect(screen.getByTestId('date-picker-value')).toHaveTextContent('September 1, 2026');
  });
});
