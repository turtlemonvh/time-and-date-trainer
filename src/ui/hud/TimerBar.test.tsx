import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimerBar from './TimerBar';

describe('TimerBar', () => {
  it('fills to the given fraction', () => {
    render(<TimerBar fraction={0.75} />);
    expect(screen.getByTestId('timer-bar-fill')).toHaveStyle({ width: '75%' });
  });

  it('reports the fraction as a percentage via aria-valuenow', () => {
    render(<TimerBar fraction={0.4} />);
    expect(screen.getByTestId('timer-bar')).toHaveAttribute('aria-valuenow', '40');
  });

  it('clamps a fraction above 1 to full', () => {
    render(<TimerBar fraction={1.5} />);
    expect(screen.getByTestId('timer-bar-fill')).toHaveStyle({ width: '100%' });
  });

  it('clamps a negative fraction to empty', () => {
    render(<TimerBar fraction={-0.2} />);
    expect(screen.getByTestId('timer-bar-fill')).toHaveStyle({ width: '0%' });
  });
});
