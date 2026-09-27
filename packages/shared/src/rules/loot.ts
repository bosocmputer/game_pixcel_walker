import { MATERIALS } from '../data/items';
import { MONSTERS, type Terrain } from '../data/monsters';
import { EXP_RATE } from './progression';
import { chance, pick, randInt, type Rng } from './rng';

export interface Loot {
  exp: number;
  gold: number;
  items: Record<string, number>;
}

/**
 * Rolls rewards for a defeated monster. dropRate multiplies item chances (capped at 100%).
 * poach (Thief trait): chance of one extra piece of the monster's material. No roll when 0,
 * so other classes keep the same RNG sequence.
 */
export function rollLoot(monsterId: string, rng: Rng, dropRate = 1, poach = 0): Loot {
  const m = MONSTERS[monsterId];
  if (!m) throw new Error(`Unknown monster ${monsterId}`);
  const items: Record<string, number> = {};
  for (const d of m.drops) {
    // Guaranteed drops are not boosted; rare drops scale with dropRate.
    const p = d.chance >= 1 ? 1 : Math.min(1, d.chance * dropRate);
    if (chance(rng, p)) {
      const qty = d.qty ? randInt(rng, d.qty[0], d.qty[1]) : 1;
      items[d.itemId] = (items[d.itemId] ?? 0) + qty;
    }
  }
  const junk = m.drops.find((d) => MATERIALS[d.itemId]);
  if (poach > 0 && junk && chance(rng, poach)) items[junk.itemId] = (items[junk.itemId] ?? 0) + 1;
  return { exp: Math.round(m.exp * EXP_RATE), gold: randInt(rng, m.gold[0], m.gold[1]), items };
}

/**
 * World boss reward share: every contributor gets the base loot roll, and EXP/Gold are
 * split by damage share with a 20% floor so small contributors still feel rewarded.
 */
export function worldBossShare(damageDone: number, totalDamage: number): number {
  if (totalDamage <= 0) return 0;
  return Math.max(0.2, Math.min(1, damageDone / totalDamage));
}

/** Encounter chance per 100 counted steps. */
export const ENCOUNTER_PER_100_STEPS = 0.12;

/** Picks a field monster suited to the terrain and player level (±4 levels, never above +3). */
export function pickEncounter(rng: Rng, terrain: Terrain, playerLevel: number): string {
  const pool = Object.values(MONSTERS).filter(
    (m) =>
      !m.boss &&
      m.terrain?.includes(terrain) &&
      m.level <= playerLevel + 3 &&
      m.level >= playerLevel - 8,
  );
  if (pool.length === 0) return 'pixel_slime';
  return pick(rng, pool).id;
}
