import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileChip from './ProfileChip';

describe('ProfileChip', () => {
  it('shows the profile name', () => {
    render(<ProfileChip name="Riley" />);
    expect(screen.getByTestId('profile-chip-name')).toHaveTextContent('Riley');
  });

  it('omits the preview slot when none is given', () => {
    render(<ProfileChip name="Riley" />);
    expect(screen.queryByTestId('profile-chip-preview')).not.toBeInTheDocument();
  });

  it('renders a caller-supplied preview', () => {
    render(<ProfileChip name="Riley" preview={<span data-testid="stand-in-preview">🧗</span>} />);
    expect(screen.getByTestId('profile-chip-preview')).toBeInTheDocument();
    expect(screen.getByTestId('stand-in-preview')).toBeInTheDocument();
  });
});
