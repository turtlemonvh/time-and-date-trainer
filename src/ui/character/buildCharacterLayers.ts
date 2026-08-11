import { harnessBasic } from '../pixel/sprites/harness';
import { hairPigtails, hairPuffy, hairShort } from '../pixel/sprites/hair';
import type { Layer } from '../pixel/PixelLayers';
import type { Sprite } from '../pixel/types';
import type { CharacterPreset, HairStyleId } from './presets';

const HAIR_SPRITES: Record<HairStyleId, Sprite> = {
  short: hairShort,
  puffy: hairPuffy,
  pigtails: hairPigtails,
};

const HARNESS_COLOR = '#ffcc00';

/**
 * Composites a preset + body pose into the `Layer[]` `PixelLayers` expects
 * — the same body/hair/harness layering `DebugSpritesPage` demonstrates,
 * shared here so `CharacterPick`, `ProfileChip` previews, `Map`, `Climb`,
 * `Summit`, and `Fell` don't each reimplement it.
 */
export function buildCharacterLayers(
  preset: CharacterPreset,
  pose: Sprite,
  options: { harness?: boolean } = {},
): Layer[] {
  const bodyPalette = {
    skin: preset.palette.skin,
    shirt: preset.palette.shirt,
    pants: preset.palette.pants,
    shoes: preset.palette.shoes,
    eyes: preset.palette.eyes,
  };
  const layers: Layer[] = [
    { sprite: pose, palette: bodyPalette },
    { sprite: HAIR_SPRITES[preset.hairStyle], palette: { hair: preset.palette.hair } },
  ];
  if (options.harness) {
    layers.push({ sprite: harnessBasic, palette: { harness: HARNESS_COLOR } });
  }
  return layers;
}
