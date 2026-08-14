import { useMemo, useState } from 'react';
import { formatDateLong } from '../../engine/dateMath';
import { describeDifficultyComparisonTable } from '../../engine/difficultyDescribe';
import { mulberry32 } from '../../engine/rng';
import { highestAttemptBeyondCleared, isPeakSummited } from '../../storage/profile';
import type { PeakProgress, Profile } from '../../storage/types';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import { getCharacterPreset } from '../character/presets';
import { climbLogResultLabel, sortedClimbLog } from '../climbLogCsv';
import { formatDuration } from '../formatDuration';
import ProfileChip from '../hud/ProfileChip';
import PixelLayers from '../pixel/PixelLayers';
import { generateMountainScene } from '../pixel/mountainScene';
import { MOUNTAIN_THEMES, pixelPeakHeight, type MountainTheme } from '../pixel/mountainThemes';
import { bodyIdle } from '../pixel/sprites/body';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MOUNTAIN_WIDTH = 64;
const MOUNTAIN_HEIGHT = 24;
const MOUNTAIN_SCALE = 2;
const PROFILE_PREVIEW_SCALE = 3;
const HISTORY_PREVIEW_LIMIT = 5;

export interface MapProps {
  profile: Profile;
  /** Starts a climb on `peakId` at `difficulty` — the caller is responsible
   * for persisting that as the peak's new current level (see
   * `setPeakDifficulty`) before actually starting it. */
  onClimb: (peakId: number, difficulty: number) => void;
  /** Opens the parent/teacher Review screen. */
  onReview: () => void;
  /** Opens the Review screen's Climber Log tab, pre-filtered to this
   * peak+level — the card's own history preview only shows the last
   * `HISTORY_PREVIEW_LIMIT` entries; this is "see the rest." */
  onViewFullHistory: (peakId: number, difficulty: number) => void;
}

interface PeakCardProps {
  theme: MountainTheme;
  progress: PeakProgress | undefined;
  climbLog: Profile['climbLog'];
  onClimb: (peakId: number, difficulty: number) => void;
  onViewFullHistory: (peakId: number, difficulty: number) => void;
}

/**
 * One peak's picker: shows progress-so-far pills, lets the player pick any
 * level 1-10 (not just "the next one up"), and a "Level N details"
 * disclosure with a full current-vs-picked comparison table plus recent
 * history at the picked level. The picked level is local, provisional
 * state until "Climb!" — nothing is persisted just from browsing the
 * dropdown or the disclosure.
 */
function PeakCard({ theme, progress, climbLog, onClimb, onViewFullHistory }: PeakCardProps) {
  const peak = theme.peak;
  const highestCleared = progress?.highestDifficultyCleared ?? null;
  const defaultLevel =
    highestCleared !== null ? Math.min(highestCleared + 1, 10) : (progress?.difficulty ?? 1);
  const [selectedLevel, setSelectedLevel] = useState(defaultLevel);

  const compareRows = useMemo(
    () => describeDifficultyComparisonTable(highestCleared ?? 1, selectedLevel),
    [highestCleared, selectedLevel],
  );

  const levelHistory = useMemo(
    () =>
      sortedClimbLog(climbLog).filter(
        (entry) => entry.peakId === peak.id && entry.difficulty === selectedLevel,
      ),
    [climbLog, peak.id, selectedLevel],
  );

  const attemptBeyond = highestAttemptBeyondCleared(climbLog, peak.id, highestCleared);
  const summited = progress ? isPeakSummited(progress) : false;

  return (
    <article
      data-testid={`peak-option-${peak.id}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.75rem',
      }}
    >
      <PixelLayers
        layers={generateMountainScene(
          mulberry32(peak.id),
          MOUNTAIN_WIDTH,
          MOUNTAIN_HEIGHT,
          pixelPeakHeight(peak),
          theme.rock,
          theme.snow,
        )}
        scale={MOUNTAIN_SCALE}
      />

      <div style={{ flex: '1 1 200px', minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
          <strong>
            {peak.id}. {peak.name}
          </strong>
          <span
            data-testid={`peak-progress-${peak.id}`}
            style={{ display: 'flex', gap: '0.35rem' }}
          >
            {!summited && !attemptBeyond && (
              <span data-testid={`peak-status-none-${peak.id}`}>Not climbed yet</span>
            )}
            {summited && (
              <span data-testid={`peak-status-summit-${peak.id}`}>
                Summited · Lv {highestCleared}
              </span>
            )}
            {attemptBeyond && (
              <span data-testid={`peak-status-attempt-${peak.id}`}>
                Tried Lv {attemptBeyond.difficulty} ({attemptBeyond.count}×)
              </span>
            )}
          </span>
        </div>
        <span>{peak.emphasis}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <label htmlFor={`peak-difficulty-${peak.id}`}>Level</label>
        <select
          id={`peak-difficulty-${peak.id}`}
          data-testid={`peak-difficulty-${peak.id}`}
          value={selectedLevel}
          onChange={(event) => setSelectedLevel(Number(event.target.value))}
          style={{ minHeight: 44 }}
        >
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid={`peak-climb-${peak.id}`}
          onClick={() => onClimb(peak.id, selectedLevel)}
          style={{ minWidth: 44, minHeight: 44 }}
        >
          Climb!
        </button>
      </div>

      <details style={{ flexBasis: '100%' }}>
        <summary data-testid={`peak-details-toggle-${peak.id}`}>
          Level {selectedLevel} details
        </summary>

        <table data-testid={`peak-compare-${peak.id}`}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Now</th>
              <th>Level {selectedLevel}</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row) => (
              <tr
                key={row.item}
                data-testid={`peak-compare-row-${peak.id}`}
                data-changed={row.changed}
                style={
                  row.changed ? { background: 'var(--accent-bg)', fontWeight: 700 } : undefined
                }
              >
                <td>{row.item}</td>
                <td>{row.current}</td>
                <td>{row.next}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ margin: '0.5rem 0 0.25rem' }}>History at level {selectedLevel}</p>
        {levelHistory.length === 0 ? (
          <p data-testid={`peak-history-empty-${peak.id}`}>No climbs at this level yet.</p>
        ) : (
          <>
            <table data-testid={`peak-history-${peak.id}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {levelHistory.slice(0, HISTORY_PREVIEW_LIMIT).map((entry) => (
                  <tr key={entry.id} data-testid={`peak-history-row-${peak.id}`}>
                    <td>{formatDateLong(new Date(entry.startedAt))}</td>
                    <td>{formatDuration(entry.endedAt - entry.startedAt)}</td>
                    <td>{climbLogResultLabel(entry.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {levelHistory.length > HISTORY_PREVIEW_LIMIT && (
              <button
                type="button"
                data-testid={`peak-history-more-${peak.id}`}
                onClick={() => onViewFullHistory(peak.id, selectedLevel)}
              >
                See all {levelHistory.length} →
              </button>
            )}
          </>
        )}
      </details>
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
export default function Map({ profile, onClimb, onReview, onViewFullHistory }: MapProps) {
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
      <button type="button" data-testid="map-review-link" onClick={onReview}>
        Review (for parents/teachers)
      </button>

      <div
        data-testid="peak-grid"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {MOUNTAIN_THEMES.map((theme) => (
          <PeakCard
            key={theme.peak.id}
            theme={theme}
            progress={profile.progress[theme.peak.id]}
            climbLog={profile.climbLog}
            onClimb={onClimb}
            onViewFullHistory={onViewFullHistory}
          />
        ))}
      </div>
    </main>
  );
}
