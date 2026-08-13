import { useState } from 'react';
import { describeDifficultyDelta } from '../../engine/difficultyDescribe';
import { mulberry32 } from '../../engine/rng';
import { isPeakSummited } from '../../storage/profile';
import type { PeakProgress, Profile } from '../../storage/types';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import { getCharacterPreset } from '../character/presets';
import ProfileChip from '../hud/ProfileChip';
import PixelLayers from '../pixel/PixelLayers';
import { generateMountainScene } from '../pixel/mountainScene';
import { MOUNTAIN_THEMES, pixelPeakHeight, type MountainTheme } from '../pixel/mountainThemes';
import { bodyIdle } from '../pixel/sprites/body';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MOUNTAIN_WIDTH = 64;
const MOUNTAIN_HEIGHT = 24;
const MOUNTAIN_SCALE = 3;
const PROFILE_PREVIEW_SCALE = 3;

export interface MapProps {
  profile: Profile;
  /** Starts a climb on `peakId` at `difficulty` — the caller is responsible
   * for persisting that as the peak's new current level (see
   * `setPeakDifficulty`) before actually starting it. */
  onClimb: (peakId: number, difficulty: number) => void;
}

function statusText(progress: PeakProgress | undefined): string {
  if (!progress) return 'Not climbed yet';
  if (isPeakSummited(progress)) {
    return `Summited ✓ (up to level ${progress.highestDifficultyCleared})`;
  }
  return `Attempts: ${progress.attempts}`;
}

interface PeakCardProps {
  theme: MountainTheme;
  progress: PeakProgress | undefined;
  onClimb: (peakId: number, difficulty: number) => void;
}

/**
 * One peak's picker: shows progress so far, lets the player pick any level
 * 1-10 (not just "the next one up"), compares that choice against the
 * highest level already cleared here, and starts the climb once they
 * confirm with "Climb!". The picked level is local, provisional state until
 * that click — nothing is persisted just from browsing the dropdown.
 */
function PeakCard({ theme, progress, onClimb }: PeakCardProps) {
  const highestCleared = progress?.highestDifficultyCleared ?? null;
  const defaultLevel =
    highestCleared !== null ? Math.min(highestCleared + 1, 10) : (progress?.difficulty ?? 1);
  const [selectedLevel, setSelectedLevel] = useState(defaultLevel);
  const delta = describeDifficultyDelta(highestCleared ?? 1, selectedLevel);

  return (
    <article
      data-testid={`peak-option-${theme.peak.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        minWidth: 44,
        padding: '0.5rem',
      }}
    >
      <PixelLayers
        layers={generateMountainScene(
          mulberry32(theme.peak.id),
          MOUNTAIN_WIDTH,
          MOUNTAIN_HEIGHT,
          pixelPeakHeight(theme.peak),
          theme.rock,
          theme.snow,
        )}
        scale={MOUNTAIN_SCALE}
      />
      <strong>
        {theme.peak.id}. {theme.peak.name}
      </strong>
      <span>{theme.peak.emphasis}</span>
      <span data-testid={`peak-progress-${theme.peak.id}`}>{statusText(progress)}</span>

      <p>
        <label htmlFor={`peak-difficulty-${theme.peak.id}`}>Level</label>{' '}
        <select
          id={`peak-difficulty-${theme.peak.id}`}
          data-testid={`peak-difficulty-${theme.peak.id}`}
          value={selectedLevel}
          onChange={(event) => setSelectedLevel(Number(event.target.value))}
        >
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </p>

      {delta.length > 0 && (
        <ul data-testid={`peak-difficulty-delta-${theme.peak.id}`}>
          {delta.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        data-testid={`peak-climb-${theme.peak.id}`}
        onClick={() => onClimb(theme.peak.id, selectedLevel)}
        style={{ minWidth: 44, minHeight: 44 }}
      >
        Climb!
      </button>
    </article>
  );
}

/**
 * Peak selection. All 10 peaks are clickable from the start — the spec
 * never describes a peak-unlock mechanic (only "already-summited peaks
 * stay summited" on falling), and the engine is already peak-agnostic (any
 * peak works with any registered generator today; the peak's own
 * thematic-emphasis matching is a separate, already-documented gap).
 * Gating peaks here would be unscoped invented complexity.
 */
export default function Map({ profile, onClimb }: MapProps) {
  const preset = getCharacterPreset(profile.characterId);

  return (
    <main>
      <h1>Choose a peak</h1>
      <ProfileChip
        name={profile.name}
        preview={
          <PixelLayers
            layers={buildCharacterLayers(preset, bodyIdle, { harness: true })}
            scale={PROFILE_PREVIEW_SCALE}
          />
        }
      />

      <div
        data-testid="peak-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {MOUNTAIN_THEMES.map((theme) => (
          <PeakCard
            key={theme.peak.id}
            theme={theme}
            progress={profile.progress[theme.peak.id]}
            onClimb={onClimb}
          />
        ))}
      </div>
    </main>
  );
}
