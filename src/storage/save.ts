import type { SaveFile } from './types';

const STORAGE_KEY = 'timescaler.save';
export const CURRENT_VERSION = 1;

function emptySave(): SaveFile {
  return { v: CURRENT_VERSION, activeProfileId: null, profiles: [] };
}

/**
 * Migrates a parsed-but-unvalidated save blob up to the current schema
 * version. Today there's only v1, so this is a pass-through — but the shape
 * (check the stored version, apply migrations in order) is what a v2 schema
 * change would extend, so a future migration has an established place to
 * plug in rather than being invented from scratch under time pressure.
 */
function migrate(raw: unknown): SaveFile {
  if (!raw || typeof raw !== 'object') return emptySave();
  const candidate = raw as Partial<SaveFile>;
  if (candidate.v === CURRENT_VERSION && Array.isArray(candidate.profiles)) {
    return candidate as SaveFile;
  }
  // No known migration path for anything other than the current version —
  // starting fresh is safer than misinterpreting an unrecognized shape.
  return emptySave();
}

/**
 * Reads the save file from `localStorage`. Missing or corrupt data returns
 * a fresh empty save rather than throwing — a storage read failure
 * shouldn't crash the app, the same "never lose the player's trust" spirit
 * CLAUDE.md applies to question grading, applied here to persistence.
 */
export function loadSave(): SaveFile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptySave();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return emptySave();
  }
}

export function saveSave(save: SaveFile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}
