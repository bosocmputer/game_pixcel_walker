import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT,
  EQUIP_SLOTS,
  LEGACY_ITEMS,
  migrateLegacyGear,
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

describe('four equipment slots', () => {
  it('every item fits one of outfit / head / accessory / weapon', () => {
    expect(EQUIP_SLOTS).toEqual(['chest', 'helmet', 'accessory', 'weapon']);
    for (const def of Object.values(EQUIPMENT)) expect(EQUIP_SLOTS, def.id).toContain(def.slot);
  });

  it('the creator offers a starter pick for every slot', () => {
    expect(STARTER_GEAR.map((g) => g.slot).sort()).toEqual([...EQUIP_SLOTS].sort());
  });

  it('legacy items map to real items or a refund', () => {
    for (const [id, l] of Object.entries(LEGACY_ITEMS)) {
      expect(EQUIPMENT[id], id).toBeUndefined();
      if (l.to) expect(EQUIPMENT[l.to], l.to).toBeDefined();
      else expect(l.refund).toBeGreaterThan(0);
    }
  });

  it('migrates an old save: removed slots emptied, gear converted, sandals refunded', () => {
    const save = {
      equipment: {
        chest: { itemId: 'cotton_shirt', durability: 10 },
        boots: { itemId: 'runner_sneakers', durability: 3 },
        offhand: { itemId: 'aegis_shield', durability: 5 },
      } as Record<string, { itemId: string; durability: number } | undefined>,
      gearBag: [{ itemId: 'straw_sandals', durability: 1 }, { itemId: 'iron_helm', durability: 7 }],
    };
    const refund = migrateLegacyGear(save);
    expect(refund).toBe(50);
    expect(Object.keys(save.equipment)).toEqual(['chest']);
    expect(save.gearBag.map((g) => g.itemId)).toEqual(['iron_helm', 'runner_charm', 'aegis_pendant']);
    expect(migrateLegacyGear(save)).toBe(0); // idempotent
  });
});
