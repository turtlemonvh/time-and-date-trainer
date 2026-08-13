import type { PeakProgress, Profile, SaveFile } from './types';

const STORAGE_KEY = 'timescaler.save';
export const CURRENT_VERSION = 2;

function emptySave(): SaveFile {
  return { v: CURRENT_VERSION, activeProfileId: null, profiles: [] };
}

// v1 shapes, kept locally only for the migration below — the live types in
// `./types` are v2-only, so a v1 shape has nowhere else to live once v2 ships.
interface V1PeakProgress {
  summited: boolean;
  bestTimeMs: number | null;
  attempts: number;
}
interface V1Profile {
  id: string;
  name: string;
  characterId: string;
  createdAt: number;
  settings: { difficulty: number };
  progress: Record<number, V1PeakProgress>;
  stats: Profile['stats'];
}
interface V1SaveFile {
  v: 1;
  activeProfileId: string | null;
  profiles: V1Profile[];
}

/**
 * v1 never recorded which difficulty a summit happened at (difficulty was a
 * single global profile setting, not per-peak), so `highestDifficultyCleared`
 * here is a best-effort approximation using that global setting — not a
 * fact recovered from history. `goals`/`climbLog` start empty on every
 * migrated profile: there's no way to reconstruct sessions that already
 * happened, an accepted, unavoidable gap.
 */
function migratePeakProgress(v1: V1PeakProgress, globalDifficulty: number): PeakProgress {
  return {
    difficulty: globalDifficulty,
    highestDifficultyCleared: v1.summited ? globalDifficulty : null,
    bestTimeMs: v1.bestTimeMs,
    attempts: v1.attempts,
    bails: 0,
  };
}

function migrateV1ToV2(v1: V1SaveFile): SaveFile {
  return {
    v: 2,
    activeProfileId: v1.activeProfileId,
    profiles: v1.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      characterId: profile.characterId,
      createdAt: profile.createdAt,
      // `settings.difficulty` (a single global level) doesn't survive the
      // move to per-peak difficulty — it's only read here, as the seed for
      // migratePeakProgress's best-effort guess, then dropped.
      progress: Object.fromEntries(
        Object.entries(profile.progress).map(([peakId, p]) => [
          peakId,
          migratePeakProgress(p, profile.settings.difficulty),
        ]),
      ),
      stats: profile.stats,
      goals: [],
      climbLog: [],
    })),
  };
}

/**
 * Migrates a parsed-but-unvalidated save blob up to the current schema
 * version, applying migrations in order so a future version bump has an
 * established place to plug in rather than being invented from scratch
 * under time pressure.
 */
function migrate(raw: unknown): SaveFile {
  if (!raw || typeof raw !== 'object') return emptySave();
  const candidate = raw as { v?: unknown; activeProfileId?: unknown; profiles?: unknown };
  if (candidate.v === 2 && Array.isArray(candidate.profiles)) {
    return candidate as SaveFile;
  }
  if (candidate.v === 1 && Array.isArray(candidate.profiles)) {
    return migrateV1ToV2(candidate as V1SaveFile);
  }
  // No known migration path for anything else — starting fresh is safer
  // than misinterpreting an unrecognized shape.
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
