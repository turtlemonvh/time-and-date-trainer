import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Intro from './Intro';

describe('Intro', () => {
  it('calls onContinue when the button is clicked', () => {
    const onContinue = vi.fn();
    render(<Intro onContinue={onContinue} />);
    fireEvent.click(screen.getByTestId('intro-continue'));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
