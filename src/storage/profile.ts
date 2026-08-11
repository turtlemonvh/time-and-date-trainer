import type { Profile, QuestionTypeStats, SaveFile } from './types';

const DEFAULT_DIFFICULTY = 3;

function makeProfileId(): string {
  return crypto.randomUUID();
}

/** Creates a new profile, appends it, and makes it the active one. */
export function createProfile(save: SaveFile, name: string, characterId: string): SaveFile {
  const profile: Profile = {
    id: makeProfileId(),
    name,
    characterId,
    createdAt: Date.now(),
    settings: { difficulty: DEFAULT_DIFFICULTY },
    progress: {},
    stats: {},
  };
  return {
    ...save,
    profiles: [...save.profiles, profile],
    activeProfileId: profile.id,
  };
}

export function getProfile(save: SaveFile, profileId: string): Profile | undefined {
  return save.profiles.find((profile) => profile.id === profileId);
}

function updateProfile(
  save: SaveFile,
  profileId: string,
  update: (profile: Profile) => Profile,
): SaveFile {
  return {
    ...save,
    profiles: save.profiles.map((profile) =>
      profile.id === profileId ? update(profile) : profile,
    ),
  };
}

export function setDifficulty(save: SaveFile, profileId: string, difficulty: number): SaveFile {
  return updateProfile(save, profileId, (profile) => ({
    ...profile,
    settings: { ...profile.settings, difficulty },
  }));
}

/** Marks a peak summited, keeping the best (lowest) time and incrementing attempts. */
export function recordSummit(
  save: SaveFile,
  profileId: string,
  peakId: number,
  timeMs: number,
): SaveFile {
  return updateProfile(save, profileId, (profile) => {
    const prior = profile.progress[peakId];
    const bestTimeMs = prior?.bestTimeMs != null ? Math.min(prior.bestTimeMs, timeMs) : timeMs;
    return {
      ...profile,
      progress: {
        ...profile.progress,
        [peakId]: { summited: true, bestTimeMs, attempts: (prior?.attempts ?? 0) + 1 },
      },
    };
  });
}

/** Increments attempts on a fall. `summited`/`bestTimeMs` carry over unchanged from any prior run. */
export function recordFall(save: SaveFile, profileId: string, peakId: number): SaveFile {
  return updateProfile(save, profileId, (profile) => {
    const prior = profile.progress[peakId];
    return {
      ...profile,
      progress: {
        ...profile.progress,
        [peakId]: {
          summited: prior?.summited ?? false,
          bestTimeMs: prior?.bestTimeMs ?? null,
          attempts: (prior?.attempts ?? 0) + 1,
        },
      },
    };
  });
}

export function recordQuestionStat(
  save: SaveFile,
  profileId: string,
  typeId: string,
  correct: boolean,
  elapsedMs: number,
): SaveFile {
  return updateProfile(save, profileId, (profile) => {
    const prior: QuestionTypeStats = profile.stats[typeId] ?? { asked: 0, correct: 0, totalMs: 0 };
    return {
      ...profile,
      stats: {
        ...profile.stats,
        [typeId]: {
          asked: prior.asked + 1,
          correct: prior.correct + (correct ? 1 : 0),
          totalMs: prior.totalMs + elapsedMs,
        },
      },
    };
  });
}
