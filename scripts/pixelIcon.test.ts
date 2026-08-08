import { describe, expect, it } from 'vitest';
import { buildMountainGlyphSvg } from './pixelIcon.js';

describe('buildMountainGlyphSvg', () => {
  it('renders an SVG at the requested pixel size', () => {
    const svg = buildMountainGlyphSvg(192);
    expect(svg).toContain('width="192"');
    expect(svg).toContain('height="192"');
    expect(svg).toContain('viewBox="0 0 16 16"');
  });

  it('draws exactly the filled cells of the mountain glyph', () => {
    const svg = buildMountainGlyphSvg(64);
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    // 1 background rect + 184 glyph cells (the isoceles triangle + snow cap, see grid below)
    expect(rectCount).toBe(1 + 184);
  });

  it('shrinks the glyph into a safe zone when maskable', () => {
    const standard = buildMountainGlyphSvg(64);
    const maskable = buildMountainGlyphSvg(64, { maskable: true });
    expect(maskable).toContain('scale(');
    expect(maskable).not.toBe(standard);
  });
});
