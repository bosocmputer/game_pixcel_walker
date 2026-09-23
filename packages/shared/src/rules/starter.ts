/** Character creator starter loadout: pick gear from a fixed Gold budget (MASTER_SPEC §5). */
import { CONSUMABLES, EQUIPMENT, LEGACY_ITEMS, STARTER_BUDGET, STARTER_GEAR, STARTER_POTIONS } from '../data/items';
import { EQUIP_SLOTS } from '../types';
import type { EquipSlot } from '../types';

export interface StarterLoadout {
  /** Item id per slot; missing / null = go without. */
  gear: Partial<Record<EquipSlot, string | null>>;
  potions: boolean;
}

export const STARTER_NAKED: StarterLoadout = { gear: {}, potions: false };
export const STARTER_FULL: StarterLoadout = {
  gear: Object.fromEntries(STARTER_GEAR.map((g) => [g.slot, g.items[0]!])),
  potions: true,
};

export function starterPotionCost(): number {
  return (CONSUMABLES[STARTER_POTIONS.itemId]?.price ?? 0) * STARTER_POTIONS.count;
}

/** Only items offered for their slot are allowed; anything else is dropped. */
export function sanitizeStarter(l: StarterLoadout): StarterLoadout {
  const gear: StarterLoadout['gear'] = {};
  for (const { slot, items } of STARTER_GEAR) {
    const pick = l.gear[slot];
    if (pick && items.includes(pick)) gear[slot] = pick;
  }
  return { gear, potions: !!l.potions };
}

export function starterCost(l: StarterLoadout): number {
  const s = sanitizeStarter(l);
  let cost = s.potions ? starterPotionCost() : 0;
  for (const id of Object.values(s.gear)) if (id) cost += EQUIPMENT[id]?.price ?? 0;
  return cost;
}

/** Gold the new character starts with after paying for the chosen loadout. */
export function starterGold(l: StarterLoadout): number {
  return Math.max(0, STARTER_BUDGET - starterCost(l));
}

/**
 * Old saves may hold gear for slots that no longer exist (boots, offhand). Equipped legacy items
 * are unequipped; items with a replacement move to the gear bag as the new item, the rest are
 * dropped. Returns the Gold to refund. Mutates `save`.
 */
export function migrateLegacyGear(save: {
  equipment: Record<string, { itemId: string; durability: number } | undefined>;
  gearBag: { itemId: string; durability: number }[];
}): number {
  let refund = 0;
  const convert = (it: { itemId: string; durability: number }) => {
    const legacy = LEGACY_ITEMS[it.itemId];
    if (!legacy) return EQUIPMENT[it.itemId] ? it : null;
    refund += legacy.refund;
    const to = legacy.to ? EQUIPMENT[legacy.to] : undefined;
    return to ? { itemId: to.id, durability: to.maxDurability } : null;
  };
  const moved: { itemId: string; durability: number }[] = [];
  for (const [slot, it] of Object.entries(save.equipment)) {
    if (!it) continue;
    const valid = (EQUIP_SLOTS as string[]).includes(slot) && EQUIPMENT[it.itemId]?.slot === slot;
    if (valid) continue;
    delete save.equipment[slot];
    const c = convert(it);
    if (c) moved.push(c);
  }
  save.gearBag = [...save.gearBag.map(convert).filter((x): x is { itemId: string; durability: number } => !!x), ...moved];
  return refund;
}
