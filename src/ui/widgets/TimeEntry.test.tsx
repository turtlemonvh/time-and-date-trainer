import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TimeEntry from './TimeEntry';

describe('TimeEntry', () => {
  it('shows hour, minute, and AM/PM selects by default, but no seconds', () => {
    render(<TimeEntry time={{ hour: 9, minute: 5, second: 0 }} onChange={vi.fn()} />);
    expect(screen.getByTestId('time-entry-hour')).toBeInTheDocument();
    expect(screen.getByTestId('time-entry-minute')).toBeInTheDocument();
    expect(screen.getByTestId('time-entry-period')).toBeInTheDocument();
    expect(screen.queryByTestId('time-entry-second')).not.toBeInTheDocument();
  });

  it('shows a seconds select when showSeconds is set', () => {
    render(<TimeEntry time={{ hour: 9, minute: 5, second: 0 }} onChange={vi.fn()} showSeconds />);
    expect(screen.getByTestId('time-entry-second')).toBeInTheDocument();
  });

  it('hides the AM/PM select in 24-hour mode', () => {
    render(<TimeEntry time={{ hour: 9, minute: 5, second: 0 }} onChange={vi.fn()} hour24 />);
    expect(screen.queryByTestId('time-entry-period')).not.toBeInTheDocument();
  });

  it('reports the new minute unchanged from the hour when the minute select changes', () => {
    const onChange = vi.fn();
    render(<TimeEntry time={{ hour: 9, minute: 5, second: 0 }} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('time-entry-minute'), { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith({ hour: 9, minute: 30, second: 0 });
  });

  it('converts the 12-hour select to the correct 24-hour value, preserving AM/PM', () => {
    const onChange = vi.fn();
    render(<TimeEntry time={{ hour: 14, minute: 0, second: 0 }} onChange={onChange} />);
    // Currently 2 PM; switching the hour select to "5" should stay PM -> 17.
    fireEvent.change(screen.getByTestId('time-entry-hour'), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 17 }));
  });

  it('flipping AM/PM converts the hour correctly', () => {
    const onChange = vi.fn();
    render(<TimeEntry time={{ hour: 9, minute: 0, second: 0 }} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('time-entry-period'), { target: { value: 'PM' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 21 }));
  });

  it('handles the 12-hour boundary correctly (12 AM = hour 0, 12 PM = hour 12)', () => {
    const onChangeAM = vi.fn();
    render(<TimeEntry time={{ hour: 5, minute: 0, second: 0 }} onChange={onChangeAM} />);
    fireEvent.change(screen.getByTestId('time-entry-hour'), { target: { value: '12' } });
    expect(onChangeAM).toHaveBeenCalledWith(expect.objectContaining({ hour: 0 }));

    const onChangePM = vi.fn();
    render(<TimeEntry time={{ hour: 17, minute: 0, second: 0 }} onChange={onChangePM} />);
    fireEvent.change(screen.getAllByTestId('time-entry-hour')[1], { target: { value: '12' } });
    expect(onChangePM).toHaveBeenCalledWith(expect.objectContaining({ hour: 12 }));
  });

  it('in 24-hour mode, the hour select reports the value verbatim', () => {
    const onChange = vi.fn();
    render(<TimeEntry time={{ hour: 9, minute: 0, second: 0 }} onChange={onChange} hour24 />);
    fireEvent.change(screen.getByTestId('time-entry-hour'), { target: { value: '23' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 23 }));
  });
});
