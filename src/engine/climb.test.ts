import { describe, expect, it } from 'vitest';
import { applyCorrect, applyMiss, createClimb } from './climb';
import { getPeak } from './peaks';

const peak1 = getPeak(1); // height 20

describe('createClimb', () => {
  it('starts at position 0, no boost, no fall risk, climbing', () => {
    const state = createClimb(peak1, 5);
    expect(state.position).toBe(0);
    expect(state.boost).toBe(0);
    expect(state.fallRisk).toBe(0);
    expect(state.status).toBe('climbing');
    expect(state.height).toBe(20);
    expect(state.boostCapacity).toBe(5);
  });

  it('sets fall-risk capacity to 5 for difficulty 1-3', () => {
    expect(createClimb(peak1, 1).fallRiskCapacity).toBe(5);
    expect(createClimb(peak1, 3).fallRiskCapacity).toBe(5);
  });

  it('sets fall-risk capacity to 4 for difficulty 4-7', () => {
    expect(createClimb(peak1, 4).fallRiskCapacity).toBe(4);
    expect(createClimb(peak1, 7).fallRiskCapacity).toBe(4);
  });

  it('sets fall-risk capacity to 3 for difficulty 8-10', () => {
    expect(createClimb(peak1, 8).fallRiskCapacity).toBe(3);
    expect(createClimb(peak1, 10).fallRiskCapacity).toBe(3);
  });
});

describe('applyCorrect', () => {
  it('advances by 1 step when not boosted', () => {
    const state = applyCorrect(createClimb(peak1, 5), false);
    expect(state.position).toBe(1);
  });

  it('increments boost by 1 on a normal-speed correct answer', () => {
    const state = applyCorrect(createClimb(peak1, 5), false);
    expect(state.boost).toBe(1);
  });

  it('increments boost by 2 on a fast correct answer', () => {
    const state = applyCorrect(createClimb(peak1, 5), true);
    expect(state.boost).toBe(2);
  });

  it('clamps boost at capacity and does not overflow', () => {
    let state = createClimb(peak1, 5);
    for (let i = 0; i < 5; i++) state = applyCorrect(state, true); // +2 each, would overflow to 10
    expect(state.boost).toBe(5);
  });

  it('doubles step gain once boost reaches capacity', () => {
    let state = createClimb(peak1, 5);
    // Fill boost to capacity (5) with fast answers: +2,+2,+2,+2,+2 -> clamps at 5 on the 3rd
    state = applyCorrect(state, true); // boost 2, pos 1
    state = applyCorrect(state, true); // boost 4, pos 2
    state = applyCorrect(state, true); // boost capped at 5, pos 3 (still normal speed this answer, since boost was 4 before it)
    expect(state.boost).toBe(5);
    const beforeBoostedStep = state.position;
    state = applyCorrect(state, false); // boost was already at capacity -> this step is worth 2
    expect(state.position).toBe(beforeBoostedStep + 2);
  });

  it('reaches summited exactly at height and clamps position there', () => {
    let state = createClimb(peak1, 5); // height 20
    for (let i = 0; i < 20; i++) state = applyCorrect(state, false);
    expect(state.status).toBe('summited');
    expect(state.position).toBe(20);
    const beforeExtra = state;
    state = applyCorrect(state, false);
    expect(state).toEqual(beforeExtra); // no-op once summited
  });
});

describe('applyMiss', () => {
  it('decrements position by 1, floored at 0', () => {
    let state = createClimb(peak1, 5);
    state = applyCorrect(state, false); // position 1
    state = applyMiss(state);
    expect(state.position).toBe(0);
    state = applyMiss(state);
    expect(state.position).toBe(0); // floored, not negative
  });

  it('resets boost to 0 immediately, even if it was at capacity', () => {
    let state = createClimb(peak1, 5);
    for (let i = 0; i < 5; i++) state = applyCorrect(state, true);
    expect(state.boost).toBe(5);
    state = applyMiss(state);
    expect(state.boost).toBe(0);
  });

  it('increments fall risk on each miss up to capacity', () => {
    let state = createClimb(peak1, 1); // fallRiskCapacity 5
    for (let i = 0; i < 5; i++) {
      state = applyMiss(state);
      expect(state.status).toBe('climbing');
    }
    expect(state.fallRisk).toBe(5);
  });

  it('falls on the miss after fall risk reaches capacity (capacity + 1 total misses)', () => {
    let state = createClimb(peak1, 1); // fallRiskCapacity 5, so 6 misses fall
    for (let i = 0; i < 5; i++) state = applyMiss(state);
    expect(state.status).toBe('climbing');
    state = applyMiss(state); // 6th miss
    expect(state.status).toBe('fell');
  });

  it('allows exactly 4 misses at difficulty 4-7 before falling on the 5th', () => {
    let state = createClimb(peak1, 5); // fallRiskCapacity 4
    for (let i = 0; i < 4; i++) state = applyMiss(state);
    expect(state.status).toBe('climbing');
    state = applyMiss(state);
    expect(state.status).toBe('fell');
  });

  it('allows exactly 3 misses at difficulty 8-10 before falling on the 4th', () => {
    let state = createClimb(peak1, 8); // fallRiskCapacity 3
    for (let i = 0; i < 3; i++) state = applyMiss(state);
    expect(state.status).toBe('climbing');
    state = applyMiss(state);
    expect(state.status).toBe('fell');
  });

  it('is a no-op once fallen', () => {
    let state = createClimb(peak1, 1);
    for (let i = 0; i < 6; i++) state = applyMiss(state);
    expect(state.status).toBe('fell');
    const fallen = state;
    state = applyMiss(state);
    expect(state).toEqual(fallen);
    state = applyCorrect(state, true);
    expect(state).toEqual(fallen);
  });
});
