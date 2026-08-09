import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebugRouter from './DebugRouter';

describe('DebugRouter', () => {
  it('renders the questions page at /debug/questions', () => {
    render(<DebugRouter pathname="/debug/questions" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Debug: questions' })).toBeInTheDocument();
  });

  it('tolerates a trailing slash', () => {
    render(<DebugRouter pathname="/debug/questions/" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Debug: questions' })).toBeInTheDocument();
  });

  it('shows an index for a debug route that does not exist yet', () => {
    render(<DebugRouter pathname="/debug/sprites" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Unknown debug route' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '/debug/questions' })).toBeInTheDocument();
  });

  it('shows the index for a path outside /debug/ entirely', () => {
    render(<DebugRouter pathname="/" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Unknown debug route' }),
    ).toBeInTheDocument();
  });
});
