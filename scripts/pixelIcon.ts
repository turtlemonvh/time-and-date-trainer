import { BACKGROUND_COLOR } from '../app.config.js';

const ROCK = '#57606f';
const SNOW = '#f1f5f9';

// 16x16 grid: '.' transparent, 'W' snow cap, 'R' rock. An isoceles mountain
// silhouette, widening by 2 columns per row until it fills the full width.
const GRID = [
  '................',
  '.......WW.......',
  '......WWWW......',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
  '.RRRRRRRRRRRRRR.',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
];

const PALETTE: Record<string, string> = { R: ROCK, W: SNOW };

function glyphRects(): string {
  const rects: string[] = [];
  GRID.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '.') return;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[cell]}"/>`);
    });
  });
  return rects.join('');
}

export function buildMountainGlyphSvg(sizePx: number, opts: { maskable?: boolean } = {}): string {
  const bg = `<rect width="16" height="16" fill="${BACKGROUND_COLOR}"/>`;
  const glyph = opts.maskable
    ? `<g transform="translate(2.4 2.4) scale(0.7)">${glyphRects()}</g>`
    : glyphRects();
  return (
    `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 16 16" ` +
    `xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">` +
    `${bg}${glyph}</svg>`
  );
}
