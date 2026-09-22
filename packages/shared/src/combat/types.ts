/**
 * Party-based auto turn-based combat (Pockie Ninja style) — data model.
 * See docs/COMBAT_SPEC.md for the full design and the per-turn RNG pipeline.
 */
import type { ClassId, DerivedStats, Element, MutationId } from '../types';

export type Side = 'A' | 'B'; // A = players, B = monsters
export type Row = 'FRONT' | 'BACK';

/** Everything a unit needs in combat (derived from character sheet or monster data). */
export interface CombatStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  speed: number;
  /** 0..1+ base chance to hit before target dodge is subtracted */
  hit: number;
  /** 0..1 */
  dodge: number;
  /** 0..1 */
  crit: number;
  /** 0..1 subtracted from attacker crit */
  critResist: number;
  /** damage multiplier on crit (1.5–2.0) */
  critMult: number;
  /** 0..1 chance to block */
  block: number;
  /** share of damage removed on a block (e.g. 0.5) */
  blockReduce: number;
  /** multiplier on healing done */
  healPower: number;
}

export type StatusId = 'STUN' | 'FREEZE' | 'POISON' | 'BURN' | 'BLEED' | 'SLOW' | 'TAUNTING' | 'ROOT';

export interface ActiveStatus {
  id: StatusId;
  /** remaining turns of the affected unit */
  turns: number;
  potency: number;
  sourceId: string;
}

export interface Buff {
  stat: keyof CombatStats;
  pct: number;
  turns: number;
}

/** Target rules for skills (Layer 2). */
export type TargetRule =
  | 'ENEMY' // weighted by row aggro (front 70 / back 30), overridden by Taunt
  | 'ENEMY_LOWEST_HP'
  | 'ENEMY_BACK' // prefers back row (snipers)
  | 'ALL_ENEMIES'
  | 'SELF'
  | 'ALLY_LOWEST_HP'
  | 'ALL_ALLIES';

/** Extra conditions a skill needs to be a candidate for the launch roll. */
export type SkillCondition =
  | 'SELF_HP_BELOW_60'
  | 'SELF_HP_BELOW_40'
  | 'ALLY_HP_BELOW_60'
  | 'ENEMY_COUNT_2PLUS';

export type Effect =
  | {
      kind: 'DAMAGE';
      type: 'PHYSICAL' | 'MAGIC' | 'TRUE';
      /** damage = Σ scaling[stat] × attacker stat */
      scaling: Partial<Record<keyof CombatStats, number>>;
      flat?: number;
      /** strike count (each rolls hit/crit/block separately) */
      hits?: number;
      /** extra targets after the first, each dealing (1 - falloff × n) */
      chain?: { jumps: number; falloff: number };
      forceCrit?: boolean;
    }
  | { kind: 'HEAL'; scaling: Partial<Record<keyof CombatStats, number>>; flat?: number }
  | { kind: 'STATUS'; status: StatusId; turns: number; chance?: number; potency?: number; self?: boolean }
  | { kind: 'BUFF'; stat: keyof CombatStats; pct: number; turns: number; self?: boolean }
  | { kind: 'SHIELD'; pctMaxHp: number; turns: number }
  | { kind: 'CLEANSE' };

/**
 * Reactive triggers (Layer 4, cross-party):
 * COVER        — an ally is the declared single target → take the hit instead (mitigated)
 * ASSIST       — an ally landed a hit → strike the same target out of turn
 * COUNTER      — you were hit → strike back
 * ON_DODGE     — you dodged → effects on self
 * ON_LOW_HP    — your HP fell below 30% → effects on self (once per battle)
 * ON_ALLY_DEATH— an ally died → effects (rage, shields, vengeance)
 */
export type TriggerKind = 'COVER' | 'ASSIST' | 'COUNTER' | 'ON_DODGE' | 'ON_LOW_HP' | 'ON_ALLY_DEATH';

export interface SkillDef {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  kind: 'ACTIVE' | 'REACTIVE';
  element: Element;
  /** Base activation rate in % (Layer 1 launch roll / reactive roll). */
  rate: number;
  /** Cooldown in the owner's turns (0 = none). */
  cooldown: number;
  mp: number;
  /** Higher is rolled first. */
  priority: number;
  target: TargetRule;
  effects: Effect[];
  condition?: SkillCondition;
  trigger?: TriggerKind;
  /** Cannot miss or be blocked (boss ultimates). */
  unavoidable?: boolean;
  /** Reactive triggers that may fire only once per battle. */
  oncePerBattle?: boolean;
  /** Ranged skills ignore melee restrictions (Pure DEX). */
  ranged?: boolean;
}

