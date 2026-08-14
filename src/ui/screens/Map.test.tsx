import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Map from './Map';
import type { ClimbLogEntry, PeakProgress, Profile } from '../../storage/types';

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

function makeLogEntry(overrides: Partial<ClimbLogEntry> = {}): ClimbLogEntry {
  return {
    id: 'log-1',
    peakId: 1,
    difficulty: 1,
    startedAt: 1700000000000,
    endedAt: 1700000010000,
    result: 'fell',
    ...overrides,
  };
}

/** Every Map render needs all three callbacks — this bundles the two that
 * most tests don't care about so each test only names what it actually
 * exercises. */
function renderMap(profile: Profile, overrides: Partial<Parameters<typeof Map>[0]> = {}) {
  return render(
    <Map
      profile={profile}
      onClimb={vi.fn()}
      onReview={vi.fn()}
      onViewFullHistory={vi.fn()}
      {...overrides}
    />,
  );
}

/** The comparison table and history live behind a `<details>` disclosure —
 * open it the way a real player would before asserting on its contents. */
function openDetails(peakId: number) {
  fireEvent.click(screen.getByTestId(`peak-details-toggle-${peakId}`));
}

describe('Map', () => {
  it('shows the profile name', () => {
    renderMap(makeProfile());
    expect(screen.getByTestId('profile-chip-name')).toHaveTextContent('Riley');
  });

  it('renders all 10 peaks', () => {
    renderMap(makeProfile());
    for (let id = 1; id <= 10; id++) {
      expect(screen.getByTestId(`peak-option-${id}`)).toBeInTheDocument();
    }
  });

  it('shows "Not climbed yet" when there is no progress and no climb-log entry', () => {
    renderMap(makeProfile());
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Not climbed yet');
  });

  it('shows a "Tried" pill when a fall/bail was logged above the cleared level', () => {
    const profile = makeProfile({
      climbLog: [
        makeLogEntry({ peakId: 1, difficulty: 4 }),
        makeLogEntry({ peakId: 1, difficulty: 4 }),
      ],
    });
    renderMap(profile);
    const text = screen.getByTestId('peak-progress-1').textContent;
    expect(text).toContain('Tried Lv 4');
    expect(text).toContain('2');
  });

  it('shows summited status with the highest level cleared', () => {
    const profile = makeProfile({
      progress: {
        1: makeProgress({ highestDifficultyCleared: 5, bestTimeMs: 90000, attempts: 3 }),
      },
    });
    renderMap(profile);
    const text = screen.getByTestId('peak-progress-1').textContent;
    expect(text).toContain('Summited');
    expect(text).toContain('5');
  });

  it('shows both pills together when summited and also tried a harder level', () => {
    const profile = makeProfile({
      progress: { 1: makeProgress({ highestDifficultyCleared: 4 }) },
      climbLog: [makeLogEntry({ peakId: 1, difficulty: 7 })],
    });
    renderMap(profile);
    expect(screen.getByTestId('peak-status-summit-1')).toHaveTextContent('4');
    expect(screen.getByTestId('peak-status-attempt-1')).toHaveTextContent('7');
  });

  it('defaults the level picker to 1 for a never-climbed peak', () => {
    renderMap(makeProfile());
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('1');
  });

  it('defaults the level picker to one above the highest level cleared', () => {
    const profile = makeProfile({ progress: { 1: makeProgress({ highestDifficultyCleared: 5 }) } });
    renderMap(profile);
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('6');
  });

  it('clamps the default suggested level at 10', () => {
    const profile = makeProfile({
      progress: { 1: makeProgress({ highestDifficultyCleared: 10 }) },
    });
    renderMap(profile);
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('10');
  });

  it('offers all ten difficulty levels per peak', () => {
    renderMap(makeProfile());
    const select = screen.getByTestId('peak-difficulty-1');
    expect(within(select).getAllByRole('option')).toHaveLength(10);
  });

  it('lets the level be changed independently per peak', () => {
    renderMap(makeProfile());
    fireEvent.change(screen.getByTestId('peak-difficulty-1'), { target: { value: '7' } });
    expect(screen.getByTestId('peak-difficulty-1')).toHaveValue('7');
    expect(screen.getByTestId('peak-difficulty-2')).toHaveValue('1');
  });

  it('calls onClimb with the peak id and the currently picked level', () => {
    const onClimb = vi.fn();
    renderMap(makeProfile(), { onClimb });
    fireEvent.change(screen.getByTestId('peak-difficulty-3'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('peak-climb-3'));
    expect(onClimb).toHaveBeenCalledWith(3, 6);
  });

  it('every peak is climbable regardless of progress on other peaks (no locking)', () => {
    const onClimb = vi.fn();
    renderMap(makeProfile(), { onClimb });
    fireEvent.click(screen.getByTestId('peak-climb-10'));
    expect(onClimb).toHaveBeenCalledWith(10, 1);
  });

  it('calls onReview when the review link is clicked', () => {
    const onReview = vi.fn();
    renderMap(makeProfile(), { onReview });
    fireEvent.click(screen.getByTestId('map-review-link'));
    expect(onReview).toHaveBeenCalled();
  });

  describe('level details', () => {
    it("shows a comparison table filtered to peak 1 (Basecamp Bluff)'s relevant dimensions", () => {
      // readAnalog-only, so no calendar/date rows — see difficultyDescribe.ts.
      renderMap(makeProfile());
      openDetails(1);
      const rows = screen.getAllByTestId('peak-compare-row-1');
      const items = rows.map((row) => row.textContent);
      expect(items.some((t) => t?.includes('Clock precision'))).toBe(true);
      expect(items.some((t) => t?.includes('Dates'))).toBe(false);
      expect(items.some((t) => t?.includes('Time-in-words'))).toBe(false);
    });

    it('flags a row as changed once a different level is picked', () => {
      renderMap(makeProfile());
      openDetails(1);
      fireEvent.change(screen.getByTestId('peak-difficulty-1'), { target: { value: '10' } });
      const rows = screen.getAllByTestId('peak-compare-row-1');
      expect(rows.some((row) => row.dataset.changed === 'true')).toBe(true);
    });

    it('marks no row as changed when the picked level matches the baseline', () => {
      renderMap(makeProfile());
      openDetails(1);
      const rows = screen.getAllByTestId('peak-compare-row-1');
      expect(rows.every((row) => row.dataset.changed === 'false')).toBe(true);
    });

    it('shows "No climbs at this level yet" when there is no history at the picked level', () => {
      renderMap(makeProfile());
      openDetails(1);
      expect(screen.getByTestId('peak-history-empty-1')).toBeInTheDocument();
    });

    it('lists climb-log entries at the picked level, newest first', () => {
      const profile = makeProfile({
        climbLog: [
          makeLogEntry({ id: 'older', peakId: 1, difficulty: 1, startedAt: 1700000000000 }),
          makeLogEntry({ id: 'newer', peakId: 1, difficulty: 1, startedAt: 1700100000000 }),
          makeLogEntry({ id: 'other-level', peakId: 1, difficulty: 2, startedAt: 1700100000000 }),
        ],
      });
      renderMap(profile);
      openDetails(1);
      const rows = screen.getAllByTestId('peak-history-row-1');
      expect(rows).toHaveLength(2);
      expect(within(rows[0]).getByText(/Fell/)).toBeInTheDocument();
    });

    it('shows only the 5 most recent entries plus a "see all" link beyond that', () => {
      const entries = Array.from({ length: 7 }, (_, i) =>
        makeLogEntry({
          id: `e${i}`,
          peakId: 1,
          difficulty: 1,
          startedAt: 1700000000000 + i * 1000,
        }),
      );
      const profile = makeProfile({ climbLog: entries });
      renderMap(profile);
      openDetails(1);
      expect(screen.getAllByTestId('peak-history-row-1')).toHaveLength(5);
      expect(screen.getByTestId('peak-history-more-1')).toHaveTextContent('7');
    });

    it('does not show a "see all" link when there are 5 or fewer entries', () => {
      const entries = Array.from({ length: 5 }, (_, i) =>
        makeLogEntry({
          id: `e${i}`,
          peakId: 1,
          difficulty: 1,
          startedAt: 1700000000000 + i * 1000,
        }),
      );
      renderMap(makeProfile({ climbLog: entries }));
      openDetails(1);
      expect(screen.queryByTestId('peak-history-more-1')).not.toBeInTheDocument();
    });

    it('calls onViewFullHistory with the peak id and picked level', () => {
      const onViewFullHistory = vi.fn();
      const entries = Array.from({ length: 6 }, (_, i) =>
        makeLogEntry({
          id: `e${i}`,
          peakId: 1,
          difficulty: 1,
          startedAt: 1700000000000 + i * 1000,
        }),
      );
      renderMap(makeProfile({ climbLog: entries }), { onViewFullHistory });
      openDetails(1);
      fireEvent.click(screen.getByTestId('peak-history-more-1'));
      expect(onViewFullHistory).toHaveBeenCalledWith(1, 1);
    });

    it('re-filters history when a different level is picked', () => {
      const profile = makeProfile({
        climbLog: [makeLogEntry({ peakId: 1, difficulty: 1 })],
      });
      renderMap(profile);
      openDetails(1);
      expect(screen.getByTestId('peak-history-row-1')).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('peak-difficulty-1'), { target: { value: '5' } });
      expect(screen.queryByTestId('peak-history-row-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('peak-history-empty-1')).toBeInTheDocument();
    });
  });
});
