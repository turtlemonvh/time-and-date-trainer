import { useState, type CSSProperties } from 'react';
import type { Peak } from '../../engine/peaks';
import type { SummitTier } from '../../storage/profile';
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
  /** How enthusiastic the celebration should be — see `summitTier` in
   * `storage/profile.ts` for how the caller derives this from the profile's
   * state just before this summit was recorded. */
  tier: SummitTier;
  /** Scales the confetti burst — a summit at a harder difficulty earns a
   * bigger celebration, independent of which tier it is. */
  difficulty: number;
  onContinue: () => void;
}

const TIER_MESSAGE: Readonly<Record<SummitTier, string | null>> = {
  success: null,
  newBest: 'New personal best!',
  firstAtDifficulty: 'First time clearing this level!',
};

/** Confetti pieces per tier, before the difficulty bonus — "more
 * enthusiastic as you go up from 1 to 3" per the original ask, executed as
 * "more confetti" rather than a different effect per tier. */
const TIER_BASE_CONFETTI: Readonly<Record<SummitTier, number>> = {
  success: 4,
  newBest: 7,
  firstAtDifficulty: 10,
};

const CONFETTI_COLORS = ['var(--accent)', 'var(--pine)', 'var(--gold)', 'var(--danger)'];

interface ConfettiPiece {
  dx: number;
  dy: number;
  rot: number;
  color: string;
  delayMs: number;
}

/** CSS custom properties aren't part of the standard `CSSProperties` type —
 * this narrow extension is only for the three confetti-position variables
 * the `--dx`/`--dy`/`--rot` keyframe in index.css reads. */
type ConfettiStyle = CSSProperties & { '--dx': string; '--dy': string; '--rot': string };

/** A roughly circular burst, biased upward (negative dy — CSS y grows
 * downward) since confetti erupting up and out from behind the character
 * reads better than starting by falling. Positions are genuinely random,
 * not seeded — this is one-shot decoration, not engine content that needs
 * to reproduce from a seed. */
function buildConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const distance = 40 + Math.random() * 40;
    return {
      dx: Math.cos(angle) * distance,
      dy: -Math.abs(Math.sin(angle) * distance) - 20,
      rot: Math.random() * 360 - 180,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delayMs: Math.random() * 200,
    };
  });
}

/**
 * Shown when `Climb`'s `onSummit` fires. Persisting the summit
 * (`recordSummit`) is `App.tsx`'s job, not this screen's — same as
 * `ProfileSelect`/`Map` staying presentational and letting the caller own
 * storage writes. The confetti/ribbon/badge celebration reuses the cheer
 * pose completely unchanged — only what happens around the character
 * differs by tier, consistent with deferring character-sprite changes to
 * a later pass.
 */
export default function Summit({
  peak,
  characterPreset,
  elapsedMs,
  tier,
  difficulty,
  onContinue,
}: SummitProps) {
  // Locked in on mount, not recomputed every render — otherwise the
  // confetti would jump to new random positions on any unrelated re-render.
  const [confetti] = useState(() =>
    buildConfetti(TIER_BASE_CONFETTI[tier] + Math.floor(difficulty / 2)),
  );
  const tierMessage = TIER_MESSAGE[tier];

  return (
    <main>
      <h1>Summit reached!</h1>
      <div className="celebrate-wrap" data-testid="summit-celebration">
        {tier !== 'success' && (
          <span className="summit-ribbon" data-testid="summit-ribbon">
            NEW BEST!
          </span>
        )}
        <PixelLayers
          layers={buildCharacterLayers(characterPreset, bodyCheer, { harness: true })}
          scale={SCALE}
        />
        {tier === 'firstAtDifficulty' && (
          <span className="summit-badge" data-testid="summit-badge" aria-hidden="true">
            🏅
          </span>
        )}
        {confetti.map((piece, i) => (
          <span
            key={i}
            className="confetti-piece"
            data-testid="summit-confetti-piece"
            style={
              {
                '--dx': `${piece.dx}px`,
                '--dy': `${piece.dy}px`,
                '--rot': `${piece.rot}deg`,
                background: piece.color,
                animationDelay: `${piece.delayMs}ms`,
              } as ConfettiStyle
            }
          />
        ))}
      </div>
      <p>
        You made it to the top of <strong>{peak.name}</strong> in{' '}
        <span data-testid="summit-time">{formatDuration(elapsedMs)}</span>!
      </p>
      {tierMessage && (
        <p data-testid="summit-tier-message" style={{ fontWeight: 700, color: 'var(--pine)' }}>
          {tierMessage}
        </p>
      )}
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
