import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Summit from './Summit';
import { CHARACTER_PRESETS } from '../character/presets';
import type { Peak } from '../../engine/peaks';

const peak: Peak = { id: 1, name: 'Basecamp Bluff', emphasis: 'Reading analog clocks', height: 20 };
const preset = CHARACTER_PRESETS[0];

describe('Summit', () => {
  it('shows the peak name', () => {
    render(<Summit peak={peak} characterPreset={preset} elapsedMs={45000} onContinue={vi.fn()} />);
    expect(screen.getByRole('main')).toHaveTextContent('Basecamp Bluff');
  });

  it('formats a sub-minute time in seconds', () => {
    render(<Summit peak={peak} characterPreset={preset} elapsedMs={45000} onContinue={vi.fn()} />);
    expect(screen.getByTestId('summit-time')).toHaveTextContent('45s');
  });

  it('formats a time over a minute as minutes and seconds', () => {
    render(<Summit peak={peak} characterPreset={preset} elapsedMs={92000} onContinue={vi.fn()} />);
    expect(screen.getByTestId('summit-time')).toHaveTextContent('1m 32s');
  });

  it('rounds to the nearest second', () => {
    render(<Summit peak={peak} characterPreset={preset} elapsedMs={45600} onContinue={vi.fn()} />);
    expect(screen.getByTestId('summit-time')).toHaveTextContent('46s');
  });

  it('calls onContinue when clicked', () => {
    const onContinue = vi.fn();
    render(
      <Summit peak={peak} characterPreset={preset} elapsedMs={45000} onContinue={onContinue} />,
    );
    fireEvent.click(screen.getByTestId('summit-continue'));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
