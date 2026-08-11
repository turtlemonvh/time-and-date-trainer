export interface PeakProgress {
  summited: boolean;
  bestTimeMs: number | null;
  attempts: number;
}

export interface QuestionTypeStats {
  asked: number;
  correct: number;
  totalMs: number;
}

export interface ProfileSettings {
  difficulty: number;
}

export interface Profile {
  id: string;
  name: string;
  characterId: string;
  /** Epoch ms. */
  createdAt: number;
  settings: ProfileSettings;
  /** Keyed by `Peak.id`. */
  progress: Record<number, PeakProgress>;
  /** Keyed by `QuestionType.typeId`. */
  stats: Record<string, QuestionTypeStats>;
}

export interface SaveFile {
  v: 1;
  activeProfileId: string | null;
  profiles: Profile[];
}
