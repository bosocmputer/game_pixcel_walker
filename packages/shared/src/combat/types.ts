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
  /** Primary VIT (players; drives the Knight's Iron Blood regen). */
  vit?: number;
  /** Primary LUK (players; drives the Samurai's Shirahadori). */
  luk?: number;
}

/**
 * STOP: time stands still (hard CC, Time Mage). HASTE: the unit acts twice per round while it lasts.
 * HIDDEN: foes cannot target the unit until its own turn ends (Ninja · Vanish).
 */
export type StatusId = 'STUN' | 'FREEZE' | 'POISON' | 'BURN' | 'BLEED' | 'SLOW' | 'TAUNTING' | 'ROOT' | 'REGEN' | 'STOP' | 'HASTE' | 'HIDDEN';

/** Statuses that help their bearer: CLEANSE keeps them. */
export const GOOD_STATUSES: StatusId[] = ['TAUNTING', 'REGEN', 'HASTE', 'HIDDEN'];

/** How well the player timed an Awakening press (combat/awaken.ts). */
export type AwakenGrade = 'PERFECT' | 'GOOD' | 'MISS';

/**
 * A player decision fed into the deterministic engine. `turn` = the unit's turnsTaken when the
 * press was made; it applies on the unit's first turn at or after that (a stunned unit waits).
 */
export interface CombatInput {
  unit: string;
  turn: number;
  kind: 'AWAKEN';
  grade: AwakenGrade;
}

export interface ActiveStatus {
  id: StatusId;
  /** remaining turns of the affected unit */
  turns: number;
  potency: number;
  sourceId: string;
}

export interface Buff {
  stat: keyof CombatStats;
  /** Additive modifier applied after percentage modifiers (e.g. Focus: ATK +1). */
  flat?: number;
  /** Percentage modifier: 0.25 means +25%. */
  pct?: number;
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
  | 'ALL_ALLIES'
  | 'ALLY_STRONGEST' // the ally (self included) with the highest ATK or MATK (Haste)
  | 'OTHER_ALLY' // the strongest ally other than the caster (Quick)
  | 'DEAD_ALLY'; // a fallen ally (Raise)

/** Extra conditions a skill needs to be a candidate for the launch roll. */
export type SkillCondition =
  | 'SELF_HP_BELOW_60'
  | 'SELF_HP_BELOW_40'
  | 'ALLY_HP_BELOW_60'
  | 'ENEMY_COUNT_2PLUS'
  | 'ALLY_DEAD'
  | 'ALLY_DEBUFFED'
  | 'HAS_ALLY'
  | 'ALLY_MP_BELOW_50';

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
      /** Random hit count: hits..hitsMax per target (Monk · Pummel). */
      hitsMax?: number;
      forceCrit?: boolean;
    }
  /** mpPct: also restores that share of max MP (Monk · Chakra). */
  | { kind: 'HEAL'; scaling: Partial<Record<keyof CombatStats, number>>; flat?: number; mpPct?: number }
  | { kind: 'STATUS'; status: StatusId; turns: number; chance?: number; potency?: number; self?: boolean }
  | { kind: 'BUFF'; stat: keyof CombatStats; pct?: number; flat?: number; turns: number; self?: boolean }
  | { kind: 'SHIELD'; pctMaxHp: number; turns: number }
  | { kind: 'CLEANSE' }
  /** bring a fallen ally back with this share of max HP */
  | { kind: 'REVIVE'; pctHp: number }
  /** Takes gold from a monster that was hit (once per monster): pct × its top gold roll. Paid on a win. */
  | { kind: 'STEAL_GOLD'; pct: number }
  /** The target takes an extra turn right after this one (Time Mage · Quick). */
  | { kind: 'QUICK' }
  /** Restores pct × max MP (Summoner · Critical: Recover MP); negative pct burns MP (Samurai · Osafune). */
  | { kind: 'RESTORE_MP'; pct: number };

/**
 * Reactive triggers (Layer 4, cross-party). ON_HIT — you were hit by an attack → effects (usually on self),
 * rolled after COUNTER (Regenerate). PARRY — see engine strike().
 *
 * COVER        — an ally is the declared single target → take the hit instead (mitigated)
 * ASSIST       — an ally landed a hit → strike the same target out of turn
 * COUNTER      — you were hit → strike back
 * ON_DODGE     — you dodged → effects on self
 * ON_LOW_HP    — your HP fell below 30% → effects on self (once per battle)
 * ON_ALLY_DEATH— an ally died → effects (rage, shields, vengeance)
 */
export type TriggerKind = 'COVER' | 'ASSIST' | 'COUNTER' | 'ON_DODGE' | 'ON_LOW_HP' | 'ON_ALLY_DEATH' | 'PARRY' | 'ON_HIT' | 'MAGIC_COUNTER' | 'EVADE' | 'FIRST_STRIKE' | 'ON_DEATH';

