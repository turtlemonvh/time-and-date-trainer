import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MiniMap from './MiniMap';

describe('MiniMap', () => {
  it('shows the position/height label', () => {
    render(<MiniMap position={12} height={20} />);
    expect(screen.getByTestId('mini-map-label')).toHaveTextContent('12 / 20');
  });

  it('places the marker higher as position rises toward the summit', () => {
    render(<MiniMap position={5} height={20} />);
    const quarterY = Number(screen.getByTestId('mini-map-marker').getAttribute('cy'));

    render(<MiniMap position={15} height={20} />);
    const threeQuarterY = Number(screen.getAllByTestId('mini-map-marker')[1].getAttribute('cy'));

    // Higher up the cliff means a smaller SVG y, since the viewBox's origin
    // is the top.
    expect(threeQuarterY).toBeLessThan(quarterY);
  });

  it('places the marker at its lowest point when position is 0', () => {
    render(<MiniMap position={0} height={20} />);
    const emptyY = Number(screen.getByTestId('mini-map-marker').getAttribute('cy'));

    render(<MiniMap position={20} height={20} />);
    const fullY = Number(screen.getAllByTestId('mini-map-marker')[1].getAttribute('cy'));

    expect(emptyY).toBeGreaterThan(fullY);
  });

  it('does not divide by zero when height is 0', () => {
    render(<MiniMap position={0} height={0} />);
    expect(screen.getByTestId('mini-map-marker')).toHaveAttribute('cy');
    expect(Number.isNaN(Number(screen.getByTestId('mini-map-marker').getAttribute('cy')))).toBe(
      false,
    );
  });
});
