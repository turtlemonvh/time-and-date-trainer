import type { Peak } from '../../engine/peaks';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import type { CharacterPreset } from '../character/presets';
import PixelLayers from '../pixel/PixelLayers';
import { bodySlip } from '../pixel/sprites/body';

const SCALE = 8;

export interface FellProps {
  peak: Peak;
  characterPreset: CharacterPreset;
  onRetry: () => void;
  onReturnToMap: () => void;
}

/**
 * Shown when `Climb`'s `onFall` fires. Persisting the fall
 * (`recordFall`) is `App.tsx`'s job, not this screen's. Offers two exits,
 * unlike `Summit`'s single "Back to Map" — retrying in place is the whole
 * point of falling rather than summiting.
 */
export default function Fell({ peak, characterPreset, onRetry, onReturnToMap }: FellProps) {
  return (
    <main>
      <h1>You slipped!</h1>
      <PixelLayers
        layers={buildCharacterLayers(characterPreset, bodySlip, { harness: true })}
        scale={SCALE}
      />
      <p>
        Too many misses on <strong>{peak.name}</strong> sent you back down. Progress on other peaks
        is safe — try again whenever you&apos;re ready.
      </p>
      <button type="button" data-testid="fell-retry" onClick={onRetry}>
        Try Again
      </button>{' '}
      <button type="button" data-testid="fell-map" onClick={onReturnToMap}>
        Back to Map
      </button>
    </main>
  );
}
