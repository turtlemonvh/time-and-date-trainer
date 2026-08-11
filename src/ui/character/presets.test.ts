import { describe, expect, it } from 'vitest';
import { CHARACTER_PRESETS, getCharacterPreset } from './presets';

describe('CHARACTER_PRESETS', () => {
  it('has at least half a dozen distinct presets', () => {
    expect(CHARACTER_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it('has unique ids', () => {
    const ids = CHARACTER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique names', () => {
    const names = CHARACTER_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every preset supplies a color for every body palette slot', () => {
    for (const preset of CHARACTER_PRESETS) {
      expect(preset.palette.skin).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.palette.hair).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.palette.shirt).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.palette.pants).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.palette.shoes).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.palette.eyes).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('uses a valid hair style for every preset', () => {
    for (const preset of CHARACTER_PRESETS) {
      expect(['short', 'puffy', 'pigtails']).toContain(preset.hairStyle);
    }
  });
});

describe('getCharacterPreset', () => {
  it('finds a preset by id', () => {
    const first = CHARACTER_PRESETS[0];
    expect(getCharacterPreset(first.id)).toEqual(first);
  });

  it('throws for an unknown id', () => {
    expect(() => getCharacterPreset('nope')).toThrow();
  });
});
