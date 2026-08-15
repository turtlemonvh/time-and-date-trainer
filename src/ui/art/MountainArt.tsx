import { useId } from 'react';
import { buildMountainGeometry } from './mountainGeometry';

export interface MountainArtProps {
  rock: string;
  snow: string;
  /** A peak's own id — fixes this mountain's ridge shape deterministically. */
  seed: number;
  /** 0-1, how tall the summit reads within `height`. */
  peakHeightFraction: number;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 128;
const DEFAULT_HEIGHT = 48;

/**
 * A painterly gradient mountain silhouette — the peak-card art direction
 * approved over the earlier blocky pixel-art mountain scenes (still used
 * as-is on `/debug/sprites` for inspecting the underlying pixel generator,
 * and by the character sprites, which stay pixel art until a later
 * character-animation pass aligns them to this same look).
 */
export default function MountainArt({
  rock,
  snow,
  seed,
  peakHeightFraction,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: MountainArtProps) {
  const gradientId = useId();
  const { silhouette, snowCap } = buildMountainGeometry(seed, width, height, peakHeightFraction);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={snow} />
          <stop offset="55%" stopColor={rock} />
          <stop offset="100%" stopColor={rock} />
        </linearGradient>
      </defs>
      <path d={silhouette} fill={`url(#${gradientId})`} />
      <path d={snowCap} fill={snow} opacity={0.85} />
    </svg>
  );
}
