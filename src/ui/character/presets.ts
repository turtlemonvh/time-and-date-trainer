export type HairStyleId = 'short' | 'puffy' | 'pigtails';

export interface CharacterPreset {
  id: string;
  name: string;
  hairStyle: HairStyleId;
  palette: {
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
    shoes: string;
    eyes: string;
  };
}

const EYES = '#2b2118';

/**
 * Curated look presets, not the per-slot color dropdowns `/debug/sprites`
 * exposes for engineering use — this is what a 7-9 year old actually picks
 * from. `characterId` stores the chosen preset's `id`; the underlying
 * sprite/palette values are looked up fresh each render rather than copied
 * into the save file, so a future palette tweak here updates every
 * existing profile automatically.
 */
export const CHARACTER_PRESETS: readonly CharacterPreset[] = [
  {
    id: 'sunny',
    name: 'Sunny',
    hairStyle: 'short',
    palette: {
      skin: '#f2cba0',
      hair: '#e8c15a',
      shirt: '#f4a259',
      pants: '#4a3728',
      shoes: '#1b1b1b',
      eyes: EYES,
    },
  },
  {
    id: 'juniper',
    name: 'Juniper',
    hairStyle: 'pigtails',
    palette: {
      skin: '#e8b98a',
      hair: '#4a2f1c',
      shirt: '#2a9d8f',
      pants: '#2b2d42',
      shoes: '#e8e8e8',
      eyes: EYES,
    },
  },
  {
    id: 'boulder',
    name: 'Boulder',
    hairStyle: 'puffy',
    palette: {
      skin: '#8d5a3a',
      hair: '#1b1b1b',
      shirt: '#3a86ff',
      pants: '#3d5a80',
      shoes: '#6b4226',
      eyes: EYES,
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    hairStyle: 'short',
    palette: {
      skin: '#c68958',
      hair: '#a35c2e',
      shirt: '#d1495b',
      pants: '#4a3728',
      shoes: '#1b1b1b',
      eyes: EYES,
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    hairStyle: 'pigtails',
    palette: {
      skin: '#f2cba0',
      hair: '#1b1b1b',
      shirt: '#3a86ff',
      pants: '#2b2d42',
      shoes: '#e8e8e8',
      eyes: EYES,
    },
  },
  {
    id: 'clover',
    name: 'Clover',
    hairStyle: 'puffy',
    palette: {
      skin: '#e8b98a',
      hair: '#e8c15a',
      shirt: '#2a9d8f',
      pants: '#3d5a80',
      shoes: '#6b4226',
      eyes: EYES,
    },
  },
];

export function getCharacterPreset(id: string): CharacterPreset {
  const preset = CHARACTER_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`getCharacterPreset: no preset with id "${id}"`);
  return preset;
}
