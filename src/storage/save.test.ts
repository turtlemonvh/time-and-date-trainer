import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_VERSION, loadSave, saveSave } from './save';
import type { SaveFile } from './types';

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
    localStorage.setItem('timescaler.save', 'not json{');
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('returns a fresh empty save when the stored value has no recognizable version/profiles shape', () => {
    localStorage.setItem('timescaler.save', JSON.stringify({ foo: 'bar' }));
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('returns a fresh empty save when the stored value is a JSON primitive, not an object', () => {
    localStorage.setItem('timescaler.save', JSON.stringify('hello'));
    expect(loadSave()).toEqual({ v: CURRENT_VERSION, activeProfileId: null, profiles: [] });
  });

  it('round-trips a well-formed save written by saveSave', () => {
    const save: SaveFile = {
      v: CURRENT_VERSION,
      activeProfileId: 'abc',
      profiles: [
        {
          id: 'abc',
          name: 'Riley',
          characterId: 'preset-1',
          createdAt: 1700000000000,
          settings: { difficulty: 4 },
          progress: { 1: { summited: true, bestTimeMs: 12345, attempts: 2 } },
          stats: { readAnalog: { asked: 5, correct: 4, totalMs: 20000 } },
        },
      ],
    };
    saveSave(save);
    expect(loadSave()).toEqual(save);
  });
});

describe('saveSave', () => {
  it('persists under the timescaler.save key', () => {
    const save: SaveFile = { v: CURRENT_VERSION, activeProfileId: null, profiles: [] };
    saveSave(save);
    expect(localStorage.getItem('timescaler.save')).not.toBeNull();
  });
});
