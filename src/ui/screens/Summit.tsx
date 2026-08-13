import type { Peak } from '../../engine/peaks';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import type { CharacterPreset } from '../character/presets';
import { formatDuration } from '../formatDuration';
import PixelLayers from '../pixel/PixelLayers';
import { bodyCheer } from '../pixel/sprites/body';

const SCALE = 8;

export interface SummitProps {
  peak: Peak;
  characterPreset: CharacterPreset;
  elapsedMs: number;
  onContinue: () => void;
}

/**
 * Shown when `Climb`'s `onSummit` fires. Persisting the summit
 * (`recordSummit`) is `App.tsx`'s job, not this screen's — same as
 * `ProfileSelect`/`Map` staying presentational and letting the caller own
 * storage writes.
 */
export default function Summit({ peak, characterPreset, elapsedMs, onContinue }: SummitProps) {
  return (
    <main>
      <h1>Summit reached!</h1>
      <PixelLayers
        layers={buildCharacterLayers(characterPreset, bodyCheer, { harness: true })}
        scale={SCALE}
      />
      <p>
        You made it to the top of <strong>{peak.name}</strong> in{' '}
        <span data-testid="summit-time">{formatDuration(elapsedMs)}</span>!
      </p>
      <p>
        {peak.name} is yours forever — already-summited peaks stay summited even if you fall on a
        later climb.
      </p>
      <button type="button" data-testid="summit-continue" onClick={onContinue}>
        Back to Map
      </button>
    </main>
  );
}
