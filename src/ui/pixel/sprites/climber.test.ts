import { describe, expect, it } from 'vitest';
import { validateSprite } from '../sprite';
import { climberIdle, climberPalettes } from './climber';

describe('climberIdle', () => {
  it('is well-formed', () => {
    expect(() => validateSprite(climberIdle)).not.toThrow();
  });

  it('every palette covers every slot the sprite uses', () => {
    const usedSlots = new Set(Object.values(climberIdle.slots));
    for (const palette of climberPalettes) {
      for (const slot of usedSlots) {
        expect(palette[slot]).toBeTruthy();
      }
    }
  });
});
