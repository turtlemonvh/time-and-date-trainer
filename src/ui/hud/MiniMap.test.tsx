import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MiniMap from './MiniMap';

describe('MiniMap', () => {
  it('shows the position/height label', () => {
    render(<MiniMap position={12} height={20} />);
    expect(screen.getByTestId('mini-map-label')).toHaveTextContent('12 / 20');
  });

  it('fills proportionally to position/height', () => {
    render(<MiniMap position={5} height={20} />);
    expect(screen.getByTestId('mini-map-fill')).toHaveStyle({ height: '25%' });
  });

  it('fills fully at the summit', () => {
    render(<MiniMap position={20} height={20} />);
    expect(screen.getByTestId('mini-map-fill')).toHaveStyle({ height: '100%' });
  });

  it('does not divide by zero when height is 0', () => {
    render(<MiniMap position={0} height={0} />);
    expect(screen.getByTestId('mini-map-fill')).toHaveStyle({ height: '0%' });
  });
});
