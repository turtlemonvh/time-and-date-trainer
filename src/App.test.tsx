import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Question } from './engine/questions';

const FIXED_QUESTION: Question = {
  id: 'test-question',
  typeId: 'testType',
  prompt: 'What is the answer?',
  display: { kind: 'none' },
  answer: { kind: 'choice', options: ['Right', 'Wrong'], correctIndex: 0 },
  timeLimitMs: 5000,
  explainCorrect: 'Because Right is right.',
};

vi.mock('./engine/questions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./engine/questions')>();
  return { ...actual, generateQuestion: vi.fn(() => FIXED_QUESTION) };
});

const REVEAL_MS = 1500;

/** Clicks the correct answer repeatedly until Climb hands off to Summit/Fell (or the safety cap
 * is hit) — bounded rather than a fixed count since the exact number of correct answers needed
 * to summit depends on climb.ts's boost math, not something this test should hardcode. */
function climbToSummit() {
  for (let i = 0; i < 15; i++) {
    if (!screen.queryByTestId('choice-option-0')) break;
    fireEvent.click(screen.getByTestId('choice-option-0'));
    act(() => {
      vi.advanceTimersByTime(REVEAL_MS);
    });
  }
}

function createProfileAndReachMap(name: string) {
  fireEvent.click(screen.getByTestId('intro-continue'));
  fireEvent.change(screen.getByTestId('profile-name-input'), { target: { value: name } });
  fireEvent.click(screen.getByTestId('profile-create-submit'));
  fireEvent.click(screen.getAllByTestId(/^character-option-/)[0]);
}

/** Confirms the (default-selected) level and starts a climb on `peakId`. */
function startClimb(peakId: number) {
  fireEvent.click(screen.getByTestId(`peak-climb-${peakId}`));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('renders Intro first', () => {
    render(<App />);
    expect(screen.getByTestId('intro-continue')).toBeInTheDocument();
  });

  it('walks through Intro -> ProfileSelect -> CharacterPick -> Map', () => {
    render(<App />);
    createProfileAndReachMap('Riley');
    expect(screen.getByTestId('profile-chip-name')).toHaveTextContent('Riley');
    expect(screen.getByTestId('peak-option-1')).toBeInTheDocument();
  });

  it('plays a full climb to a summit and shows it on the map afterward', () => {
    render(<App />);
    createProfileAndReachMap('Riley');

    startClimb(1);
    expect(screen.getByTestId('climb-prompt')).toBeInTheDocument();

    climbToSummit();

    expect(screen.getByRole('heading', { name: 'Summit reached!' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('summit-continue'));

    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Summited');
  });

  it('records a fall and returns to the map without marking the peak summited', () => {
    render(<App />);
    createProfileAndReachMap('Riley');
    startClimb(1);

    // Miss enough times to fall (difficulty 1, a peak's default level -> fallRiskCapacity 5).
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByTestId('choice-option-1'));
      act(() => {
        vi.advanceTimersByTime(REVEAL_MS);
      });
    }

    expect(screen.getByRole('heading', { name: 'You slipped!' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fell-map'));
    // The fall is logged even though the peak wasn't summited — since it
    // never was, "beyond cleared" means beyond 0, so any attempt qualifies.
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Tried Lv 1');
  });

  it('bailing out of a climb returns to the map without recording an attempt', () => {
    render(<App />);
    createProfileAndReachMap('Riley');
    startClimb(1);
    expect(screen.getByTestId('climb-prompt')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('climb-bail'));

    expect(screen.getByTestId('peak-option-1')).toBeInTheDocument();
    // A bail is tracked separately from attempts (summit/fall outcomes only)
    // in PeakProgress, but it still appends a climb-log entry — and the
    // "tried a level beyond what's cleared" pill reads from that log, not
    // from `attempts`, so a bail shows up there too.
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Tried Lv 1');
  });

  it('persists the created profile across a fresh mount (simulating a reload)', () => {
    const { unmount } = render(<App />);
    createProfileAndReachMap('Riley');
    unmount();

    render(<App />);
    fireEvent.click(screen.getByTestId('intro-continue'));
    expect(screen.getByTestId('profile-list')).toHaveTextContent('Riley');
  });

  it('persists a summit across a fresh mount (simulating a reload)', () => {
    const { unmount } = render(<App />);
    createProfileAndReachMap('Riley');
    startClimb(1);
    climbToSummit();
    fireEvent.click(screen.getByTestId('summit-continue'));
    unmount();

    render(<App />);
    fireEvent.click(screen.getByTestId('intro-continue'));
    fireEvent.click(screen.getAllByTestId(/^profile-option-/)[0]);
    expect(screen.getByTestId('peak-progress-1')).toHaveTextContent('Summited');
  });
});
