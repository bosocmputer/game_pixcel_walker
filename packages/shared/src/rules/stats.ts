import type { ClassId, DerivedStats, Modifiers, MutationId, Stats } from '../types';
import { STAT_KEYS } from '../types';
import { CLASSES } from '../data/classes';

export const CRIT_CAP = 0.75;
export const EVASION_CAP = 0.6;

/** Raw derived stats from total (base + allocated + gear) primary stats. */
export function baseDerived(stats: Stats, level: number): DerivedStats {
  return {
    maxHp: 100 + stats.vit * 15 + level * 12,
    maxMp: 50 + stats.int * 8 + level * 5,
    atk: stats.str * 3 + stats.dex + level * 2,
    matk: stats.int * 2.5,
    def: stats.vit * 1.5,
    mdef: stats.int * 0.5 + stats.vit * 0.5,
    crit: 0.05 + stats.luk * 0.003 + stats.dex * 0.001,
    evasion: stats.agi * 0.004,
    speed: 20 + stats.agi * 0.3,
    moveSpeed: 1,
    healPower: 1,
    dropRate: 1 + stats.luk * 0.005,
    carryWeight: 50 + stats.str * 3,
  };
}

function applyModifiers(stats: Stats, mods: Modifiers[]): { stats: Stats; flat: Partial<DerivedStats>; pct: Partial<Record<keyof DerivedStats, number>> } {
  const s = { ...stats };
  const flat: Partial<DerivedStats> = {};
  const pct: Partial<Record<keyof DerivedStats, number>> = {};
  for (const m of mods) {
    for (const [k, v] of Object.entries(m.flat ?? {})) {
      if ((STAT_KEYS as readonly string[]).includes(k)) s[k as keyof Stats] += v as number;
      else flat[k as keyof DerivedStats] = (flat[k as keyof DerivedStats] ?? 0) + (v as number);
    }
    for (const [k, v] of Object.entries(m.pct ?? {})) {
      pct[k as keyof DerivedStats] = (pct[k as keyof DerivedStats] ?? 0) + (v as number);
    }
  }
  return { stats: s, flat, pct };
}

export interface CharacterSheetInput {
  level: number;
  classId: ClassId;
  mutation: MutationId | null;
  /** base + allocated primary stats */
  stats: Stats;
  /** Modifiers from equipped items whose durability > 0. */
  gear: Modifiers[];
}

/**
 * Final character stats. Order: primary stats (+gear) → base derived → flat → pct
 * → mutation overrides → caps. Mutation replaces the class passive (MASTER_SPEC §7).
 */
export function computeDerived(input: CharacterSheetInput): DerivedStats {
  const passive = input.mutation ? [] : [CLASSES[input.classId].passive.modifiers];
  const { stats, flat, pct } = applyModifiers(input.stats, [...input.gear, ...passive]);
  const d = baseDerived(stats, input.level);
  // Rangers draw power from DEX instead of STR (MASTER_SPEC §6).
  if (input.classId === 'RANGER') d.atk += stats.dex * 2;

  for (const [k, v] of Object.entries(flat)) d[k as keyof DerivedStats] += v as number;
  for (const [k, v] of Object.entries(pct)) d[k as keyof DerivedStats] *= 1 + (v as number);

  let evasionCap = EVASION_CAP;
  switch (input.mutation) {
    case 'PURE_TANK':
      d.atk = 1;
      break;
    case 'PURE_SPEED':
      d.maxHp *= 0.2;
      d.speed *= 2;
      d.evasion = 0.85;
      evasionCap = 0.85;
      break;
    case 'PURE_MAGE':
      d.def = 0;
      d.evasion = 0;
      break;
    case 'PURE_STRENGTH':
      d.speed *= 0.5;
      d.carryWeight += 1000;
      break;
    case 'PURE_LUCK':
      d.dropRate *= 5;
      break;
    default:
      break;
  }

  d.crit = Math.min(CRIT_CAP, d.crit);
  d.evasion = Math.min(evasionCap, d.evasion);
  d.maxHp = Math.max(1, Math.round(d.maxHp));
  d.maxMp = Math.round(d.maxMp);
  d.atk = Math.max(1, Math.round(d.atk));
  d.matk = Math.round(d.matk);
  d.def = Math.round(d.def);
  d.mdef = Math.round(d.mdef);
  return d;
}

/** Percentage mitigation that scales across all levels. Minimum 1. */
export function mitigate(raw: number, defense: number): number {
  return Math.max(1, Math.round((raw * 100) / (100 + Math.max(0, defense))));
}
