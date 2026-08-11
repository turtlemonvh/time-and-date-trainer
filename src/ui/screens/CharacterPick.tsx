import { buildCharacterLayers } from '../character/buildCharacterLayers';
import { CHARACTER_PRESETS } from '../character/presets';
import PixelLayers from '../pixel/PixelLayers';
import { bodyIdle } from '../pixel/sprites/body';

const SCALE = 6;

export interface CharacterPickProps {
  onPick: (characterId: string) => void;
}

/**
 * One-time-per-profile look choice, reached right after naming a new
 * profile. Picks from `CHARACTER_PRESETS` rather than exposing raw color
 * pickers (that's `/debug/sprites`'s engineering-grade job, not a
 * 7-9-year-old's) — the choice sticks as `Profile.characterId` from here on.
 */
export default function CharacterPick({ onPick }: CharacterPickProps) {
  return (
    <main>
      <h1>Pick your climber</h1>
      <p>Choose how your climber looks. You can&apos;t change this later.</p>
      <div
        data-testid="character-grid"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}
      >
        {CHARACTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            data-testid={`character-option-${preset.id}`}
            onClick={() => onPick(preset.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <PixelLayers
              layers={buildCharacterLayers(preset, bodyIdle, { harness: true })}
              scale={SCALE}
            />
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
