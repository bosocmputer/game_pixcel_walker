/**
 * Player agency in the auto battle (ROADMAP ⚔️ phase 4, MASTER_SPEC §12A):
 *
 * - Awakening: player units fill a gauge by landing and taking hits. When it is full the player may
 *   trigger it; a timing ring grades the press (PERFECT / GOOD / MISS) and the unit's next turn
 *   becomes an unavoidable Awakening Strike. The press is recorded as a `CombatInput`, so a battle
 *   is still fully deterministic from (setup, seed, inputs) and the server can replay it.
 * - Link Attack: when two different allies land hits on the same enemy back-to-back in one round,
 *   the second hit deals LINK_MULT damage. No randomness, no input.
 */
import type { AwakenGrade, SkillDef } from './types';

export const AWAKEN_MAX = 100;
/** Gauge gained per landed hit the unit deals / takes. */
export const AWAKEN_GAIN_DEAL = 10;
export const AWAKEN_GAIN_TAKE = 14;
/** Awakening Strike power: × the unit's best attack stat (ATK or MATK). */
export const AWAKEN_MULT: Record<AwakenGrade, number> = { PERFECT: 3.0, GOOD: 2.4, MISS: 1.8 };
/** Timing windows (ms from the ring's centre) for grading a press. */
export const AWAKEN_WINDOW_MS = { PERFECT: 90, GOOD: 220 } as const;
/** Link Attack: back-to-back hits by two allies on one target in the same round. */
export const LINK_MULT = 1.15;

/** Grades a press by how far (ms) it landed from the ring's perfect moment. */
export function awakenGrade(errorMs: number | null): AwakenGrade {
  if (errorMs === null) return 'MISS';
  const e = Math.abs(errorMs);
  return e <= AWAKEN_WINDOW_MS.PERFECT ? 'PERFECT' : e <= AWAKEN_WINDOW_MS.GOOD ? 'GOOD' : 'MISS';
}

/** The Awakening Strike as a skill definition (not in SKILLS — it can't be learned or rolled). */
export const AWAKEN_SKILL: SkillDef = {
  id: 'awakening_strike',
  name: 'Awakening Strike',
  nameTh: 'ท่าแห่งการตื่นรู้',
  description: 'การโจมตีเต็มกำลังเมื่อเกจตื่นรู้เต็ม — ไม่มีวันพลาด',
  kind: 'ACTIVE',
  element: 'NEUTRAL',
  rate: 0,
  cooldown: 0,
  mp: 0,
  priority: 0,
  target: 'ENEMY_LOWEST_HP',
  effects: [],
  unavoidable: true,
};
