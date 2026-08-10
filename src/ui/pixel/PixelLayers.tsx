import { useEffect, useRef } from 'react';
import type { Palette, Sprite } from './types';

export interface Layer {
  sprite: Sprite;
  palette: Palette;
}

/**
 * Composites several same-size sprites onto one canvas, each with its own
 * palette, drawn in array order (later layers painting over earlier ones
 * wherever they're non-transparent). This is how a character is built from
 * a base body plus swappable/colorable headgear and harness layers,
 * rather than one monolithic sprite per character variant.
 */
export default function PixelLayers({ layers, scale = 8 }: { layers: Layer[]; scale?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h } = layers[0]?.sprite ?? { w: 0, h: 0 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const { sprite, palette } of layers) {
      for (let row = 0; row < sprite.h; row++) {
        const line = sprite.grid[row];
        for (let col = 0; col < sprite.w; col++) {
          const char = line[col];
          if (char === '.') continue;
          const slotName = sprite.slots[char];
          const color = slotName ? palette[slotName] : undefined;
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(col * scale, row * scale, scale, scale);
        }
      }
    }
  }, [layers, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={w * scale}
      height={h * scale}
      style={{ imageRendering: 'pixelated', width: w * scale, height: h * scale }}
    />
  );
}
