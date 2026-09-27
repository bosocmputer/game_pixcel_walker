import { describe, expect, it } from 'vitest';
import { CLASSES, DECK_SIZE, assignDeckSlot, classSkillPool, classStarterDeck, clearDeckSlot, type ClassId } from '../index';

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

describe('class starter deck (admin class switch)', () => {
  it('puts the class kit first, fills with Novice skills, and stays inside the class pool', () => {
    for (const id of Object.keys(CLASSES) as ClassId[]) {
      const deck = classStarterDeck(id);
      expect(deck.length).toBeLessThanOrEqual(DECK_SIZE);
      expect(new Set(deck).size).toBe(deck.length);
      for (const s of deck) expect(classSkillPool(id)).toContain(s);
      if (id !== 'NOVICE') expect(deck.slice(0, Math.min(DECK_SIZE, CLASSES[id].skills.length))).toEqual(CLASSES[id].skills.slice(0, DECK_SIZE));
    }
    expect(classStarterDeck('DRAGOON')).toHaveLength(DECK_SIZE); // 3 class skills + 3 Novice fillers
  });
});
