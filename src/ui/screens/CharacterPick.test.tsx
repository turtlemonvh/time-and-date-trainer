import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CharacterPick from './CharacterPick';
import { CHARACTER_PRESETS } from '../character/presets';

describe('CharacterPick', () => {
  it('renders one option per preset', () => {
    render(<CharacterPick onPick={vi.fn()} />);
    for (const preset of CHARACTER_PRESETS) {
      expect(screen.getByTestId(`character-option-${preset.id}`)).toHaveTextContent(preset.name);
    }
  });

  it("calls onPick with the clicked preset's id", () => {
    const onPick = vi.fn();
    render(<CharacterPick onPick={onPick} />);
    const target = CHARACTER_PRESETS[2];
    fireEvent.click(screen.getByTestId(`character-option-${target.id}`));
    expect(onPick).toHaveBeenCalledWith(target.id);
  });

  it('calls onPick exactly once per click, with the right id each time', () => {
    const onPick = vi.fn();
    render(<CharacterPick onPick={onPick} />);
    fireEvent.click(screen.getByTestId(`character-option-${CHARACTER_PRESETS[0].id}`));
    fireEvent.click(screen.getByTestId(`character-option-${CHARACTER_PRESETS[1].id}`));
    expect(onPick).toHaveBeenNthCalledWith(1, CHARACTER_PRESETS[0].id);
    expect(onPick).toHaveBeenNthCalledWith(2, CHARACTER_PRESETS[1].id);
  });
});
