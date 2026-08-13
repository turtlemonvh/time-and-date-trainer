import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Review from './Review';
import { buildClimbLogCsv } from '../climbLogCsv';
import type { ClimbLogEntry, Profile } from '../../storage/types';

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

describe('Review', () => {
  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<Review profile={makeProfile()} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('review-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows the curriculum browser with a peak and difficulty selector', () => {
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    expect(screen.getByTestId('review-peak')).toBeInTheDocument();
    expect(screen.getByTestId('review-difficulty')).toBeInTheDocument();
  });

  it('offers all 10 peaks and all 10 difficulty levels', () => {
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    expect(within(screen.getByTestId('review-peak')).getAllByRole('option')).toHaveLength(10);
    expect(within(screen.getByTestId('review-difficulty')).getAllByRole('option')).toHaveLength(10);
  });

  it('shows difficulty bullets that change with the selected level', () => {
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    const before = screen.getByTestId('review-difficulty-bullets').textContent;
    fireEvent.change(screen.getByTestId('review-difficulty'), { target: { value: '10' } });
    const after = screen.getByTestId('review-difficulty-bullets').textContent;
    expect(after).not.toEqual(before);
  });

  it('shows sample questions for the selected peak and difficulty', () => {
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    const samples = screen.getAllByTestId('review-sample-question');
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(within(sample).getByTestId('review-sample-prompt').textContent).not.toEqual('');
    }
  });

  it('regenerates sample questions deterministically for the same peak+difficulty', () => {
    const { unmount } = render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    const first = screen.getByTestId('review-sample-questions').textContent;
    unmount();
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    const second = screen.getByTestId('review-sample-questions').textContent;
    expect(second).toEqual(first);
  });

  it('only ever shows questions on-theme for the selected peak', () => {
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    // Peak 1 (Basecamp Bluff) is matched exclusively to readAnalog, whose
    // display renders as an analog clock — never a calendar or "no visual".
    for (const sample of screen.getAllByTestId('review-sample-question')) {
      expect(sample.textContent).toContain('analog clock');
    }
  });

  it('switches sample questions when a different peak is selected', () => {
    render(<Review profile={makeProfile()} onBack={vi.fn()} />);
    const before = screen.getByTestId('review-sample-questions').textContent;
    fireEvent.change(screen.getByTestId('review-peak'), { target: { value: '3' } });
    const after = screen.getByTestId('review-sample-questions').textContent;
    expect(after).not.toEqual(before);
  });

  describe('climber log', () => {
    it('shows "No climbs yet" when the log is empty', () => {
      render(<Review profile={makeProfile()} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('review-tab-log'));
      expect(screen.getByTestId('review-log-empty')).toHaveTextContent('No climbs yet');
      expect(screen.queryByTestId('review-log-table')).not.toBeInTheDocument();
    });

    it('disables the download button when the log is empty', () => {
      render(<Review profile={makeProfile()} onBack={vi.fn()} />);
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
      render(<Review profile={profile} onBack={vi.fn()} />);
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
      render(<Review profile={profile} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('review-tab-log'));
      const row = screen.getByTestId('review-log-row');
      expect(row.textContent).toContain('Basecamp Bluff');
      expect(row.textContent).toContain('7');
      expect(row.textContent).toContain('1m 5s');
      expect(row.textContent).toContain('Fell');
    });

    it('enables the download button once there is at least one entry', () => {
      const profile = makeProfile({ climbLog: [makeLogEntry()] });
      render(<Review profile={profile} onBack={vi.fn()} />);
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
        render(<Review profile={profile} onBack={vi.fn()} />);
        fireEvent.click(screen.getByTestId('review-tab-log'));
        fireEvent.click(screen.getByTestId('review-log-download'));
        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
      });
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
