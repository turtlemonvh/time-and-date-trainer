import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Review from './Review';
import { buildClimbLogCsv } from '../climbLogCsv';
import type { ClimbLogEntry, Goal, Profile } from '../../storage/types';

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

function makeLogEntry(overrides: Partial<ClimbLogEntry> = {}): ClimbLogEntry {
  return {
    id: 'log-1',
    peakId: 1,
    difficulty: 4,
    startedAt: 1700000000000,
    endedAt: 1700000092000,
    result: 'summited',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    peakId: 1,
    difficulty: 5,
    targetDate: '2026-12-01',
    createdAt: 1700000000000,
    achievedAt: null,
    ...overrides,
  };
}

/** Every Review render needs all four callbacks — bundles the three most
 * tests don't care about so each test only names what it exercises. */
function renderReview(profile: Profile, overrides: Partial<Parameters<typeof Review>[0]> = {}) {
  return render(
    <Review
      profile={profile}
      onBack={vi.fn()}
      onAddGoal={vi.fn()}
      onImportProfile={vi.fn()}
      {...overrides}
    />,
  );
}

/** Clicks a difficulty pagination page button — the curriculum tab's
 * replacement for the old difficulty `<select>`. */
function pickDifficultyPage(level: number) {
  fireEvent.click(screen.getByTestId(`review-difficulty-page-${level}`));
}

