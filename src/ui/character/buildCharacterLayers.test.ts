import { describe, expect, it } from 'vitest';
import { buildCharacterLayers } from './buildCharacterLayers';
import { CHARACTER_PRESETS } from './presets';
import { bodyIdle } from '../pixel/sprites/body';
import { hairPigtails, hairPuffy, hairShort } from '../pixel/sprites/hair';
import { harnessBasic } from '../pixel/sprites/harness';

const preset = CHARACTER_PRESETS[0];

describe('buildCharacterLayers', () => {
  it('returns body + hair layers without harness by default', () => {
    const layers = buildCharacterLayers(preset, bodyIdle);
    expect(layers).toHaveLength(2);
    expect(layers[0].sprite).toBe(bodyIdle);
    expect(layers[1].palette).toEqual({ hair: preset.palette.hair });
  });

  it('adds a harness layer when requested', () => {
    const layers = buildCharacterLayers(preset, bodyIdle, { harness: true });
    expect(layers).toHaveLength(3);
    expect(layers[2].sprite).toBe(harnessBasic);
  });

  it('applies the body palette to the pose layer', () => {
    const layers = buildCharacterLayers(preset, bodyIdle);
    expect(layers[0].palette).toEqual({
      skin: preset.palette.skin,
      shirt: preset.palette.shirt,
      pants: preset.palette.pants,
      shoes: preset.palette.shoes,
      eyes: preset.palette.eyes,
    });
  });

  it('picks the correct hair sprite for each hair style', () => {
    const short = CHARACTER_PRESETS.find((p) => p.hairStyle === 'short')!;
    const puffy = CHARACTER_PRESETS.find((p) => p.hairStyle === 'puffy')!;
    const pigtails = CHARACTER_PRESETS.find((p) => p.hairStyle === 'pigtails')!;
    expect(buildCharacterLayers(short, bodyIdle)[1].sprite).toBe(hairShort);
    expect(buildCharacterLayers(puffy, bodyIdle)[1].sprite).toBe(hairPuffy);
    expect(buildCharacterLayers(pigtails, bodyIdle)[1].sprite).toBe(hairPigtails);
  });
});
