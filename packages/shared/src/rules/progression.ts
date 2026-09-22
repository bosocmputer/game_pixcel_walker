import { STAT_KEYS, type ClassId, type MutationId, type StatKey, type Stats } from '../types';
import { CLASS_CHANGE_LEVEL } from '../data/classes';
import { MUTATIONS, MUTATION_MIN_LEVEL, MUTATION_THRESHOLD } from '../data/mutations';

export const LEVEL_CAP = 50;
export const BASE_STAT = 5;
export const STAT_POINTS_PER_LEVEL = 5;
export const STEPS_PER_STAT_POINT = 5000;
export const MAX_WALK_STAT_POINTS_PER_DAY = 4;
export const NOVICE_WALK_EXP_BONUS = 0.1;

/** EXP required to go from `level` to `level + 1`. */
export function expToNext(level: number): number {
  if (level >= LEVEL_CAP) return Infinity;
  return Math.floor(100 * Math.pow(level, 1.5));
}

export interface LevelState {
  level: number;
  /** EXP accumulated inside the current level. */
  exp: number;
}

export interface GainExpResult extends LevelState {
  levelsGained: number;
  statPointsGained: number;
}

export function gainExp(state: LevelState, amount: number): GainExpResult {
  let { level, exp } = state;
  let levelsGained = 0;
  exp += Math.max(0, Math.floor(amount));
  while (level < LEVEL_CAP && exp >= expToNext(level)) {
    exp -= expToNext(level);
    level += 1;
    levelsGained += 1;
  }
  if (level >= LEVEL_CAP) exp = 0;
  return { level, exp, levelsGained, statPointsGained: levelsGained * STAT_POINTS_PER_LEVEL };
}

/** 1 step = 1 EXP, Novice gets +10% until class change. */
export function walkExp(steps: number, classId: ClassId, level: number): number {
  const bonus = classId === 'NOVICE' && level < CLASS_CHANGE_LEVEL ? 1 + NOVICE_WALK_EXP_BONUS : 1;
  return Math.floor(Math.max(0, steps) * bonus);
}

/**
 * Stat points earned from walking today, given steps before and after a session.
 * Capped at MAX_WALK_STAT_POINTS_PER_DAY per calendar day.
 */
export function walkStatPoints(stepsTodayBefore: number, stepsTodayAfter: number): number {
  const cap = MAX_WALK_STAT_POINTS_PER_DAY;
  const before = Math.min(cap, Math.floor(stepsTodayBefore / STEPS_PER_STAT_POINT));
  const after = Math.min(cap, Math.floor(stepsTodayAfter / STEPS_PER_STAT_POINT));
  return Math.max(0, after - before);
}

export function baseStats(): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, BASE_STAT])) as Stats;
}

/** allocated = points the player spent (excluding base 5). */
export function totalStats(allocated: Stats): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, BASE_STAT + allocated[k]])) as Stats;
}

export function canChangeClass(classId: ClassId, level: number): boolean {
  return classId === 'NOVICE' && level >= CLASS_CHANGE_LEVEL;
}

/**
 * Extreme Mutation check (MASTER_SPEC §7): level >= 20 and one stat holds >= 80% of
 * self-allocated points. Evaluated live, so a respec below the threshold removes it.
 */
export function detectMutation(allocated: Stats, level: number): MutationId | null {
  if (level < MUTATION_MIN_LEVEL) return null;
  const total = STAT_KEYS.reduce((sum, k) => sum + allocated[k], 0);
  if (total <= 0) return null;
  let top: StatKey = 'str';
  for (const k of STAT_KEYS) if (allocated[k] > allocated[top]) top = k;
  if (allocated[top] / total < MUTATION_THRESHOLD) return null;
  const def = Object.values(MUTATIONS).find((m) => m.stat === top);
  return def ? def.id : null;
}

/** Share (0..1) of the top stat; used for UI progress bars toward a mutation. */
export function mutationProgress(allocated: Stats): { stat: StatKey; share: number } {
  const total = STAT_KEYS.reduce((sum, k) => sum + allocated[k], 0);
  let top: StatKey = 'str';
  for (const k of STAT_KEYS) if (allocated[k] > allocated[top]) top = k;
  return { stat: top, share: total > 0 ? allocated[top] / total : 0 };
}
