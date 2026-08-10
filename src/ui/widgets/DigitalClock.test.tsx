import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DigitalClock from './DigitalClock';

describe('DigitalClock', () => {
  it('formats 12-hour AM/PM by default', () => {
    render(<DigitalClock time={{ hour: 14, minute: 5, second: 0 }} />);
    expect(screen.getByTestId('digital-clock')).toHaveTextContent('2:05 PM');
  });

  it('formats midnight and noon correctly', () => {
    render(<DigitalClock time={{ hour: 0, minute: 0, second: 0 }} />);
    expect(screen.getByTestId('digital-clock')).toHaveTextContent('12:00 AM');
  });

  it('includes seconds when showSeconds is set', () => {
    render(<DigitalClock time={{ hour: 9, minute: 3, second: 7 }} showSeconds />);
    expect(screen.getByTestId('digital-clock')).toHaveTextContent('9:03:07 AM');
  });

  it('formats 24-hour when hour24 is set', () => {
    render(<DigitalClock time={{ hour: 14, minute: 5, second: 0 }} hour24 />);
    expect(screen.getByTestId('digital-clock')).toHaveTextContent('14:05');
  });

  it('includes seconds in 24-hour mode when showSeconds is set', () => {
    render(<DigitalClock time={{ hour: 0, minute: 3, second: 7 }} hour24 showSeconds />);
    expect(screen.getByTestId('digital-clock')).toHaveTextContent('00:03:07');
  });
});
