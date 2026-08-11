import { mulberry32 } from '../../engine/rng';
import type { Profile } from '../../storage/types';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import { getCharacterPreset } from '../character/presets';
import ProfileChip from '../hud/ProfileChip';
import PixelLayers from '../pixel/PixelLayers';
import { generateMountainScene } from '../pixel/mountainScene';
import { MOUNTAIN_THEMES, pixelPeakHeight } from '../pixel/mountainThemes';
import { bodyIdle } from '../pixel/sprites/body';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MOUNTAIN_WIDTH = 64;
const MOUNTAIN_HEIGHT = 24;
const MOUNTAIN_SCALE = 3;
const PROFILE_PREVIEW_SCALE = 3;

export interface MapProps {
  profile: Profile;
  onSetDifficulty: (difficulty: number) => void;
  onSelectPeak: (peakId: number) => void;
}

/**
 * Peak selection. All 10 peaks are clickable from the start — the spec
 * never describes a peak-unlock mechanic (only "already-summited peaks
 * stay summited" on falling), and the engine is already peak-agnostic (any
 * peak works with any registered generator today; the peak's own
 * thematic-emphasis matching is a separate, already-documented gap).
 * Gating peaks here would be unscoped invented complexity.
 */
export default function Map({ profile, onSetDifficulty, onSelectPeak }: MapProps) {
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

      <p>
        <label htmlFor="map-difficulty">Difficulty</label>{' '}
        <select
          id="map-difficulty"
          data-testid="map-difficulty"
          value={profile.settings.difficulty}
          onChange={(event) => onSetDifficulty(Number(event.target.value))}
        >
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </p>

      <div
        data-testid="peak-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {MOUNTAIN_THEMES.map((theme) => {
          const progress = profile.progress[theme.peak.id];
          const status = progress?.summited
            ? 'Summited ✓'
            : progress
              ? `Attempts: ${progress.attempts}`
              : 'Not climbed yet';
          return (
            <button
              key={theme.peak.id}
              type="button"
              data-testid={`peak-option-${theme.peak.id}`}
              onClick={() => onSelectPeak(theme.peak.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                minWidth: 44,
                minHeight: 44,
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
              <span data-testid={`peak-progress-${theme.peak.id}`}>{status}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
