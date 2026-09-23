import { describe, expect, it } from 'vitest';
import { DECK_SIZE, assignDeckSlot, clearDeckSlot } from '../index';

describe('skill deck slots', () => {
  const deck = ['quick_strike', 'first_aid', 'lucky_dodge'];

  it('replaces the skill in a filled slot', () => {
    expect(assignDeckSlot(deck, 1, 'focus')).toEqual(['quick_strike', 'focus', 'lucky_dodge']);
  });

  it('swaps when the skill is already in the deck', () => {
    expect(assignDeckSlot(deck, 0, 'lucky_dodge')).toEqual(['lucky_dodge', 'first_aid', 'quick_strike']);
  });

  it('appends into an empty slot, up to the deck size', () => {
    expect(assignDeckSlot(deck, 5, 'focus')).toEqual([...deck, 'focus']);
    const full = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(full.length).toBe(DECK_SIZE);
    expect(assignDeckSlot(full, 6, 'g')).toEqual(full);
  });

  it('never duplicates a skill', () => {
    expect(assignDeckSlot(deck, 4, 'first_aid')).toEqual(deck);
  });

  it('clears a slot and closes the gap', () => {
    expect(clearDeckSlot(deck, 0)).toEqual(['first_aid', 'lucky_dodge']);
  });
});
