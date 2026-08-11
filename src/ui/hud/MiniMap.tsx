export interface MiniMapProps {
  position: number;
  height: number;
}

const TRACK_COLOR = '#e5e4e7';
const MARKER_COLOR = '#2e7d32';

/**
 * A vertical progress bar showing how far up the current peak the climber
 * has reached — distinct from the peak-selection `Map` screen (which shows
 * all 10 peaks); this is the small in-climb "how much further" indicator
 * the design spec's HUD section calls out separately.
 */
export default function MiniMap({ position, height }: MiniMapProps) {
  const fraction = height > 0 ? Math.max(0, Math.min(1, position / height)) : 0;
  return (
    <div data-testid="mini-map" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={height}
        style={{
          width: 20,
          height: 80,
          background: TRACK_COLOR,
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="mini-map-fill"
          style={{ height: `${fraction * 100}%`, background: MARKER_COLOR }}
        />
      </div>
      <span data-testid="mini-map-label" style={{ fontSize: 12 }}>
        {position} / {height}
      </span>
    </div>
  );
}
