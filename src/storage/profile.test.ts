import { describe, expect, it } from 'vitest';
import {
  createProfile,
  getProfile,
  isPeakSummited,
  recordBail,
  recordFall,
  recordQuestionStat,
  recordSummit,
  setPeakDifficulty,
} from './profile';
import type { SaveFile } from './types';

const EMPTY_SAVE: SaveFile = { v: 2, activeProfileId: null, profiles: [] };

describe('createProfile', () => {
  it('appends a new profile with defaults and makes it active', () => {
    const save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    expect(save.profiles).toHaveLength(1);
    const profile = save.profiles[0];
    expect(profile.name).toBe('Riley');
    expect(profile.characterId).toBe('preset-1');
    expect(profile.progress).toEqual({});
    expect(profile.stats).toEqual({});
    expect(profile.goals).toEqual([]);
    expect(profile.climbLog).toEqual([]);
    expect(save.activeProfileId).toBe(profile.id);
  });

  it('gives each profile a distinct id', () => {
    const save = createProfile(createProfile(EMPTY_SAVE, 'A', 'preset-1'), 'B', 'preset-2');
    expect(save.profiles[0].id).not.toBe(save.profiles[1].id);
  });

  it('does not mutate the original save', () => {
    createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    expect(EMPTY_SAVE.profiles).toHaveLength(0);
  });
});

describe('getProfile', () => {
  it('finds a profile by id', () => {
    const save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    expect(getProfile(save, id)?.name).toBe('Riley');
  });

  it('returns undefined for an unknown id', () => {
    expect(getProfile(EMPTY_SAVE, 'nope')).toBeUndefined();
  });
});

describe('setPeakDifficulty', () => {
  it("updates only the target peak's difficulty, creating a progress entry if none exists", () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = setPeakDifficulty(save, id, 1, 8);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      difficulty: 8,
      highestDifficultyCleared: null,
      bestTimeMs: null,
      attempts: 0,
      bails: 0,
    });
  });

  it('leaves other peaks and other profiles untouched', () => {
    let save = createProfile(EMPTY_SAVE, 'A', 'preset-1');
    save = createProfile(save, 'B', 'preset-2');
    const [a, b] = save.profiles;
    save = setPeakDifficulty(save, a.id, 1, 8);
    save = setPeakDifficulty(save, a.id, 2, 5);
    expect(getProfile(save, a.id)?.progress[1]?.difficulty).toBe(8);
    expect(getProfile(save, a.id)?.progress[2]?.difficulty).toBe(5);
    expect(getProfile(save, b.id)?.progress[1]).toBeUndefined();
  });

  it('preserves the rest of an existing progress entry', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 5, 90000);
    save = setPeakDifficulty(save, id, 1, 7);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      difficulty: 7,
      highestDifficultyCleared: 5,
      bestTimeMs: 90000,
      attempts: 1,
      bails: 0,
    });
  });
});

describe('isPeakSummited', () => {
  it('is false when highestDifficultyCleared is null', () => {
    expect(
      isPeakSummited({
        difficulty: 1,
        highestDifficultyCleared: null,
        bestTimeMs: null,
        attempts: 0,
        bails: 0,
      }),
    ).toBe(false);
  });

  it('is true when highestDifficultyCleared is set, at any level', () => {
    expect(
      isPeakSummited({
        difficulty: 1,
        highestDifficultyCleared: 1,
        bestTimeMs: 90000,
        attempts: 1,
        bails: 0,
      }),
    ).toBe(true);
  });
});

