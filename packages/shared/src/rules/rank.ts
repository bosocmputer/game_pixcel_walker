import { LANDMARK_BOSS, MONSTERS } from '../data/monsters';
import type { LandmarkKind } from '../types';

/**
 * Walker / gate rank (docs/STORY.md §3). Levels stay the real progression; the rank is only a
 * label every 10 levels, so players can compare a gate with themselves at a glance.
 */
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const RANKS: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export const RANK_COLOR: Record<Rank, string> = {
  E: '#9aa4b0',
  D: '#3aa06a',
  C: '#2f86d6',
  B: '#9a4fd0',
  A: '#e0782a',
  S: '#f2c230',
};

export function rankOf(level: number): Rank {
  return RANKS[Math.max(0, Math.min(RANKS.length - 1, Math.floor(level / 10)))]!;
}

/** Rank of the gate at a landmark = rank of its boss's level (null for places without a gate). */
export function gateRank(kind: LandmarkKind): Rank | null {
  const boss = LANDMARK_BOSS[kind];
  const m = boss ? MONSTERS[boss] : undefined;
  return m ? rankOf(m.level) : null;
}
