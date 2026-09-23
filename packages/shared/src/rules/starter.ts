/** Character creator starter loadout: pick gear from a fixed Gold budget (MASTER_SPEC §5). */
import { CONSUMABLES, EQUIPMENT, STARTER_BUDGET, STARTER_GEAR, STARTER_POTIONS } from '../data/items';
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
