export const DEATH_GOLD_LOSS = 0.2;
export const MARKET_FEE = 0.05;
export const MERCENARY_OWNER_SHARE = 0.5;
export const HOME_SAFE_ZONE_M = 200;
export const HOME_MOVE_COOLDOWN_DAYS = 30;

/** Gold lost on death: 20% of carried gold only; banked gold is safe (MASTER_SPEC §9). */
export function deathGoldLoss(carriedGold: number): number {
  return Math.floor(Math.max(0, carriedGold) * DEATH_GOLD_LOSS);
}

/**
 * Market Price Index (source PDF §7.2), clamped to 50%–300% of base value.
 * Recomputed hourly from demand (buy requests) and supply (listings).
 */
export function marketPrice(baseValue: number, demand: number, supply: number): number {
  const factor = 1 + (demand - supply) / (supply + 10);
  const clamped = Math.min(3, Math.max(0.5, factor));
  return Math.round(baseValue * clamped);
}

/** Repair cost to restore `fraction` (0..1) of durability. Home Base repairs at half price. */
export function repairCost(itemPrice: number, fraction: number, atHome: boolean): number {
  const cost = itemPrice * 0.1 * Math.min(1, Math.max(0, fraction));
  return Math.ceil(atHome ? cost * 0.5 : cost);
}

/** Hospital: full HP/MP for Gold, cheap early and still worth it late (docs/STORY.md §4). */
export function hospitalCost(level: number): number {
  return 20 + Math.max(1, level) * 6;
}

/** Sanctuaries (places of worship without a gate): a free 50% HP/MP rest, once per hour. */
export const SANCTUARY_HEAL = 0.5;
export const SANCTUARY_COOLDOWN_MS = 60 * 60_000;
