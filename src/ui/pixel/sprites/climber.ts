import type { Palette, Sprite } from '../types';

/**
 * A standing climber, arms at sides. 14x16, hand-authored. `slots` names
 * are shared across every character/pose so palettes stay interchangeable:
 * `hair`, `skin`, `jacket`, `pants`, `boots`.
 */
export const climberIdle: Sprite = {
  w: 14,
  h: 16,
  grid: [
    '.....HHHH.....',
    '....HHHHHH....',
    '....HKKKKH....',
    '....KKKKKK....',
    '....KKKKKK....',
    '....KKKKKK....',
    '...JJJJJJJJ...',
    '..JJJJJJJJJJ..',
    '..JJJJJJJJJJ..',
    '..JJJJJJJJJJ..',
    '..JJJJJJJJJJ..',
    '...JJJJJJJJ...',
    '....PP..PP....',
    '....PP..PP....',
    '....PP..PP....',
    '....BB..BB....',
  ],
  slots: { H: 'hair', K: 'skin', J: 'jacket', P: 'pants', B: 'boots' },
};

export const climberPalettes: readonly Palette[] = [
  { hair: '#4a2f1c', skin: '#e8b98a', jacket: '#d1495b', pants: '#2b2d42', boots: '#1b1b1b' },
  { hair: '#1b1b1b', skin: '#c68958', jacket: '#3a86ff', pants: '#2b2d42', boots: '#1b1b1b' },
];
