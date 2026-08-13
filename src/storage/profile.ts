import type { ClimbLogEntry, PeakProgress, Profile, QuestionTypeStats, SaveFile } from './types';

const DEFAULT_DIFFICULTY = 3;
const DEFAULT_PEAK_DIFFICULTY = 1;

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
    goals: [],
    climbLog: [],
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

/** `progress[peakId] !== null` for a peak never yet visited — every reducer
 * that touches a peak's progress starts from this rather than assuming an
 * entry already exists. */
function defaultPeakProgress(): PeakProgress {
  return {
    difficulty: DEFAULT_PEAK_DIFFICULTY,
    highestDifficultyCleared: null,
    bestTimeMs: null,
    attempts: 0,
    bails: 0,
  };
}

/** Whether a peak has ever been summited, at any difficulty. */
export function isPeakSummited(progress: PeakProgress): boolean {
  return progress.highestDifficultyCleared !== null;
}

function makeClimbLogEntry(
  peakId: number,
  difficulty: number,
  elapsedMs: number,
  result: ClimbLogEntry['result'],
): ClimbLogEntry {
  const endedAt = Date.now();
  return {
    id: crypto.randomUUID(),
    peakId,
    difficulty,
    startedAt: endedAt - elapsedMs,
    endedAt,
    result,
  };
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

/** Marks a peak summited at `difficulty`, keeping the best (lowest) time and
 * the highest difficulty ever cleared, and appends a climb-log entry. */
export function recordSummit(
  save: SaveFile,
  profileId: string,
  peakId: number,
  difficulty: number,
  elapsedMs: number,
): SaveFile {
  return updateProfile(save, profileId, (profile) => {
    const prior = profile.progress[peakId] ?? defaultPeakProgress();
    const bestTimeMs = prior.bestTimeMs != null ? Math.min(prior.bestTimeMs, elapsedMs) : elapsedMs;
    return {
      ...profile,
      progress: {
        ...profile.progress,
        [peakId]: {
          ...prior,
          highestDifficultyCleared: Math.max(prior.highestDifficultyCleared ?? 0, difficulty),
          bestTimeMs,
          attempts: prior.attempts + 1,
        },
      },
      climbLog: [...profile.climbLog, makeClimbLogEntry(peakId, difficulty, elapsedMs, 'summited')],
    };
  });
}

/** Increments attempts on a fall and appends a climb-log entry.
 * `highestDifficultyCleared`/`bestTimeMs` carry over unchanged from any
 * prior run. */
export function recordFall(
  save: SaveFile,
  profileId: string,
  peakId: number,
  difficulty: number,
  elapsedMs: number,
): SaveFile {
  return updateProfile(save, profileId, (profile) => {
    const prior = profile.progress[peakId] ?? defaultPeakProgress();
    return {
      ...profile,
      progress: {
        ...profile.progress,
        [peakId]: { ...prior, attempts: prior.attempts + 1 },
      },
      climbLog: [...profile.climbLog, makeClimbLogEntry(peakId, difficulty, elapsedMs, 'fell')],
    };
  });
}

/** Increments `bails` (a separate counter from `attempts` — bailing out is a
 * third, distinct outcome from summiting or falling) and appends a
 * climb-log entry. */
export function recordBail(
  save: SaveFile,
  profileId: string,
  peakId: number,
  difficulty: number,
  elapsedMs: number,
): SaveFile {
  return updateProfile(save, profileId, (profile) => {
    const prior = profile.progress[peakId] ?? defaultPeakProgress();
    return {
      ...profile,
      progress: {
        ...profile.progress,
        [peakId]: { ...prior, bails: prior.bails + 1 },
      },
      climbLog: [...profile.climbLog, makeClimbLogEntry(peakId, difficulty, elapsedMs, 'bailed')],
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
