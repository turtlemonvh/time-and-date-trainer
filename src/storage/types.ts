export interface PeakProgress {
  /** This peak's current/selected difficulty level (1-10), independent of
   * any other peak's. Defaults to 1 the first time a peak is visited. */
  difficulty: number;
  /** The highest difficulty this peak has ever been summited at, or `null`
   * if never summited. Use `isPeakSummited` rather than checking this
   * directly for a plain summited/not-summited read. */
  highestDifficultyCleared: number | null;
  bestTimeMs: number | null;
  /** Summit + fall outcomes only — see `bails` for the third outcome. */
  attempts: number;
  bails: number;
}

export interface QuestionTypeStats {
  asked: number;
  correct: number;
  totalMs: number;
}

/** One row per completed (or bailed) climb — the full history `PeakProgress`'s
 * lifetime aggregates can't reconstruct on their own (which difficulty, when,
 * how long, which of the three outcomes). */
export interface ClimbLogEntry {
  id: string;
  peakId: number;
  difficulty: number;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms. */
  endedAt: number;
  result: 'summited' | 'fell' | 'bailed';
}

/** A target: summit `peakId` at `difficulty` by `targetDate`. Satisfied by
 * summiting at `difficulty` *or higher* — see `checkGoalsAchieved`. */
export interface Goal {
  id: string;
  peakId: number;
  difficulty: number;
  /** ISO date (yyyy-mm-dd), no time component. */
  targetDate: string;
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms, or `null` while still pending. */
  achievedAt: number | null;
}

export interface Profile {
  id: string;
  name: string;
  characterId: string;
  /** Epoch ms. */
  createdAt: number;
  /** Keyed by `Peak.id`. */
  progress: Record<number, PeakProgress>;
  /** Keyed by `QuestionType.typeId`. */
  stats: Record<string, QuestionTypeStats>;
  goals: Goal[];
  climbLog: ClimbLogEntry[];
}

export interface SaveFile {
  v: 2;
  activeProfileId: string | null;
  profiles: Profile[];
}
