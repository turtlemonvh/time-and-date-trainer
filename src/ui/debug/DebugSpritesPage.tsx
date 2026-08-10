import { useState } from 'react';
import PixelLayers, { type Layer } from '../pixel/PixelLayers';
import { bodyBase } from '../pixel/sprites/body';
import { hairShort } from '../pixel/sprites/hair';
import { helmetClassic } from '../pixel/sprites/helmet';
import { harnessBasic } from '../pixel/sprites/harness';

const SKIN_TONES = ['#e8b98a', '#c68958', '#8d5a3a', '#f2cba0'];
const HAIR_COLORS = ['#4a2f1c', '#1b1b1b', '#a35c2e', '#e8c15a'];
const SHIRT_COLORS = ['#d1495b', '#3a86ff', '#2a9d8f', '#f4a259'];
const PANTS_COLORS = ['#2b2d42', '#4a3728', '#3d5a80'];
const SHOE_COLORS = ['#1b1b1b', '#6b4226', '#e8e8e8'];
const HELMET_COLORS = ['#e63946', '#ffb703', '#3a86ff', '#2b2d42'];

const SCALES = [4, 8, 12];

/**
 * Dev-only gallery for the layered character system: a base body plus
 * swappable headgear (hair or helmet) and an optional harness overlay,
 * each independently colorable. Grows as more hair styles / gear are
 * added — the point is to eyeball real combinations, not enumerate every
 * possible one.
 */
export default function DebugSpritesPage() {
  const [headgear, setHeadgear] = useState<'hair' | 'helmet'>('hair');
  const [showHarness, setShowHarness] = useState(true);
  const [skinIndex, setSkinIndex] = useState(0);
  const [hairIndex, setHairIndex] = useState(0);
  const [shirtIndex, setShirtIndex] = useState(0);
  const [pantsIndex, setPantsIndex] = useState(0);
  const [shoesIndex, setShoesIndex] = useState(0);
  const [helmetIndex, setHelmetIndex] = useState(0);

  const bodyPalette = {
    skin: SKIN_TONES[skinIndex],
    shirt: SHIRT_COLORS[shirtIndex],
    pants: PANTS_COLORS[pantsIndex],
    shoes: SHOE_COLORS[shoesIndex],
    eyes: '#2b2118',
  };

  const layers: Layer[] = [
    { sprite: bodyBase, palette: bodyPalette },
    headgear === 'hair'
      ? { sprite: hairShort, palette: { hair: HAIR_COLORS[hairIndex] } }
      : { sprite: helmetClassic, palette: { helmet: HELMET_COLORS[helmetIndex] } },
    ...(showHarness ? [{ sprite: harnessBasic, palette: { harness: '#ffcc00' } }] : []),
  ];

  function colorSelect(
    label: string,
    testId: string,
    colors: string[],
    index: number,
    onChange: (index: number) => void,
  ) {
    return (
      <p>
        <label htmlFor={testId}>{label}</label>{' '}
        <select
          id={testId}
          data-testid={testId}
          value={index}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {colors.map((color, i) => (
            <option key={color} value={i}>
              {color}
            </option>
          ))}
        </select>
      </p>
    );
  }

  return (
    <main>
      <h1>Debug: sprites</h1>
      <p>Dev-only. Layered, customizable character: body + headgear + harness.</p>

      <p>
        <label htmlFor="headgear-select">Headgear</label>{' '}
        <select
          id="headgear-select"
          data-testid="headgear-select"
          value={headgear}
          onChange={(event) => setHeadgear(event.target.value as 'hair' | 'helmet')}
        >
          <option value="hair">Hair</option>
          <option value="helmet">Helmet</option>
        </select>
      </p>
      <p>
        <label htmlFor="harness-toggle">
          <input
            id="harness-toggle"
            data-testid="harness-toggle"
            type="checkbox"
            checked={showHarness}
            onChange={(event) => setShowHarness(event.target.checked)}
          />{' '}
          Harness
        </label>
      </p>

      {colorSelect('Skin', 'skin-select', SKIN_TONES, skinIndex, setSkinIndex)}
      {headgear === 'hair'
        ? colorSelect('Hair color', 'hair-select', HAIR_COLORS, hairIndex, setHairIndex)
        : colorSelect('Helmet color', 'helmet-select', HELMET_COLORS, helmetIndex, setHelmetIndex)}
      {colorSelect('Shirt', 'shirt-select', SHIRT_COLORS, shirtIndex, setShirtIndex)}
      {colorSelect('Pants', 'pants-select', PANTS_COLORS, pantsIndex, setPantsIndex)}
      {colorSelect('Shoes', 'shoes-select', SHOE_COLORS, shoesIndex, setShoesIndex)}

      <div
        data-testid="character-preview"
        style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end' }}
      >
        {SCALES.map((scale) => (
          <div key={scale}>
            <PixelLayers layers={layers} scale={scale} />
            <p>{scale}x</p>
          </div>
        ))}
      </div>
    </main>
  );
}