describe('recordSummit', () => {
  it('marks the peak summited at the given difficulty and records the time on a first summit', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 5, 90000);
    const progress = getProfile(save, id)?.progress[1];
    expect(progress).toEqual({
      difficulty: 1,
      highestDifficultyCleared: 5,
      bestTimeMs: 90000,
      attempts: 1,
      bails: 0,
    });
  });

  it('keeps the best (lowest) time across multiple summits', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 5, 90000);
    save = recordSummit(save, id, 1, 5, 60000);
    expect(getProfile(save, id)?.progress[1]?.bestTimeMs).toBe(60000);
    expect(getProfile(save, id)?.progress[1]?.attempts).toBe(2);
    save = recordSummit(save, id, 1, 5, 120000);
    expect(getProfile(save, id)?.progress[1]?.bestTimeMs).toBe(60000);
    expect(getProfile(save, id)?.progress[1]?.attempts).toBe(3);
  });

  it('keeps the highest difficulty ever cleared, not just the latest', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 7, 90000);
    save = recordSummit(save, id, 1, 4, 80000);
    expect(getProfile(save, id)?.progress[1]?.highestDifficultyCleared).toBe(7);
  });

  it('tracks progress per peak independently', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 5, 90000);
    save = recordSummit(save, id, 2, 5, 50000);
    expect(getProfile(save, id)?.progress[1]?.bestTimeMs).toBe(90000);
    expect(getProfile(save, id)?.progress[2]?.bestTimeMs).toBe(50000);
  });

  it('appends a climb-log entry with the difficulty, duration, and "summited" result', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 3, 6, 45000);
    const log = getProfile(save, id)?.climbLog;
    expect(log).toHaveLength(1);
    expect(log?.[0]).toMatchObject({ peakId: 3, difficulty: 6, result: 'summited' });
    expect((log?.[0].endedAt ?? 0) - (log?.[0].startedAt ?? 0)).toBe(45000);
  });
});

describe('recordFall', () => {
  it('increments attempts without marking the peak summited', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordFall(save, id, 1, 3, 30000);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      difficulty: 1,
      highestDifficultyCleared: null,
      bestTimeMs: null,
      attempts: 1,
      bails: 0,
    });
  });

  it('a fall after a prior summit keeps highestDifficultyCleared and the prior best time', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 5, 90000);
    save = recordFall(save, id, 1, 5, 30000);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      difficulty: 1,
      highestDifficultyCleared: 5,
      bestTimeMs: 90000,
      attempts: 2,
      bails: 0,
    });
  });

  it('appends a climb-log entry with the "fell" result', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordFall(save, id, 2, 4, 20000);
    const log = getProfile(save, id)?.climbLog;
    expect(log?.[0]).toMatchObject({ peakId: 2, difficulty: 4, result: 'fell' });
  });
});

describe('recordBail', () => {
  it('increments bails without touching attempts', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordBail(save, id, 1, 3, 10000);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      difficulty: 1,
      highestDifficultyCleared: null,
      bestTimeMs: null,
      attempts: 0,
      bails: 1,
    });
  });

  it('accumulates bails across multiple calls, independent of attempts', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordBail(save, id, 1, 3, 5000);
    save = recordFall(save, id, 1, 3, 8000);
    save = recordBail(save, id, 1, 3, 3000);
    const progress = getProfile(save, id)?.progress[1];
    expect(progress?.bails).toBe(2);
    expect(progress?.attempts).toBe(1);
  });

  it('appends a climb-log entry with the "bailed" result', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordBail(save, id, 5, 2, 7000);
    const log = getProfile(save, id)?.climbLog;
    expect(log?.[0]).toMatchObject({ peakId: 5, difficulty: 2, result: 'bailed' });
  });
});

describe('recordQuestionStat', () => {
  it('accumulates asked/correct/totalMs across calls for the same type', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordQuestionStat(save, id, 'readAnalog', true, 4000);
    save = recordQuestionStat(save, id, 'readAnalog', false, 6000);
    expect(getProfile(save, id)?.stats.readAnalog).toEqual({
      asked: 2,
      correct: 1,
      totalMs: 10000,
    });
  });

  it('tracks stats per question type independently', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordQuestionStat(save, id, 'readAnalog', true, 4000);
    save = recordQuestionStat(save, id, 'readCalendar', true, 5000);
    expect(getProfile(save, id)?.stats.readAnalog).toEqual({ asked: 1, correct: 1, totalMs: 4000 });
    expect(getProfile(save, id)?.stats.readCalendar).toEqual({
      asked: 1,
      correct: 1,
      totalMs: 5000,
    });
  });
});
