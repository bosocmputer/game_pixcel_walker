import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT,
  STARTER_BUDGET,
  STARTER_FULL,
  STARTER_GEAR,
  STARTER_NAKED,
  sanitizeStarter,
  starterCost,
  starterGold,
} from '../index';

describe('starter loadout (character creator)', () => {
  it('going naked keeps the whole budget', () => {
    expect(starterGold(STARTER_NAKED)).toBe(STARTER_BUDGET);
    expect(STARTER_BUDGET).toBe(500);
  });

  it('the full kit leaves 50 Gold — same as the old Standard Start', () => {
    expect(starterGold(STARTER_FULL)).toBe(50);
  });

  it('skipping an item refunds exactly its shop price', () => {
    const noShirt = { ...STARTER_FULL, gear: { ...STARTER_FULL.gear, chest: null } };
    expect(starterGold(noShirt) - starterGold(STARTER_FULL)).toBe(EQUIPMENT.cotton_shirt!.price);
  });

  it('only offers each item in its own slot and rejects anything else', () => {
    const cheat = { gear: { weapon: 'starlight_staff', chest: 'fuel_plate', helmet: 'cotton_shirt' }, potions: false };
    expect(sanitizeStarter(cheat).gear).toEqual({});
    expect(starterCost(cheat)).toBe(0);
    for (const { slot, items } of STARTER_GEAR) for (const id of items) expect(EQUIPMENT[id]?.slot, id).toBe(slot);
  });

  it('never goes below zero Gold', () => {
    for (const { items } of STARTER_GEAR) for (const id of items) expect(starterGold({ gear: { weapon: id }, potions: true })).toBeGreaterThanOrEqual(0);
  });
});
