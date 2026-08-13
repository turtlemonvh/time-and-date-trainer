import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_VERSION, loadSave, saveSave } from './save';
import type { SaveFile } from './types';

const STORAGE_KEY = 'timescaler.save';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('loadSave', () => {
  it('returns a fresh empty save when nothing is stored', () => {
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('returns a fresh empty save when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json{');
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('returns a fresh empty save when the stored value has no recognizable version/profiles shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('returns a fresh empty save when the stored value is a JSON primitive, not an object', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('hello'));
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('round-trips a well-formed v2 save written by saveSave', () => {
    const save: SaveFile = {
      v: CURRENT_VERSION,
      activeProfileId: 'abc',
      profiles: [
        {
          id: 'abc',
          name: 'Riley',
          characterId: 'preset-1',
          createdAt: 1700000000000,
          progress: {
            1: {
              difficulty: 5,
              highestDifficultyCleared: 5,
              bestTimeMs: 12345,
              attempts: 2,
              bails: 1,
            },
          },
          stats: { readAnalog: { asked: 5, correct: 4, totalMs: 20000 } },
          goals: [
            {
              id: 'goal-1',
              peakId: 1,
              difficulty: 7,
              targetDate: '2026-12-01',
              createdAt: 1700000000000,
              achievedAt: null,
            },
          ],
          climbLog: [
            {
              id: 'log-1',
              peakId: 1,
              difficulty: 5,
              startedAt: 1700000000000,
              endedAt: 1700000012345,
              result: 'summited',
            },
          ],
        },
      ],
    };
    saveSave(save);
    expect(loadSave()).toEqual(save);
  });

  describe('v1 -> v2 migration', () => {
    it('seeds per-peak difficulty and highestDifficultyCleared from the old global difficulty', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          activeProfileId: 'abc',
          profiles: [
            {
              id: 'abc',
              name: 'Riley',
              characterId: 'preset-1',
              createdAt: 1700000000000,
              settings: { difficulty: 6 },
              progress: {
                1: { summited: true, bestTimeMs: 90000, attempts: 3 },
                2: { summited: false, bestTimeMs: null, attempts: 1 },
              },
              stats: { readAnalog: { asked: 5, correct: 4, totalMs: 20000 } },
            },
          ],
        }),
      );
      const save = loadSave();
      expect(save.v).toBe(2);
      expect(save.activeProfileId).toBe('abc');
      const profile = save.profiles[0];
      // Summited peak: highestDifficultyCleared is a best-effort guess from
      // the old global difficulty, since v1 never recorded which difficulty
      // a summit happened at.
      expect(profile.progress[1]).toEqual({
        difficulty: 6,
        highestDifficultyCleared: 6,
        bestTimeMs: 90000,
        attempts: 3,
        bails: 0,
      });
      // Never-summited peak: highestDifficultyCleared stays null.
      expect(profile.progress[2]).toEqual({
        difficulty: 6,
        highestDifficultyCleared: null,
        bestTimeMs: null,
        attempts: 1,
        bails: 0,
      });
      // Untouched fields carry over as-is.
      expect(profile.stats).toEqual({ readAnalog: { asked: 5, correct: 4, totalMs: 20000 } });
      // The old global settings.difficulty doesn't survive the move to
      // per-peak difficulty — it's read once as a seed, then dropped.
      expect(profile).not.toHaveProperty('settings');
    });

    it('gives every migrated profile empty goals and climbLog — no retroactive history', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          activeProfileId: null,
          profiles: [
            {
              id: 'abc',
              name: 'Riley',
              characterId: 'preset-1',
              createdAt: 1700000000000,
              settings: { difficulty: 3 },
              progress: {},
              stats: {},
            },
          ],
        }),
      );
      const profile = loadSave().profiles[0];
      expect(profile.goals).toEqual([]);
      expect(profile.climbLog).toEqual([]);
    });

    it('migrates a profile with no progress entries at all', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          activeProfileId: null,
          profiles: [
            {
              id: 'abc',
              name: 'Riley',
              characterId: 'preset-1',
              createdAt: 1700000000000,
              settings: { difficulty: 3 },
              progress: {},
              stats: {},
            },
          ],
        }),
      );
      expect(loadSave().profiles[0].progress).toEqual({});
    });

    it('persists the migrated v2 shape back to storage the next time it is saved', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          activeProfileId: null,
          profiles: [
            {
              id: 'abc',
              name: 'Riley',
              characterId: 'preset-1',
              createdAt: 1700000000000,
              settings: { difficulty: 3 },
              progress: {},
              stats: {},
            },
          ],
        }),
      );
      const migrated = loadSave();
      saveSave(migrated);
      expect(loadSave()).toEqual(migrated);
      expect(loadSave().v).toBe(2);
    });
  });
});

describe('saveSave', () => {
  it('persists under the timescaler.save key', () => {
    const save: SaveFile = { v: CURRENT_VERSION, activeProfileId: null, profiles: [] };
    saveSave(save);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
