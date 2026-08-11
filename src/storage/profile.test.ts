import { describe, expect, it } from 'vitest';
import {
  createProfile,
  getProfile,
  recordFall,
  recordQuestionStat,
  recordSummit,
  setDifficulty,
} from './profile';
import type { SaveFile } from './types';

const EMPTY_SAVE: SaveFile = { v: 1, activeProfileId: null, profiles: [] };

describe('createProfile', () => {
  it('appends a new profile with defaults and makes it active', () => {
    const save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    expect(save.profiles).toHaveLength(1);
    const profile = save.profiles[0];
    expect(profile.name).toBe('Riley');
    expect(profile.characterId).toBe('preset-1');
    expect(profile.settings.difficulty).toBe(3);
    expect(profile.progress).toEqual({});
    expect(profile.stats).toEqual({});
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

describe('setDifficulty', () => {
  it("updates only the target profile's difficulty", () => {
    let save = createProfile(EMPTY_SAVE, 'A', 'preset-1');
    save = createProfile(save, 'B', 'preset-2');
    const [a, b] = save.profiles;
    save = setDifficulty(save, a.id, 8);
    expect(getProfile(save, a.id)?.settings.difficulty).toBe(8);
    expect(getProfile(save, b.id)?.settings.difficulty).toBe(3);
  });
});

describe('recordSummit', () => {
  it('marks the peak summited and records the time on a first summit', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 90000);
    const progress = getProfile(save, id)?.progress[1];
    expect(progress).toEqual({ summited: true, bestTimeMs: 90000, attempts: 1 });
  });

  it('keeps the best (lowest) time across multiple summits', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 90000);
    save = recordSummit(save, id, 1, 60000);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      summited: true,
      bestTimeMs: 60000,
      attempts: 2,
    });
    save = recordSummit(save, id, 1, 120000);
    expect(getProfile(save, id)?.progress[1]?.bestTimeMs).toBe(60000);
    expect(getProfile(save, id)?.progress[1]?.attempts).toBe(3);
  });

  it('tracks progress per peak independently', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 90000);
    save = recordSummit(save, id, 2, 50000);
    expect(getProfile(save, id)?.progress[1]?.bestTimeMs).toBe(90000);
    expect(getProfile(save, id)?.progress[2]?.bestTimeMs).toBe(50000);
  });
});

describe('recordFall', () => {
  it('increments attempts without marking the peak summited', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordFall(save, id, 1);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      summited: false,
      bestTimeMs: null,
      attempts: 1,
    });
  });

  it('a fall after a prior summit keeps summited true and the prior best time', () => {
    let save = createProfile(EMPTY_SAVE, 'Riley', 'preset-1');
    const id = save.profiles[0].id;
    save = recordSummit(save, id, 1, 90000);
    save = recordFall(save, id, 1);
    expect(getProfile(save, id)?.progress[1]).toEqual({
      summited: true,
      bestTimeMs: 90000,
      attempts: 2,
    });
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
