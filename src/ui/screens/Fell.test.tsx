import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Fell from './Fell';
import { CHARACTER_PRESETS } from '../character/presets';
import type { Peak } from '../../engine/peaks';

const peak: Peak = { id: 1, name: 'Basecamp Bluff', emphasis: 'Reading analog clocks', height: 20 };
const preset = CHARACTER_PRESETS[0];

describe('Fell', () => {
  it('shows the peak name', () => {
    render(<Fell peak={peak} characterPreset={preset} onRetry={vi.fn()} onReturnToMap={vi.fn()} />);
    expect(screen.getByRole('main')).toHaveTextContent('Basecamp Bluff');
  });

  it('calls onRetry when "Try Again" is clicked', () => {
    const onRetry = vi.fn();
    render(<Fell peak={peak} characterPreset={preset} onRetry={onRetry} onReturnToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('fell-retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('calls onReturnToMap when "Back to Map" is clicked', () => {
    const onReturnToMap = vi.fn();
    render(
      <Fell peak={peak} characterPreset={preset} onRetry={vi.fn()} onReturnToMap={onReturnToMap} />,
    );
    fireEvent.click(screen.getByTestId('fell-map'));
    expect(onReturnToMap).toHaveBeenCalledOnce();
  });
});
