import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebugSpritesPage from './DebugSpritesPage';
import { climberPalettes } from '../pixel/sprites/climber';

describe('DebugSpritesPage', () => {
  it('renders one row per climber palette variant', () => {
    render(<DebugSpritesPage />);
    expect(screen.getAllByTestId('sprite-palette-row')).toHaveLength(climberPalettes.length);
  });

  it('renders every sprite at every configured scale', () => {
    const { container } = render(<DebugSpritesPage />);
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(climberPalettes.length * 3);
  });
});
