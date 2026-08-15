import { useState } from 'react';
import type { Peak } from '../../engine/peaks';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import type { CharacterPreset } from '../character/presets';
import PixelLayers from '../pixel/PixelLayers';
import { bodySlip } from '../pixel/sprites/body';

const SCALE = 8;

/** Playful, low-stakes tone — issue #76's design review (Climb Feedback
 * Concepts) recommended this over a warmer/gentler tone or a growth-mindset
 * coaching tone, since the point of this whole animation batch is keeping a
 * fall feeling like part of the game rather than a failure to be coached
 * through. */
const ENCOURAGING_MESSAGES: readonly string[] = [
  'Whoops! Even mountain goats trip sometimes.',
  'Gravity: 1, You: 0. Rematch?',
  'That slope was extra slippery today!',
  'Your boots needed a snack break. Try again!',
  'Ice happens. Climb on!',
];

function randomMessage(): string {
  return ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
}

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
  // Picked once per fall, not on every re-render — otherwise it would
  // shuffle out from under the player if this screen re-renders for any
  // unrelated reason before they click away.
  const [message] = useState(randomMessage);
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
      <p data-testid="fell-message" className="fell-message">
        &ldquo;{message}&rdquo;
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
