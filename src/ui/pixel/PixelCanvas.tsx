import { useEffect, useRef } from 'react';
import type { Palette, Sprite } from './types';

/**
 * Renders a `Sprite` + `Palette` to a `<canvas>`, one filled rect per pixel.
 * `imageSmoothingEnabled = false` and an integer `scale` keep the art crisp
 * (no blurry upscaling) at any size.
 */
export default function PixelCanvas({
  sprite,
  palette,
  scale = 8,
}: {
  sprite: Sprite;
  palette: Palette;
  scale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
  }, [sprite, palette, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={sprite.w * scale}
      height={sprite.h * scale}
      style={{ imageRendering: 'pixelated', width: sprite.w * scale, height: sprite.h * scale }}
    />
  );
}
