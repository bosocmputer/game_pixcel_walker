import { describe, expect, it } from 'vitest';
import { DECK_SIZE, assignDeckSlot, clearDeckSlot } from '../index';

describe('skill deck slots', () => {
  const deck = ['power_smash', 'stone_throw', 'counter_jab'];

  it('replaces the skill in a filled slot', () => {
    expect(assignDeckSlot(deck, 1, 'focus')).toEqual(['power_smash', 'focus', 'counter_jab']);
  });

  it('swaps when the skill is already in the deck', () => {
    expect(assignDeckSlot(deck, 0, 'counter_jab')).toEqual(['counter_jab', 'stone_throw', 'power_smash']);
  });

  it('appends into an empty slot, up to the deck size', () => {
    expect(assignDeckSlot(deck, 5, 'focus')).toEqual([...deck, 'focus']);
    const full = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(full.length).toBe(DECK_SIZE);
    expect(assignDeckSlot(full, 6, 'g')).toEqual(full);
  });

  it('never duplicates a skill', () => {
    expect(assignDeckSlot(deck, 4, 'stone_throw')).toEqual(deck);
  });

  it('clears a slot and closes the gap', () => {
    expect(clearDeckSlot(deck, 0)).toEqual(['stone_throw', 'counter_jab']);
  });
});
