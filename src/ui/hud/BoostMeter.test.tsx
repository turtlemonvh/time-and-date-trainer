import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BoostMeter from './BoostMeter';

describe('BoostMeter', () => {
  it('renders one pip per capacity, filling the first `boost` of them', () => {
    render(<BoostMeter boost={2} boostCapacity={5} />);
    expect(screen.getAllByTestId('boost-pip-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('boost-pip-empty')).toHaveLength(3);
  });

  it('renders no filled pips at zero boost', () => {
    render(<BoostMeter boost={0} boostCapacity={5} />);
    expect(screen.queryAllByTestId('boost-pip-filled')).toHaveLength(0);
    expect(screen.getAllByTestId('boost-pip-empty')).toHaveLength(5);
  });

  it('does not mark pips full below capacity', () => {
    render(<BoostMeter boost={4} boostCapacity={5} />);
    for (const pip of screen.getAllByTestId('boost-pip-filled')) {
      expect(pip).not.toHaveAttribute('data-full');
    }
  });

  it('marks pips full once boost reaches capacity', () => {
    render(<BoostMeter boost={5} boostCapacity={5} />);
    const fullPips = screen.getAllByTestId('boost-pip-filled');
    expect(fullPips).toHaveLength(5);
    expect(fullPips.every((pip) => pip.getAttribute('data-full') === 'true')).toBe(true);
  });
});
