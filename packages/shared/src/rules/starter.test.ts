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
    expect(starterGold(noShirt) - starterGold(STARTER_FULL)).toBe(EQUIPMENT.leather_garb!.price);
  });

  it('only offers each item in its own slot and rejects anything else', () => {
    const cheat = { gear: { weapon: 'starlight_staff', chest: 'light_armor', helmet: 'leather_garb' }, potions: false };
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
    // The retired starter shirt is replaced in place, so the player is not undressed by an update.
    expect(Object.keys(save.equipment)).toEqual(['chest']);
    expect(save.equipment.chest).toEqual({ itemId: 'leather_garb', durability: EQUIPMENT.leather_garb!.maxDurability });
    expect(save.gearBag.map((g) => g.itemId)).toEqual(['iron_helm', 'runner_charm', 'aegis_pendant']);
    expect(migrateLegacyGear(save)).toBe(0); // idempotent
  });
});

describe('chest slot: two outfits only (2026-09-24)', () => {
  it('has exactly the leather garb (Lv.1) and the light armor (Lv.5)', () => {
    const chest = Object.values(EQUIPMENT).filter((e) => e.slot === 'chest');
    expect(chest.map((e) => e.id).sort()).toEqual(['leather_garb', 'light_armor']);
    expect(EQUIPMENT.leather_garb!.level).toBe(1);
    expect(EQUIPMENT.light_armor!.level).toBe(5);
    // The armor must be the clear upgrade, or there is no reason to save up for it.
    expect(EQUIPMENT.light_armor!.modifiers.flat!.def!).toBeGreaterThan(EQUIPMENT.leather_garb!.modifiers.flat!.def!);
  });

  it('the starter outfit is the one wearable at level 1', () => {
    const starter = STARTER_GEAR.find((g) => g.slot === 'chest')!;
    expect(starter.items).toEqual(['leather_garb']);
    for (const id of starter.items) expect(EQUIPMENT[id]!.level ?? 1).toBe(1);
  });

  it('retired outfits convert to the light armor', () => {
    for (const id of ['cotton_shirt', 'indigo_farmer_shirt', 'rattan_armor', 'fuel_plate']) {
      const legacy = LEGACY_ITEMS[id];
      expect(legacy, id).toBeDefined();
      expect(EQUIPMENT[legacy!.to!]!.slot).toBe('chest');
    }
  });
});
