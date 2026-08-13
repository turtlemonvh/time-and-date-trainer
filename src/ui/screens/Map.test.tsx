import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Map from './Map';
import type { PeakProgress, Profile } from '../../storage/types';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'a',
    name: 'Riley',
    characterId: 'sunny',
    createdAt: 1700000000000,
    progress: {},
    stats: {},
    goals: [],
    climbLog: [],
    ...overrides,
  };
}

function makeProgress(overrides: Partial<PeakProgress> = {}): PeakProgress {
  return {
    difficulty: 1,
    highestDifficultyCleared: null,
    bestTimeMs: null,
    attempts: 0,
    bails: 0,
    ...overrides,
  };
}

describe('Map', () => {
  it('shows the profile name', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByTestId('profile-chip-name')).toHaveTextContent('Riley');
  });

  it('renders all 10 peaks', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    for (let id = 1; id <= 10; id++) {
      expect(screen.getByTestId(`peak-option-${id}`)).toBeInTheDocument();
    }
  });

  it('shows "Not climbed yet" for a peak with no progress', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Not climbed yet');
  });

  it('shows attempt count for a peak that has been tried but not summited', () => {
    const profile = makeProfile({ progress: { 1: makeProgress({ attempts: 2 }) } });
    render(<Map profile={profile} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Attempts: 2');
  });

  it('shows summited status with the highest level cleared', () => {
    const profile = makeProfile({
      progress: {
        1: makeProgress({ highestDifficultyCleared: 5, bestTimeMs: 90000, attempts: 3 }),
      },
    });
    render(<Map profile={profile} onClimb={vi.fn()} onReview={vi.fn()} />);
    const text = screen.getByTestId('peak-progress-1').textContent;
    expect(text).toContain('Summited');
    expect(text).toContain('5');
  });

  it('defaults the level picker to 1 for a never-climbed peak', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('1');
  });

  it('defaults the level picker to one above the highest level cleared', () => {
    const profile = makeProfile({ progress: { 1: makeProgress({ highestDifficultyCleared: 5 }) } });
    render(<Map profile={profile} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('6');
  });

  it('clamps the default suggested level at 10', () => {
    const profile = makeProfile({
      progress: { 1: makeProgress({ highestDifficultyCleared: 10 }) },
    });
    render(<Map profile={profile} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('10');
  });

  it('offers all ten difficulty levels per peak', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    const select = screen.getByTestId('peak-difficulty-1');
    expect(within(select).getAllByRole('option')).toHaveLength(10);
  });

  it('lets the level be changed independently per peak', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    fireEvent.change(screen.getByTestId('peak-difficulty-1'), { target: { value: '7' } });
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('7');
    expect(screen.getByTestId('peak-difficulty-2')).toHaveValue('1');
  });

  it('shows no comparison when the picked level matches the baseline (never-climbed, still at level 1)', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByTestId('peak-difficulty-delta-1')).not.toBeInTheDocument();
  });

  it('shows a comparison once a different level is picked', () => {
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={vi.fn()} />);
    fireEvent.change(screen.getByTestId('peak-difficulty-1'), { target: { value: '9' } });
    const delta = screen.getByTestId('peak-difficulty-delta-1');
    expect(within(delta).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('calls onClimb with the peak id and the currently picked level', () => {
    const onClimb = vi.fn();
    render(<Map profile={makeProfile()} onClimb={onClimb} onReview={vi.fn()} />);
    fireEvent.change(screen.getByTestId('peak-difficulty-3'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('peak-climb-3'));
    expect(onClimb).toHaveBeenCalledWith(3, 6);
  });

  it('every peak is climbable regardless of progress on other peaks (no locking)', () => {
    const onClimb = vi.fn();
    render(<Map profile={makeProfile()} onClimb={onClimb} onReview={vi.fn()} />);
    fireEvent.click(screen.getByTestId('peak-climb-10'));
    expect(onClimb).toHaveBeenCalledWith(10, 1);
  });

  it('calls onReview when the review link is clicked', () => {
    const onReview = vi.fn();
    render(<Map profile={makeProfile()} onClimb={vi.fn()} onReview={onReview} />);
    fireEvent.click(screen.getByTestId('map-review-link'));
    expect(onReview).toHaveBeenCalled();
  });
});