describe('Review', () => {
  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    renderReview(makeProfile(), { onBack });
    fireEvent.click(screen.getByTestId('review-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows the curriculum browser with a peak selector and difficulty pagination', () => {
    renderReview(makeProfile());
    expect(screen.getByTestId('review-peak')).toBeInTheDocument();
    expect(screen.getByTestId('review-difficulty')).toBeInTheDocument();
  });

  it('offers all 10 peaks and all 10 difficulty pages', () => {
    renderReview(makeProfile());
    expect(within(screen.getByTestId('review-peak')).getAllByRole('option')).toHaveLength(10);
    expect(screen.getAllByTestId(/^review-difficulty-page-\d+$/)).toHaveLength(10);
  });

  it('disables the prev/next pagination arrows at the edges', () => {
    renderReview(makeProfile());
    expect(screen.getByTestId('review-difficulty-prev')).toBeDisabled();
    pickDifficultyPage(10);
    expect(screen.getByTestId('review-difficulty-next')).toBeDisabled();
  });

  it('steps forward/back a level via the prev/next arrows', () => {
    renderReview(makeProfile());
    pickDifficultyPage(5);
    fireEvent.click(screen.getByTestId('review-difficulty-next'));
    const before = screen.getByTestId('review-difficulty-bullets').textContent;
    fireEvent.click(screen.getByTestId('review-difficulty-prev'));
    fireEvent.click(screen.getByTestId('review-difficulty-prev'));
    const after = screen.getByTestId('review-difficulty-bullets').textContent;
    expect(after).not.toEqual(before);
  });

  it('shows difficulty bullets, two columns, that change with the selected level', () => {
    renderReview(makeProfile());
    const bullets = screen.getByTestId('review-difficulty-bullets');
    expect(bullets).toHaveStyle({ columns: '2' });
    const before = bullets.textContent;
    pickDifficultyPage(10);
    const after = screen.getByTestId('review-difficulty-bullets').textContent;
    expect(after).not.toEqual(before);
  });

  describe('sample question', () => {
    it('renders a real question widget, not a text dump', () => {
      renderReview(makeProfile());
      expect(screen.getByTestId('sample-question')).toBeInTheDocument();
      expect(screen.getByTestId('sample-question-prompt').textContent).not.toEqual('');
    });

    it('only ever shows questions on-theme for the selected peak', () => {
      // Peak 1 (Basecamp Bluff) is matched exclusively to readAnalog.
      renderReview(makeProfile());
      expect(screen.getByTestId('analog-clock')).toBeInTheDocument();
    });

    it('is deterministic for the same peak+difficulty across mounts', () => {
      const { unmount } = renderReview(makeProfile());
      const first = screen.getByTestId('sample-question').textContent;
      unmount();
      renderReview(makeProfile());
      const second = screen.getByTestId('sample-question').textContent;
      expect(second).toEqual(first);
    });

    it('shows a new example when "Show another example" is clicked', () => {
      renderReview(makeProfile());
      const before = screen.getByTestId('sample-question').textContent;
      fireEvent.click(screen.getByTestId('review-sample-refresh'));
      const after = screen.getByTestId('sample-question').textContent;
      expect(after).not.toEqual(before);
    });

    it('switches example content when a different peak is selected', () => {
      renderReview(makeProfile());
      fireEvent.change(screen.getByTestId('review-peak'), { target: { value: '3' } });
      // Peak 3 (Calendar Ridge) is matched exclusively to readCalendar.
      expect(screen.getByTestId('calendar-month')).toBeInTheDocument();
      expect(screen.queryByTestId('analog-clock')).not.toBeInTheDocument();
    });

    it('resets to a fresh first example when the level changes', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-sample-refresh'));
      const refreshed = screen.getByTestId('sample-question').textContent;
      pickDifficultyPage(7);
      pickDifficultyPage(1);
      const afterRoundTrip = screen.getByTestId('sample-question').textContent;
      // Not a strict guarantee of difference (same seed could coincide),
      // but landing back on level 1 should reset the refresh count to 0,
      // reproducing the original unrefreshed example.
      expect(afterRoundTrip).not.toEqual(refreshed);
    });
  });

  describe('compare to', () => {
    it('defaults to the next level', () => {
      renderReview(makeProfile());
      expect(screen.getByTestId('review-compare-level')).toHaveValue('2');
    });

    it('defaults to the previous level when viewing level 10', () => {
      renderReview(makeProfile());
      pickDifficultyPage(10);
      expect(screen.getByTestId('review-compare-level')).toHaveValue('9');
    });

    it('lets the compare-to level be changed', () => {
      renderReview(makeProfile());
      fireEvent.change(screen.getByTestId('review-compare-level'), { target: { value: '8' } });
      expect(screen.getByTestId('review-compare-level')).toHaveValue('8');
    });

    it('never offers the currently-viewed level as a compare-to option', () => {
      renderReview(makeProfile());
      const options = within(screen.getByTestId('review-compare-level')).getAllByRole('option');
      expect(options.map((o) => (o as HTMLOptionElement).value)).not.toContain('1');
    });

    it('reuses the item-1 comparison table, filtered to the selected peak', () => {
      renderReview(makeProfile());
      const rows = screen.getAllByTestId('review-compare-row');
      const items = rows.map((row) => row.textContent);
      // Peak 1 (Basecamp Bluff) is clock-only — no date rows.
      expect(items.some((t) => t?.includes('Clock precision'))).toBe(true);
      expect(items.some((t) => t?.includes('Dates'))).toBe(false);
    });

    it('resets to the new default when the viewed level changes', () => {
      renderReview(makeProfile());
      fireEvent.change(screen.getByTestId('review-compare-level'), { target: { value: '9' } });
      pickDifficultyPage(5);
      expect(screen.getByTestId('review-compare-level')).toHaveValue('6');
    });
  });

  describe('goal CTA', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 14)); // August 14, 2026
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('reads as a sentence naming the profile, peak, and level', () => {
      renderReview(makeProfile());
      const cta = screen.getByTestId('review-goal-cta');
      expect(cta.textContent).toContain('Riley');
      expect(cta.textContent).toContain('Basecamp Bluff');
      expect(cta.textContent).toContain('1');
    });

    it('defaults the date to today', () => {
      renderReview(makeProfile());
      expect(screen.getByTestId('review-goal-cta-date')).toHaveValue('2026-08-14');
    });

    it('calls onAddGoal with the browsed peak, level, and picked date', () => {
      const onAddGoal = vi.fn();
      renderReview(makeProfile(), { onAddGoal });
      fireEvent.change(screen.getByTestId('review-peak'), { target: { value: '3' } });
      pickDifficultyPage(6);
      fireEvent.change(screen.getByTestId('review-goal-cta-date'), {
        target: { value: '2026-12-25' },
      });
      fireEvent.click(screen.getByTestId('review-goal-cta-submit'));
      expect(onAddGoal).toHaveBeenCalledWith(3, 6, '2026-12-25');
    });

    it('resets the date back to today after creating a goal', () => {
      renderReview(makeProfile());
      fireEvent.change(screen.getByTestId('review-goal-cta-date'), {
        target: { value: '2026-12-25' },
      });
      fireEvent.click(screen.getByTestId('review-goal-cta-submit'));
      expect(screen.getByTestId('review-goal-cta-date')).toHaveValue('2026-08-14');
    });

    it('shows no pending list and no achieved line when there are no goals for this peak', () => {
      renderReview(makeProfile());
      expect(screen.queryByTestId('review-goal-cta-pending-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('review-goal-cta-achieved')).not.toBeInTheDocument();
    });

    it('lists 0 to N pending goals for the browsed peak', () => {
      const profile = makeProfile({
        goals: [
          makeGoal({ id: 'p1', peakId: 1, difficulty: 4, targetDate: '2026-09-01' }),
          makeGoal({ id: 'p2', peakId: 1, difficulty: 7, targetDate: '2026-10-01' }),
          makeGoal({ id: 'other-peak', peakId: 2, difficulty: 3, targetDate: '2026-09-15' }),
        ],
      });
      renderReview(profile);
      const rows = screen.getAllByTestId('review-goal-cta-pending-row');
      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain('Level 4');
      expect(rows[1].textContent).toContain('Level 7');
    });

    it('shows the single last-achieved goal for the browsed peak, if any', () => {
      const profile = makeProfile({
        goals: [
          makeGoal({
            id: 'ach-1',
            peakId: 1,
            difficulty: 3,
            achievedAt: new Date(2026, 6, 1).getTime(),
          }),
          makeGoal({
            id: 'ach-2',
            peakId: 1,
            difficulty: 5,
            achievedAt: new Date(2026, 7, 1).getTime(),
          }),
        ],
      });
      renderReview(profile);
      const achieved = screen.getByTestId('review-goal-cta-achieved');
      expect(achieved.textContent).toContain('Level 5');
      expect(achieved.textContent).not.toContain('Level 3');
    });

    it('scopes pending/achieved goals to the currently browsed peak', () => {
      const profile = makeProfile({
        goals: [makeGoal({ peakId: 2, difficulty: 4, targetDate: '2026-09-01' })],
      });
      renderReview(profile);
      expect(screen.queryByTestId('review-goal-cta-pending-list')).not.toBeInTheDocument();
      fireEvent.change(screen.getByTestId('review-peak'), { target: { value: '2' } });
      expect(screen.getAllByTestId('review-goal-cta-pending-row')).toHaveLength(1);
    });
  });

  describe('climber log', () => {
    it('shows "No climbs yet" when the log is empty', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-tab-log'));
      expect(screen.getByTestId('review-log-empty')).toHaveTextContent('No climbs yet');
      expect(screen.queryByTestId('review-log-table')).not.toBeInTheDocument();
    });

    it('disables the download button when the log is empty', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-tab-log'));
      expect(screen.getByTestId('review-log-download')).toBeDisabled();
    });

    it('lists climb log entries newest first', () => {
      const profile = makeProfile({
        climbLog: [
          makeLogEntry({ id: 'older', peakId: 1, startedAt: 1700000000000 }),
          makeLogEntry({ id: 'newer', peakId: 2, startedAt: 1700100000000 }),
        ],
      });
      renderReview(profile);
      fireEvent.click(screen.getByTestId('review-tab-log'));
      const rows = screen.getAllByTestId('review-log-row');
      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain('Sundial Spire');
      expect(rows[1].textContent).toContain('Basecamp Bluff');
    });

    it('shows peak name, difficulty, duration, and result per row', () => {
      const profile = makeProfile({
        climbLog: [
          makeLogEntry({
            peakId: 1,
            difficulty: 7,
            startedAt: 1700000000000,
            endedAt: 1700000065000,
            result: 'fell',
          }),
        ],
      });
      renderReview(profile);
      fireEvent.click(screen.getByTestId('review-tab-log'));
      const row = screen.getByTestId('review-log-row');
      expect(row.textContent).toContain('Basecamp Bluff');
      expect(row.textContent).toContain('7');
      expect(row.textContent).toContain('1m 5s');
      expect(row.textContent).toContain('Fell');
    });

    it('enables the download button once there is at least one entry', () => {
      const profile = makeProfile({ climbLog: [makeLogEntry()] });
      renderReview(profile);
      fireEvent.click(screen.getByTestId('review-tab-log'));
      expect(screen.getByTestId('review-log-download')).not.toBeDisabled();
    });

    describe('CSV download', () => {
      // jsdom doesn't implement `URL.createObjectURL`/`revokeObjectURL` —
      // stub them directly on the real global URL constructor so the
      // download handler's side effects don't throw.
      beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:mock');
        URL.revokeObjectURL = vi.fn();
      });

      it('triggers a blob URL download when clicked', () => {
        const profile = makeProfile({ climbLog: [makeLogEntry()] });
        renderReview(profile);
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.click(screen.getByTestId('review-log-download'));
        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
      });

      it('only downloads what the current filter shows', async () => {
        const profile = makeProfile({
          climbLog: [
            makeLogEntry({ id: 'a', peakId: 1, difficulty: 3 }),
            makeLogEntry({ id: 'b', peakId: 2, difficulty: 3 }),
          ],
        });
        renderReview(profile);
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.change(screen.getByTestId('review-log-filter-peak'), {
          target: { value: '1' },
        });
        fireEvent.click(screen.getByTestId('review-log-download'));
        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
        const text = await blob.text();
        expect(text).toContain('Basecamp Bluff');
        expect(text).not.toContain('Sundial Spire');
      });
    });

    describe('filtering', () => {
      function filterableProfile() {
        return makeProfile({
          climbLog: [
            makeLogEntry({ id: 'a', peakId: 1, difficulty: 3 }),
            makeLogEntry({ id: 'b', peakId: 1, difficulty: 5 }),
            makeLogEntry({ id: 'c', peakId: 2, difficulty: 3 }),
          ],
        });
      }

      it('defaults to showing every peak and level', () => {
        renderReview(filterableProfile());
        fireEvent.click(screen.getByTestId('review-tab-log'));
        expect(screen.getByTestId('review-log-filter-peak')).toHaveValue('all');
        expect(screen.getByTestId('review-log-filter-difficulty')).toHaveValue('all');
        expect(screen.getAllByTestId('review-log-row')).toHaveLength(3);
      });

      it('filters by peak', () => {
        renderReview(filterableProfile());
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.change(screen.getByTestId('review-log-filter-peak'), {
          target: { value: '1' },
        });
        const rows = screen.getAllByTestId('review-log-row');
        expect(rows).toHaveLength(2);
        for (const row of rows) expect(row.textContent).toContain('Basecamp Bluff');
      });

      it('filters by level', () => {
        renderReview(filterableProfile());
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.change(screen.getByTestId('review-log-filter-difficulty'), {
          target: { value: '3' },
        });
        const rows = screen.getAllByTestId('review-log-row');
        expect(rows).toHaveLength(2);
        for (const row of rows) expect(row.textContent).toContain('3');
      });

      it('combines peak and level filters', () => {
        renderReview(filterableProfile());
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.change(screen.getByTestId('review-log-filter-peak'), {
          target: { value: '1' },
        });
        fireEvent.change(screen.getByTestId('review-log-filter-difficulty'), {
          target: { value: '5' },
        });
        expect(screen.getAllByTestId('review-log-row')).toHaveLength(1);
      });

      it('shows a distinct empty message when a filter matches nothing, vs. no climbs at all', () => {
        renderReview(filterableProfile());
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.change(screen.getByTestId('review-log-filter-difficulty'), {
          target: { value: '9' },
        });
        expect(screen.getByTestId('review-log-empty')).toHaveTextContent(
          'No climbs match this filter',
        );
      });

      it('seeds the filter and jumps straight to the Climber log tab when initialLogFilter is set', () => {
        renderReview(filterableProfile(), {
          initialLogFilter: { peakId: 1, difficulty: 5 },
        });
        expect(screen.getByTestId('review-log')).toBeInTheDocument();
        expect(screen.getByTestId('review-log-filter-peak')).toHaveValue('1');
        expect(screen.getByTestId('review-log-filter-difficulty')).toHaveValue('5');
        expect(screen.getAllByTestId('review-log-row')).toHaveLength(1);
      });
    });
  });

  describe('goals', () => {
    it('shows "No goals yet" when there are none', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-tab-goals'));
      expect(screen.getByTestId('review-goals-empty')).toHaveTextContent('No goals yet');
      expect(screen.queryByTestId('review-goals-list')).not.toBeInTheDocument();
    });

    it('disables submit until a target date is picked', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-tab-goals'));
      expect(screen.getByTestId('review-goal-submit')).toBeDisabled();
      fireEvent.change(screen.getByTestId('review-goal-date'), {
        target: { value: '2026-12-01' },
      });
      expect(screen.getByTestId('review-goal-submit')).not.toBeDisabled();
    });

    it('calls onAddGoal with the picked peak, level, and date on submit', () => {
      const onAddGoal = vi.fn();
      renderReview(makeProfile(), { onAddGoal });
      fireEvent.click(screen.getByTestId('review-tab-goals'));
      fireEvent.change(screen.getByTestId('review-goal-peak'), { target: { value: '3' } });
      fireEvent.change(screen.getByTestId('review-goal-difficulty'), { target: { value: '7' } });
      fireEvent.change(screen.getByTestId('review-goal-date'), {
        target: { value: '2026-12-01' },
      });
      fireEvent.click(screen.getByTestId('review-goal-submit'));
      expect(onAddGoal).toHaveBeenCalledWith(3, 7, '2026-12-01');
    });

    it('clears the target date after adding a goal', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-tab-goals'));
      fireEvent.change(screen.getByTestId('review-goal-date'), {
        target: { value: '2026-12-01' },
      });
      fireEvent.click(screen.getByTestId('review-goal-submit'));
      expect(screen.getByTestId('review-goal-date')).toHaveValue('');
    });

    it('lists goals soonest-due first, showing pending vs achieved status', () => {
      const profile = makeProfile({
        goals: [
          makeGoal({ id: 'g1', peakId: 1, difficulty: 5, targetDate: '2026-12-01' }),
          makeGoal({
            id: 'g2',
            peakId: 2,
            difficulty: 3,
            targetDate: '2026-06-01',
            achievedAt: 1700000000000,
          }),
        ],
      });
      renderReview(profile);
      fireEvent.click(screen.getByTestId('review-tab-goals'));
      const rows = screen.getAllByTestId('review-goal-row');
      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain('Sundial Spire');
      expect(rows[0].textContent).toContain('Achieved');
      expect(rows[1].textContent).toContain('Basecamp Bluff');
      expect(rows[1].textContent).toContain('Pending');
    });
  });

  describe('export/import', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('triggers a blob URL download when Export is clicked', () => {
      renderReview(makeProfile());
      fireEvent.click(screen.getByTestId('review-tab-export'));
      fireEvent.click(screen.getByTestId('review-export-download'));
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });

    it('calls onImportProfile with the parsed profile from a valid file', async () => {
      const onImportProfile = vi.fn();
      const imported = makeProfile({ id: 'imported-id', name: 'Sam' });
      renderReview(makeProfile(), { onImportProfile });
      fireEvent.click(screen.getByTestId('review-tab-export'));
      const file = new File([JSON.stringify(imported)], 'profile.json', {
        type: 'application/json',
      });
      fireEvent.change(screen.getByTestId('review-import-file'), { target: { files: [file] } });
      await vi.waitFor(() => expect(onImportProfile).toHaveBeenCalledWith(imported));
    });

    it('shows an error and does not call onImportProfile for invalid JSON', async () => {
      const onImportProfile = vi.fn();
      renderReview(makeProfile(), { onImportProfile });
      fireEvent.click(screen.getByTestId('review-tab-export'));
      const file = new File(['not json{'], 'profile.json', { type: 'application/json' });
      fireEvent.change(screen.getByTestId('review-import-file'), { target: { files: [file] } });
      await vi.waitFor(() =>
        expect(screen.getByTestId('review-import-error')).toHaveTextContent(
          "doesn't look like a climber profile",
        ),
      );
      expect(onImportProfile).not.toHaveBeenCalled();
    });

    it('shows an error for well-formed JSON that is not a valid profile shape', async () => {
      const onImportProfile = vi.fn();
      renderReview(makeProfile(), { onImportProfile });
      fireEvent.click(screen.getByTestId('review-tab-export'));
      const file = new File([JSON.stringify({ hello: 'world' })], 'profile.json', {
        type: 'application/json',
      });
      fireEvent.change(screen.getByTestId('review-import-file'), { target: { files: [file] } });
      await vi.waitFor(() => expect(screen.getByTestId('review-import-error')).toBeInTheDocument());
      expect(onImportProfile).not.toHaveBeenCalled();
    });
  });

  describe('buildClimbLogCsv', () => {
    it('returns just the header row for an empty log', () => {
      expect(buildClimbLogCsv([])).toEqual('"Peak","Difficulty","Date","Duration","Result"');
    });

    it('formats a row with peak name, difficulty, date, duration, and result', () => {
      const csv = buildClimbLogCsv([
        makeLogEntry({
          peakId: 1,
          difficulty: 4,
          startedAt: 1700000000000,
          endedAt: 1700000092000,
          result: 'summited',
        }),
      ]);
      const lines = csv.split('\r\n');
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('"Basecamp Bluff"');
      expect(lines[1]).toContain('"4"');
      expect(lines[1]).toContain('"1m 32s"');
      expect(lines[1]).toContain('"Summited"');
    });

    it('sorts rows newest first, same as the table', () => {
      const csv = buildClimbLogCsv([
        makeLogEntry({ id: 'older', peakId: 1, startedAt: 1700000000000 }),
        makeLogEntry({ id: 'newer', peakId: 2, startedAt: 1700100000000 }),
      ]);
      const lines = csv.split('\r\n');
      expect(lines[1]).toContain('Sundial Spire');
      expect(lines[2]).toContain('Basecamp Bluff');
    });
  });
});