/**
 * Always-on class traits (FFT-style jobs, MASTER_SPEC §6). Replaced by a mutation like the class passive.
 * allyTurnHeal — at the start of every allied unit's turn (own turn included) the unit recovers
 *                VIT × vit HP, at most capPct × max HP per tick (Knight: Iron Blood).
 *                ownTurnOnly: only on the unit's own turns (Monk: Lifefont).
 * hitBonus     — added to the unit's hit chance (Archer: Concentration).
 * mpCostMult   — multiplies every skill's MP cost (Summoner: Halve MP).
 * rageAtk      — ATK × (1 + rageAtk × share of HP lost) (Dragoon: Dragon Blood).
 * atkPerTurn   — ATK +x per own turn taken, up to `max` (Samurai: Bushido).
 * turnMpAura   — at the start of each own turn every ally (self included) regains that share of max MP (Dancer).
 * poach        — chance per defeated monster of one extra monster material (Thief: Poach). Loot only.
 */
export interface ClassTraits {
  allyTurnHeal?: { vit: number; capPct: number; ownTurnOnly?: boolean };
  hitBonus?: number;
  mpCostMult?: number;
  rageAtk?: number;
  atkPerTurn?: { per: number; max: number };
  turnMpAura?: number;
  poach?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  kind: 'ACTIVE' | 'REACTIVE';
  element: Element;
  /** Base activation rate in % (Layer 1 launch roll / reactive roll). */
  rate: number;
  /** Extra rate per point of LUK, capped at `lukRate.max` % (Samurai · Shirahadori). */
  lukRate?: { per: number; max: number };
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
  /** Dragoon Jump: leaves the field this turn, the effects land on the unit's next turn. */
  jump?: boolean;
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
  /** robbed: a Thief already took this monster's gold (Steal Gil works once per monster). */
  flags: { miracleUsed: boolean; ultimateBlocked: boolean; phase: number; enraged: boolean; robbed: boolean };
  /** Dragoon Jump in progress: the unit is up in the sky (nobody can target it) and dives on its next turn. */
  jump: { skill: string; target: string } | null;
  /** Party-side consumables this unit may auto-use (players only). */
  autoPotion: boolean;
  /** Never acts (training dummies). */
  passive: boolean;
  /** Personal potion bag (party play); null = draw from the battle's shared `items`. */
  bag: Record<string, number> | null;
  /** Awakening gauge 0..AWAKEN_MAX (players only). */
  awaken: number;
  /** Always-on class traits (none for monsters or mutated characters). */
  traits: ClassTraits;
  /** Player character that can Awaken (side A with a class, not a dummy). */
  awakenable: boolean;
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
  /** Personal potion bag. Party members each bring their own; omit to use CombatConfig.items. */
  items?: Record<string, number>;
  /** Carried over between dungeon waves. */
  cooldowns?: Record<string, number>;
  statuses?: ActiveStatus[];
  awaken?: number;
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
  /** Player decisions (Awakening presses) — part of the replay key with the seed. */
  inputs?: CombatInput[];
}

export type CombatResult = 'ONGOING' | 'WIN' | 'LOSE';

export type CombatEvent =
  | { type: 'ROUND'; round: number }
  | { type: 'TURN'; unit: string }
  | { type: 'SKIP'; unit: string; reason: StatusId }
  | { type: 'SKILL'; unit: string; skill: string; targets: string[]; reactive?: TriggerKind; mp?: number }
  /** evade = Perfect Dodge-style reaction; `by` = the reaction skill (the scene draws Kawarimi as a log swap). */
  | { type: 'MISS'; source: string; target: string; parry?: boolean; evade?: boolean; by?: string }
  | { type: 'DAMAGE'; source: string; target: string; amount: number; crit: boolean; block: boolean; element: Element }
  | { type: 'HEAL'; source: string; target: string; amount: number }
  | { type: 'STATUS'; target: string; status: StatusId; turns: number }
  | { type: 'TICK'; target: string; status: StatusId; amount: number }
  | { type: 'SHIELD'; target: string; amount: number }
  | { type: 'BUFF'; target: string; stat: keyof CombatStats; pct?: number; flat?: number }
  | { type: 'COVER'; unit: string; protected: string }
  | { type: 'SUMMON'; unit: string; by: string }
  | { type: 'WAVE'; wave: number; total: number; modifier: string | null }
  | { type: 'RECOVER'; unit: string; amount: number }
  | { type: 'REVIVE'; unit: string; by: string; hp: number }
  | { type: 'STEAL'; unit: string; target: string; gold: number }
  | { type: 'QUICK'; unit: string; by: string }
  | { type: 'MP'; unit: string; amount: number }
  /** Jump: the dragoon leaps out of the fight; LAND = it dives back down (the strike follows). */
  | { type: 'JUMP'; unit: string; target: string }
  | { type: 'LAND'; unit: string; target: string }
  | { type: 'ITEM'; unit: string; item: string; amount: number }
  | { type: 'DEATH'; unit: string }
  /** Awakening Strike begins (the DAMAGE follows). */
  | { type: 'AWAKEN'; unit: string; grade: AwakenGrade; target: string }
  /** Back-to-back ally hits on one target: the following DAMAGE is boosted. */
  | { type: 'LINK'; from: string; unit: string; target: string }
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
    vit: extra.vit,
    luk: extra.luk,
  };
}
