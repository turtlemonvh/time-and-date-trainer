import PixelCanvas from '../pixel/PixelCanvas';
import { climberIdle, climberPalettes } from '../pixel/sprites/climber';

const SCALES = [4, 8, 12];

/**
 * Dev-only gallery: every sprite, at every palette variant, at a few
 * scales — so the pixel art style can be eyeballed without a full
 * character/animation set built out first. Grows one sprite/palette at a
 * time as the roster expands.
 */
export default function DebugSpritesPage() {
  return (
    <main>
      <h1>Debug: sprites</h1>
      <p>Dev-only. Every sprite, every palette variant, at a few scales.</p>

      <section>
        <h2>climberIdle</h2>
        {climberPalettes.map((palette, paletteIndex) => (
          <div key={paletteIndex} data-testid="sprite-palette-row">
            <h3>Palette {paletteIndex + 1}</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              {SCALES.map((scale) => (
                <div key={scale}>
                  <PixelCanvas sprite={climberIdle} palette={palette} scale={scale} />
                  <p>{scale}x</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