export interface CombatUnit {
  id: string;
  name: string;
  side: Side;
  row: Row;
  sprite: string;
  level: number;
  element: Element;
  isBoss: boolean;
  classId: ClassId | null;
  mutation: MutationId | null;
  monsterId: string | null;
  base: CombatStats;
  hp: number;
  mp: number;
  shield: { amount: number; turns: number } | null;
  /** Skill Deck (max DECK_SIZE ids). The basic attack is the implicit fallback. */
  deck: string[];
  cooldowns: Record<string, number>;
  statuses: ActiveStatus[];
  buffs: Buff[];
  /** Launch-rate bonus in % per element ('ALL' applies to every skill). */
  rateBonus: Partial<Record<Element | 'ALL', number>>;
  /** Tie-break for equal speed, rolled at battle start. */
  initiative: number;
  turnsTaken: number;
  usedOnce: string[];
  flags: { miracleUsed: boolean; ultimateBlocked: boolean; phase: number; enraged: boolean };
  /** Party-side consumables this unit may auto-use (players only). */
  autoPotion: boolean;
  /** Never acts (training dummies). */
  passive: boolean;
}

export interface UnitSetup {
  id: string;
  name: string;
  row: Row;
  sprite: string;
  level: number;
  element?: Element;
  classId?: ClassId | null;
  mutation?: MutationId | null;
  monsterId?: string | null;
  isBoss?: boolean;
  stats: CombatStats;
  hp?: number;
  mp?: number;
  deck: string[];
  rateBonus?: Partial<Record<Element | 'ALL', number>>;
  autoPotion?: boolean;
  passive?: boolean;
  /** Carried over between dungeon waves. */
  cooldowns?: Record<string, number>;
  statuses?: ActiveStatus[];
}

/** Environmental modifier rolled per dungeon floor / wave. */
export interface WaveModifier {
  id: string;
  nameTh: string;
  rateBonus?: Partial<Record<Element | 'ALL', number>>;
  healMult?: number;
  enemyStatMult?: Partial<Record<keyof CombatStats, number>>;
  /** % max HP damage to everyone at the start of each round */
  roundDotPct?: number;
}

export interface CombatConfig {
  partyA: UnitSetup[];
  partyB: UnitSetup[];
  seed: number;
  items?: Record<string, number>;
  modifier?: WaveModifier | null;
  /** Safety cap; the battle is a loss for side A after this many rounds. */
  maxRounds?: number;
  canFlee?: boolean;
}

export type CombatResult = 'ONGOING' | 'WIN' | 'LOSE';

export type CombatEvent =
  | { type: 'ROUND'; round: number }
  | { type: 'TURN'; unit: string }
  | { type: 'SKIP'; unit: string; reason: StatusId }
  | { type: 'SKILL'; unit: string; skill: string; targets: string[]; reactive?: TriggerKind; mp?: number }
  | { type: 'MISS'; source: string; target: string }
  | { type: 'DAMAGE'; source: string; target: string; amount: number; crit: boolean; block: boolean; element: Element }
  | { type: 'HEAL'; source: string; target: string; amount: number }
  | { type: 'STATUS'; target: string; status: StatusId; turns: number }
  | { type: 'TICK'; target: string; status: StatusId; amount: number }
  | { type: 'SHIELD'; target: string; amount: number }
  | { type: 'BUFF'; target: string; stat: keyof CombatStats; pct: number }
  | { type: 'COVER'; unit: string; protected: string }
  | { type: 'SUMMON'; unit: string; by: string }
  | { type: 'WAVE'; wave: number; total: number; modifier: string | null }
  | { type: 'RECOVER'; unit: string; amount: number }
  | { type: 'ITEM'; unit: string; item: string; amount: number }
  | { type: 'DEATH'; unit: string }
  | { type: 'MIRACLE'; unit: string }
  | { type: 'BLOCK_ULT'; unit: string; skill: string }
  | { type: 'PHASE'; unit: string; phase: number; message: string }
  | { type: 'ENRAGE'; unit: string }
  | { type: 'ENV'; modifier: string; amount: number }
  | { type: 'END'; result: CombatResult };

export const DECK_SIZE = 6;

/** Adapter from the character sheet to combat stats. */
export function statsFromDerived(d: DerivedStats, extra: { dex: number; luk: number; vit: number; shield?: boolean }): CombatStats {
  return {
    maxHp: d.maxHp,
    maxMp: d.maxMp,
    atk: d.atk,
    matk: d.matk,
    def: d.def,
    mdef: d.mdef,
    speed: d.speed,
    hit: 0.92 + extra.dex * 0.003,
    dodge: d.evasion,
    crit: d.crit,
    critResist: Math.min(0.3, extra.luk * 0.002),
    critMult: 1.6,
    block: Math.min(0.45, extra.vit * 0.0015 + (extra.shield ? 0.15 : 0)),
    blockReduce: 0.5,
    healPower: d.healPower,
  };
}
