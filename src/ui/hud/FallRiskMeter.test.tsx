import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FallRiskMeter from './FallRiskMeter';

describe('FallRiskMeter', () => {
  it('renders one pip per capacity, filling the first `fallRisk` of them', () => {
    render(<FallRiskMeter fallRisk={2} fallRiskCapacity={4} />);
    expect(screen.getAllByTestId('fall-risk-pip-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('fall-risk-pip-empty')).toHaveLength(2);
  });

  it('renders no filled pips at zero fall risk', () => {
    render(<FallRiskMeter fallRisk={0} fallRiskCapacity={4} />);
    expect(screen.queryAllByTestId('fall-risk-pip-filled')).toHaveLength(0);
  });

  it('renders all pips filled at capacity', () => {
    render(<FallRiskMeter fallRisk={4} fallRiskCapacity={4} />);
    expect(screen.getAllByTestId('fall-risk-pip-filled')).toHaveLength(4);
    expect(screen.queryAllByTestId('fall-risk-pip-empty')).toHaveLength(0);
  });
});
