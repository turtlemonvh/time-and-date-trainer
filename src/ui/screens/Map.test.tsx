import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Map from './Map';
import type { Profile } from '../../storage/types';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'a',
    name: 'Riley',
    characterId: 'sunny',
    createdAt: 1700000000000,
    settings: { difficulty: 3 },
    progress: {},
    stats: {},
    goals: [],
    climbLog: [],
    ...overrides,
  };
}

describe('Map', () => {
  it('shows the profile name', () => {
    render(<Map profile={makeProfile()} onSetDifficulty={vi.fn()} onSelectPeak={vi.fn()} />);
    expect(screen.getByTestId('profile-chip-name')).toHaveTextContent('Riley');
  });

  it('renders all 10 peaks', () => {
    render(<Map profile={makeProfile()} onSetDifficulty={vi.fn()} onSelectPeak={vi.fn()} />);
    for (let id = 1; id <= 10; id++) {
      expect(screen.getByTestId(`peak-option-${id}`)).toBeInTheDocument();
    }
  });

  it('calls onSelectPeak with the clicked peak id', () => {
    const onSelectPeak = vi.fn();
    render(<Map profile={makeProfile()} onSetDifficulty={vi.fn()} onSelectPeak={onSelectPeak} />);
    fireEvent.click(screen.getByTestId('peak-option-3'));
    expect(onSelectPeak).toHaveBeenCalledWith(3);
  });

  it('shows "Not climbed yet" for a peak with no progress', () => {
    render(<Map profile={makeProfile()} onSetDifficulty={vi.fn()} onSelectPeak={vi.fn()} />);
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Not climbed yet');
  });

  it('shows attempt count for a peak that has been tried but not summited', () => {
    const profile = makeProfile({
      progress: {
        1: {
          difficulty: 3,
          highestDifficultyCleared: null,
          bestTimeMs: null,
          attempts: 2,
          bails: 0,
        },
      },
    });
    render(<Map profile={profile} onSetDifficulty={vi.fn()} onSelectPeak={vi.fn()} />);
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Attempts: 2');
  });

  it('shows summited status for a summited peak', () => {
    const profile = makeProfile({
      progress: {
        1: { difficulty: 3, highestDifficultyCleared: 3, bestTimeMs: 90000, attempts: 3, bails: 0 },
      },
    });
    render(<Map profile={profile} onSetDifficulty={vi.fn()} onSelectPeak={vi.fn()} />);
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Summited');
  });

  it('shows the current difficulty and reports changes via onSetDifficulty', () => {
    const onSetDifficulty = vi.fn();
    render(
      <Map
        profile={makeProfile({ settings: { difficulty: 7 } })}
        onSetDifficulty={onSetDifficulty}
        onSelectPeak={vi.fn()}
      />,
    );
    expect(screen.getByTestId('map-difficulty')).toHaveValue('7');
    fireEvent.change(screen.getByTestId('map-difficulty'), { target: { value: '9' } });
    expect(onSetDifficulty).toHaveBeenCalledWith(9);
  });

  it('offers all ten difficulty levels', () => {
    render(<Map profile={makeProfile()} onSetDifficulty={vi.fn()} onSelectPeak={vi.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(10);
  });

  it('every peak is clickable regardless of progress on other peaks (no locking)', () => {
    const onSelectPeak = vi.fn();
    render(<Map profile={makeProfile()} onSetDifficulty={vi.fn()} onSelectPeak={onSelectPeak} />);
    fireEvent.click(screen.getByTestId('peak-option-10'));
    expect(onSelectPeak).toHaveBeenCalledWith(10);
  });
});
