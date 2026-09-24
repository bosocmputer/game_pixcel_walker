import { CONSUMABLES, EQUIPMENT, MATERIALS } from '../data/items';
import type { Rarity } from '../types';

/** What a shop pays, as a share of the list price. Junk sells at its full value. */
export const SELL_RATE_GEAR = 0.3;
export const SELL_RATE_CONSUMABLE = 0.25;
/** Broken gear (durability 0) sells for half. */
export const SELL_RATE_BROKEN = 0.5;

export type ItemKind = 'gear' | 'use' | 'junk';

export interface ItemInfo {
  id: string;
  kind: ItemKind;
  nameTh: string;
  rarity: Rarity;
  price: number;
  level: number;
  lore: string;
}

/** One view over equipment, consumables and materials (for shops, the bag and loot lists). */
export function itemInfo(id: string): ItemInfo | undefined {
  const e = EQUIPMENT[id];
  if (e) return { id, kind: 'gear', nameTh: e.nameTh, rarity: e.rarity, price: e.price, level: e.level ?? 1, lore: e.lore ?? '' };
  const c = CONSUMABLES[id];
  if (c) return { id, kind: 'use', nameTh: c.nameTh, rarity: 'COMMON', price: c.price, level: 1, lore: c.lore ?? '' };
  const m = MATERIALS[id];
  if (m) return { id, kind: 'junk', nameTh: m.nameTh, rarity: m.rarity, price: m.price, level: 1, lore: m.lore };
  return undefined;
}

export function itemName(id: string): string {
  return itemInfo(id)?.nameTh ?? id;
}

/** Gold a shop pays for one item. `durability` only matters for gear; `junkBonus` = shop multiplier. */
export function sellPrice(id: string, durability?: number, junkBonus = 1): number {
  const info = itemInfo(id);
  if (!info) return 0;
  if (info.kind === 'junk') return Math.round(info.price * junkBonus);
  if (info.kind === 'use') return Math.max(1, Math.floor(info.price * SELL_RATE_CONSUMABLE));
  const broken = durability !== undefined && durability <= 0;
  return Math.floor(info.price * SELL_RATE_GEAR * (broken ? SELL_RATE_BROKEN : 1));
}

/** Whether a character of `level` may wear the item (anything that isn't gear is always fine). */
export function meetsLevel(id: string, level: number): boolean {
  return level >= (EQUIPMENT[id]?.level ?? 1);
}

/** Gold from selling every piece of junk in a bag (`bag` = item id → count). */
export function junkValue(bag: Record<string, number>, junkBonus = 1): number {
  let total = 0;
  for (const [id, n] of Object.entries(bag)) if (MATERIALS[id] && n > 0) total += sellPrice(id, undefined, junkBonus) * n;
  return total;
}
