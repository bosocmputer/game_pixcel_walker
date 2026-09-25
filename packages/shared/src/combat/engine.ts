/**
 * Party auto turn-based combat engine (Pockie Ninja style, 3v3 / waves / bosses).
 *
 * Turn pipeline for the acting unit (docs/COMBAT_SPEC.md §2):
 *   1. status phase (DoT ticks, Stun/Freeze/Root skip)       4. target selection (taunt → rule → row aggro)
 *   2. pre-action (auto potion, boss deterministic ultimate) 5. hit/dodge → crit → block per strike
 *   3. Layer 1 skill launch roll over the deck (priority)    6. reactive triggers: Cover, Counter, On-Dodge,
 *                                                                On-Low-HP, Assist, On-Ally-Death
 * Fully deterministic from (config, seed): all randomness uses the combat RNG.
 */
import { MONSTERS, monsterDeck, type BossSkill } from '../data/monsters';
import { BASIC_ATTACK, SKILLS } from '../data/skills';
import { CONSUMABLES } from '../data/items';
import { createRng, type Rng } from '../rules/rng';
import { mitigate } from '../rules/stats';
import { AWAKEN_GAIN_DEAL, AWAKEN_GAIN_TAKE, AWAKEN_MAX, AWAKEN_MULT, AWAKEN_SKILL, LINK_MULT } from './awaken';
import type { Element } from '../types';
import {
  DECK_SIZE,
  type AwakenGrade,
  type CombatConfig,
  type CombatInput,
  type CombatEvent,
  type CombatResult,
  type CombatStats,
  type CombatUnit,
  type Effect,
  type SkillDef,
  type StatusId,
  type TriggerKind,
  type UnitSetup,
  type WaveModifier,
} from './types';

export const FRONT_AGGRO = 0.7;
export const COVER_MITIGATION = 0.7;
/** Players auto-drink below these shares of max HP / MP (HP first). */
export const AUTO_HP_POTION = 0.3;
export const AUTO_MP_POTION = 0.25;
/** Training dummies measure % max-HP damage-over-time against this HP. */
export const DUMMY_REFERENCE_HP = 1000;
const DEFAULT_MAX_ROUNDS = 60;
const HARD_CC: StatusId[] = ['STUN', 'FREEZE', 'ROOT'];

export interface Combat {
  seed: number;
  rng: Rng;
  round: number;
  units: CombatUnit[];
  queue: string[];
  queueIndex: number;
  events: CombatEvent[];
  result: CombatResult;
  items: Record<string, number>;
  modifier: WaveModifier | null;
  maxRounds: number;
  summonCounter: number;
  /** Per-boss ultimate cadence (can change on phase shift). */
  ultEvery: Record<string, number>;
  /** Player decisions for this battle (append-only; see CombatInput). */
  inputs: CombatInput[];
  /** Indices of `inputs` already consumed. */
  usedInputs: number[];
  /** Last landed hit this round (Link Attack chain). */
  lastHit: { attacker: string; target: string; side: 'A' | 'B'; round: number } | null;
}

// ---------------------------------------------------------------------------------------------
// Setup

function makeUnit(s: UnitSetup, side: 'A' | 'B', rng: Rng): CombatUnit {
  return {
    id: s.id,
    name: s.name,
    side,
    row: s.row,
    sprite: s.sprite,
    level: s.level,
    element: s.element ?? 'NEUTRAL',
    isBoss: !!s.isBoss,
    classId: s.classId ?? null,
    mutation: s.mutation ?? null,
    monsterId: s.monsterId ?? null,
    base: { ...s.stats },
    hp: Math.max(1, Math.min(s.stats.maxHp, s.hp ?? s.stats.maxHp)),
    mp: Math.min(s.stats.maxMp, s.mp ?? s.stats.maxMp),
    shield: null,
    deck: s.deck.filter((id) => SKILLS[id] && id !== BASIC_ATTACK).slice(0, DECK_SIZE),
    cooldowns: { ...(s.cooldowns ?? {}) },
    statuses: (s.statuses ?? []).map((x) => ({ ...x })),
    buffs: [],
    rateBonus: { ...(s.rateBonus ?? {}) },
    initiative: rng(),
    turnsTaken: 0,
    usedOnce: [],
    flags: { miracleUsed: false, ultimateBlocked: false, phase: 0, enraged: false },
    autoPotion: !!s.autoPotion,
    passive: !!s.passive,
    bag: s.items ? { ...s.items } : null,
    awaken: Math.max(0, Math.min(AWAKEN_MAX, s.awaken ?? 0)),
    awakenable: side === 'A' && !!s.classId && !s.passive,
  };
}

export function createCombat(cfg: CombatConfig): Combat {
  const rng = createRng(cfg.seed);
  const units = [...cfg.partyA.map((u) => makeUnit(u, 'A', rng)), ...cfg.partyB.map((u) => makeUnit(u, 'B', rng))];
  const mod = cfg.modifier ?? null;
  if (mod?.enemyStatMult) {
    for (const u of units.filter((x) => x.side === 'B')) {
      for (const [k, m] of Object.entries(mod.enemyStatMult)) u.base[k as keyof CombatStats] *= m as number;
      u.hp = Math.min(u.hp, u.base.maxHp);
    }
  }
  const ultEvery: Record<string, number> = {};
  for (const u of units) {
    const ult = bossUltimate(u);
    if (ult) ultEvery[u.id] = ult.everyTurns;
  }
  return {
    seed: cfg.seed,
    rng,
    round: 0,
    units,
    queue: [],
    queueIndex: 0,
    events: [],
    result: 'ONGOING',
    items: { ...(cfg.items ?? {}) },
    modifier: mod,
    maxRounds: cfg.maxRounds ?? DEFAULT_MAX_ROUNDS,
    summonCounter: 0,
    ultEvery,
    inputs: [...(cfg.inputs ?? [])],
    usedInputs: [],
    lastHit: null,
  };
}

/** Monster → combat unit setup. Boss HP/ATK can be scaled for party size. */
export function monsterSetup(monsterId: string, id: string, opts: { hp?: number; hpScale?: number; atkScale?: number } = {}): UnitSetup {
  const m = MONSTERS[monsterId];
  if (!m) throw new Error(`Unknown monster ${monsterId}`);
  const hpScale = opts.hpScale ?? 1;
  const atkScale = opts.atkScale ?? 1;
  const maxHp = Math.round(m.hp * hpScale);
  return {
    id,
    name: m.nameTh,
    row: m.row ?? 'FRONT',
    sprite: m.sprite,
    level: m.level,
    element: m.element,
    monsterId,
    isBoss: !!m.boss,
    passive: !!m.passive,
    deck: monsterDeck(m),
    hp: opts.hp !== undefined ? Math.min(maxHp, opts.hp) : maxHp,
    stats: {
      maxHp,
      maxMp: m.mp,
      atk: Math.round(m.atk * atkScale),
      matk: Math.round(m.matk * atkScale),
      def: m.def,
      mdef: m.mdef,
      speed: m.speed,
      hit: Math.min(1.05, 0.9 + m.level * 0.004),
      dodge: m.evasion,
      crit: 0.05,
      critResist: Math.min(0.2, m.level * 0.002),
      critMult: 1.5,
      block: m.passive ? 0 : m.boss ? 0.1 : 0.04,
      blockReduce: 0.4,
      healPower: 1,
    },
  };
}

/**
 * Boss HP scaled to party size. Grows sub-linearly (n^0.6) so each extra member is a net gain:
 * support classes add survival rather than damage, and grouping up should feel rewarding.
 * World bosses are never scaled.
 */
export const PARTY_SCALE_EXP = 0.6;
export function bossHpScale(monsterId: string, partySize: number): number {
  const boss = MONSTERS[monsterId]?.boss;
  if (!boss || boss.worldBoss) return 1;
  return Math.min(1, Math.max(0.2, Math.pow(Math.max(1, partySize), PARTY_SCALE_EXP) / (boss.recommendedParty[1] + 1)));
}

/** Boss ATK scaled to party size: solo players face 60% + 40% × hpScale. */
export function bossAtkScale(monsterId: string, partySize: number): number {
  return 0.6 + 0.4 * bossHpScale(monsterId, partySize);
}

// ---------------------------------------------------------------------------------------------
// Queries

export const alive = (u: CombatUnit) => u.hp > 0;
export const getUnit = (c: Combat, id: string) => c.units.find((u) => u.id === id);
export const sideOf = (c: Combat, side: 'A' | 'B') => c.units.filter((u) => u.side === side && alive(u));
const foesOf = (c: Combat, u: CombatUnit) => sideOf(c, u.side === 'A' ? 'B' : 'A');
const alliesOf = (c: Combat, u: CombatUnit) => sideOf(c, u.side);
const hasStatus = (u: CombatUnit, s: StatusId) => u.statuses.some((x) => x.id === s);
const push = (c: Combat, e: CombatEvent) => c.events.push(e);

export function stat(u: CombatUnit, key: keyof CombatStats): number {
  let pct = 0;
  let flat = 0;
  for (const b of u.buffs) {
    if (b.stat !== key) continue;
    pct += b.pct ?? 0;
    flat += b.flat ?? 0;
  }
  let v = u.base[key] * (1 + pct) + flat;
  if (key === 'speed') {
    const slow = u.statuses.find((s) => s.id === 'SLOW');
    if (slow) v *= 1 - slow.potency;
  }
  if (key === 'dodge') {
    if (u.mutation === 'PURE_MAGE') return 0;
    v = Math.min(u.mutation === 'PURE_SPEED' ? 0.85 : 0.6, v);
  }
  return v;
}

function bossUltimate(u: CombatUnit): BossSkill | null {
  return (u.monsterId && MONSTERS[u.monsterId]?.boss?.skills[0]) || null;
}

export function skillMpCost(u: CombatUnit, sk: SkillDef): number {
  return sk.mp * (u.mutation === 'PURE_MAGE' ? 3 : u.mutation === 'PURE_STRENGTH' ? 2 : 1);
}

/** Final launch rate (%) = base + element bonus (gear/outfit, phase) + wave modifier. */
export function launchRate(c: Combat, u: CombatUnit, sk: SkillDef): number {
  const own = (u.rateBonus[sk.element] ?? 0) + (u.rateBonus.ALL ?? 0);
  const env = (c.modifier?.rateBonus?.[sk.element] ?? 0) + (c.modifier?.rateBonus?.ALL ?? 0);
  return Math.max(0, Math.min(100, sk.rate + own + env));
}

function conditionMet(c: Combat, u: CombatUnit, sk: SkillDef): boolean {
  switch (sk.condition) {
    case 'SELF_HP_BELOW_60':
      return u.hp < u.base.maxHp * 0.6;
    case 'SELF_HP_BELOW_40':
      return u.hp < u.base.maxHp * 0.4;
    case 'ALLY_HP_BELOW_60':
      return alliesOf(c, u).some((a) => a.hp < a.base.maxHp * 0.6);
    case 'ENEMY_COUNT_2PLUS':
      return foesOf(c, u).length >= 2;
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------------------------
// Main loop

/** Executes the next unit turn (starting a new round when needed). Appends to `c.events`. */
export function step(c: Combat): Combat {
  if (c.result !== 'ONGOING') return c;
  if (c.queueIndex >= c.queue.length) {
    startRound(c);
    if (c.result !== 'ONGOING') return c;
  }
  while (c.queueIndex < c.queue.length) {
    const u = getUnit(c, c.queue[c.queueIndex++]!);
    if (u && alive(u)) {
      takeTurn(c, u);
      checkEnd(c);
      return c;
    }
  }
  return c;
}

export function runToEnd(c: Combat): Combat {
  let guard = 0;
  while (c.result === 'ONGOING' && guard++ < 10000) step(c);
  return c;
}

/** Replays a battle from its config (server verification). */
export function replayCombat(cfg: CombatConfig): Combat {
  return runToEnd(createCombat(cfg));
}

function startRound(c: Combat) {
  c.round++;
  if (c.round > c.maxRounds) return end(c, 'LOSE');
  push(c, { type: 'ROUND', round: c.round });

  for (const u of c.units.filter(alive)) {
    const boss = u.monsterId ? MONSTERS[u.monsterId]?.boss : undefined;
    if (boss?.enrageRound && c.round > boss.enrageRound && !u.flags.enraged) {
      u.flags.enraged = true;
      u.base.crit = 1;
      u.base.atk *= 10;
      u.base.matk *= 10;
      push(c, { type: 'ENRAGE', unit: u.id });
    }
  }
  if (c.modifier?.roundDotPct) {
    for (const u of c.units.filter(alive)) {
      const amount = Math.max(1, Math.round(u.base.maxHp * c.modifier.roundDotPct));
      push(c, { type: 'ENV', modifier: c.modifier.id, amount });
      damage(c, u, u, amount);
    }
    checkEnd(c);
  }
  c.queue = c.units
    .filter(alive)
    .sort((a, b) => stat(b, 'speed') - stat(a, 'speed') || b.initiative - a.initiative)
    .map((u) => u.id);
  c.queueIndex = 0;
}

function checkEnd(c: Combat) {
  if (c.result !== 'ONGOING') return;
  if (sideOf(c, 'B').length === 0) end(c, 'WIN');
  else if (sideOf(c, 'A').length === 0) end(c, 'LOSE');
}

function end(c: Combat, result: CombatResult) {
  c.result = result;
  push(c, { type: 'END', result });
}

function takeTurn(c: Combat, u: CombatUnit) {
  if (u.passive) {
    // Training dummies never act, but their statuses still tick down.
    for (const s of [...u.statuses]) {
      if (s.id !== 'POISON' && s.id !== 'BURN' && s.id !== 'BLEED') continue;
      // % DoTs are measured against a 1,000 HP reference so the numbers stay meaningful.
      const amount = Math.max(1, Math.round(s.id === 'BURN' ? s.potency : DUMMY_REFERENCE_HP * s.potency));
      push(c, { type: 'TICK', target: u.id, status: s.id, amount });
      damage(c, getUnit(c, s.sourceId) ?? u, u, amount);
    }
    return endTurn(u);
  }
  push(c, { type: 'TURN', unit: u.id });
  for (const k of Object.keys(u.cooldowns)) u.cooldowns[k] = Math.max(0, (u.cooldowns[k] ?? 0) - 1);

  // 1. Status phase — damage over time, then hard crowd control.
  for (const s of [...u.statuses]) {
    if (s.id !== 'POISON' && s.id !== 'BURN' && s.id !== 'BLEED') continue;
    const pct = s.id === 'BURN' ? 0 : u.isBoss ? Math.min(0.01, s.potency) : s.potency;
    const amount = Math.max(1, Math.round(s.id === 'BURN' ? s.potency : u.base.maxHp * pct));
    push(c, { type: 'TICK', target: u.id, status: s.id, amount });
    damage(c, getUnit(c, s.sourceId) ?? u, u, amount);
    if (!alive(u)) return;
  }
  const cc = u.statuses.find((s) => HARD_CC.includes(s.id));
  if (cc) {
    push(c, { type: 'SKIP', unit: u.id, reason: cc.id });
    return endTurn(u);
  }

  // Player input: Awakening (only when the gauge is full; a stale press is simply consumed).
  const input = takeInput(c, u);
  if (input && u.awakenable && u.awaken >= AWAKEN_MAX && awakenStrike(c, u, input.grade)) return endTurn(u);

  // 2. Pre-action: auto potion, then the boss's deterministic ultimate.
  const bag = u.bag ?? c.items;
  if (u.autoPotion && u.hp < u.base.maxHp * AUTO_HP_POTION && (bag['red_potion'] ?? 0) > 0) {
    bag['red_potion'] = (bag['red_potion'] ?? 0) - 1;
    const amount = heal(c, u, u, CONSUMABLES.red_potion?.amount ?? 200, true);
    push(c, { type: 'ITEM', unit: u.id, item: 'red_potion', amount });
    return endTurn(u);
  }
  if (u.autoPotion && u.mp < u.base.maxMp * AUTO_MP_POTION && (bag['blue_elixir'] ?? 0) > 0) {
    bag['blue_elixir'] = (bag['blue_elixir'] ?? 0) - 1;
    const before = u.mp;
    u.mp = Math.min(u.base.maxMp, u.mp + (CONSUMABLES.blue_elixir?.amount ?? 150));
    push(c, { type: 'ITEM', unit: u.id, item: 'blue_elixir', amount: Math.round(u.mp - before) });
    return endTurn(u);
  }
  const ult = bossUltimate(u);
  if (ult && (u.turnsTaken + 1) % (c.ultEvery[u.id] ?? ult.everyTurns) === 0) {
    bossUltimateAttack(c, u, ult);
    return endTurn(u);
  }

  // 3. Layer 1 — skill launch roll over the deck, highest priority first.
  const candidates = u.deck
    .map((id) => SKILLS[id]!)
    .filter((sk) => sk.kind === 'ACTIVE' && !(u.cooldowns[sk.id] ?? 0) && u.mp >= skillMpCost(u, sk) && conditionMet(c, u, sk))
    .sort((a, b) => b.priority - a.priority);
  let chosen = SKILLS[BASIC_ATTACK]!;
  for (const sk of candidates) {
    if (c.rng() * 100 < launchRate(c, u, sk)) {
      chosen = sk;
      break;
    }
  }
  useSkill(c, u, chosen);
  endTurn(u);
}

/** The unit's next unused input whose turn has come (consumed on read). */
function takeInput(c: Combat, u: CombatUnit): CombatInput | null {
  for (let i = 0; i < c.inputs.length; i++) {
    const inp = c.inputs[i]!;
    if (inp.unit !== u.id || inp.turn > u.turnsTaken || c.usedInputs.includes(i)) continue;
    c.usedInputs.push(i);
    return inp;
  }
  return null;
}

/** Awakening Strike: unavoidable hit on the weakest enemy with the unit's best attack stat. */
function awakenStrike(c: Combat, u: CombatUnit, grade: AwakenGrade): boolean {
  const t = pickTarget(c, u, 'ENEMY_LOWEST_HP');
  if (!t) return false;
  push(c, { type: 'AWAKEN', unit: u.id, grade, target: t.id });
  const magic = stat(u, 'matk') > stat(u, 'atk');
  strike(c, u, t, { kind: 'DAMAGE', type: magic ? 'MAGIC' : 'PHYSICAL', scaling: { [magic ? 'matk' : 'atk']: AWAKEN_MULT[grade] } }, AWAKEN_SKILL, 1, false);
  u.awaken = 0;
  return true;
}

function endTurn(u: CombatUnit) {
  u.turnsTaken++;
  for (const s of u.statuses) s.turns--;
  u.statuses = u.statuses.filter((s) => s.turns > 0);
  for (const b of u.buffs) b.turns--;
  u.buffs = u.buffs.filter((b) => b.turns > 0);
  if (u.shield && --u.shield.turns <= 0) u.shield = null;
}

// ---------------------------------------------------------------------------------------------
// Layer 2 — targeting

function pickTarget(c: Combat, u: CombatUnit, rule: SkillDef['target']): CombatUnit | undefined {
  const foes = foesOf(c, u);
  if (!foes.length) return undefined;
  const taunter = foes.find((f) => hasStatus(f, 'TAUNTING'));
  if (taunter) return taunter;
  const uniform = (list: CombatUnit[]) => list[Math.floor(c.rng() * list.length)];
  if (rule === 'ENEMY_LOWEST_HP') return [...foes].sort((a, b) => a.hp / a.base.maxHp - b.hp / b.base.maxHp)[0];
  const front = foes.filter((f) => f.row === 'FRONT');
  const back = foes.filter((f) => f.row === 'BACK');
  if (rule === 'ENEMY_BACK') return uniform(back.length ? back : front);
  if (!front.length || !back.length) return uniform(foes);
  return uniform(c.rng() < FRONT_AGGRO ? front : back);
}

function resolveTargets(c: Combat, u: CombatUnit, sk: SkillDef): CombatUnit[] {
  switch (sk.target) {
    case 'SELF':
      return [u];
    case 'ALL_ALLIES':
      return alliesOf(c, u);
    case 'ALLY_LOWEST_HP':
      return [[...alliesOf(c, u)].sort((a, b) => a.hp / a.base.maxHp - b.hp / b.base.maxHp)[0]!];
    case 'ALL_ENEMIES':
      return foesOf(c, u);
    default: {
      const t = pickTarget(c, u, sk.target);
      return t ? [t] : [];
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Skill execution

interface UseOpts {
  reactive?: TriggerKind;
  /** Force the primary target (assists / counters / vengeance). */
  target?: CombatUnit;
}

function useSkill(c: Combat, u: CombatUnit, sk: SkillDef, opts: UseOpts = {}) {
  const mpSpent = opts.reactive ? 0 : skillMpCost(u, sk);
  if (!opts.reactive) {
    u.mp -= mpSpent;
    if (sk.cooldown > 0 && u.mutation !== 'PURE_MAGE') u.cooldowns[sk.id] = sk.cooldown + 1;
  }
  const offensive = sk.effects.some((e) => e.kind === 'DAMAGE');
  let targets = opts.target && offensive ? [opts.target] : resolveTargets(c, u, sk);
  targets = targets.filter(alive);
  if (!targets.length) return;

  let coveredId: string | null = null;
  // Cover trigger: a single declared target may be protected by an ally (before any roll).
  if (offensive && targets.length === 1 && !sk.unavoidable && !opts.reactive) {
    const declared = targets[0]!;
    const guard = alliesOf(c, declared).find(
      (a) => a.id !== declared.id && a.deck.some((id) => SKILLS[id]?.trigger === 'COVER' && c.rng() * 100 < launchRate(c, a, SKILLS[id]!)),
    );
    if (guard) {
      push(c, { type: 'COVER', unit: guard.id, protected: declared.id });
      targets = [guard];
      coveredId = guard.id;
    }
  }

  push(c, { type: 'SKILL', unit: u.id, skill: sk.id, targets: targets.map((t) => t.id), reactive: opts.reactive, mp: mpSpent || undefined });

  const landed = new Set<CombatUnit>();
  for (const effect of sk.effects) {
    if (effect.kind === 'DAMAGE') {
      const chainTargets = effect.chain
        ? [targets[0]!, ...foesOf(c, u).filter((f) => f !== targets[0]).slice(0, effect.chain.jumps)]
        : targets;
      chainTargets.forEach((t, i) => {
        const falloff = effect.chain ? 1 - effect.chain.falloff * i : 1;
        for (let h = 0; h < (effect.hits ?? 1); h++) {
          if (!alive(t) || !alive(u)) break;
          if (strike(c, u, t, effect, sk, falloff, t.id === coveredId)) landed.add(t);
        }
      });
    } else {
      const receivers = effect.kind === 'STATUS' || effect.kind === 'BUFF' ? effectReceivers(u, sk, effect, targets, landed) : targets;
      for (const t of receivers) applySupport(c, u, t, effect);
    }
  }

  if (offensive && !opts.reactive && landed.size) {
    // Counter: each target that was hit may strike back.
    for (const t of landed) {
      if (!alive(t) || !alive(u)) continue;
      const counter = reactiveRoll(c, t, 'COUNTER');
      if (counter) useSkill(c, t, counter, { reactive: 'COUNTER', target: u });
    }
    // Assist: one ally of the attacker may follow up on the same target.
    const primary = [...landed].find(alive);
    if (primary && alive(u)) {
      for (const ally of alliesOf(c, u)) {
        if (ally === u) continue;
        const assist = reactiveRoll(c, ally, 'ASSIST');
        if (assist) {
          useSkill(c, ally, assist, { reactive: 'ASSIST', target: primary });
          break;
        }
      }
    }
  }
}

function effectReceivers(u: CombatUnit, sk: SkillDef, e: Effect, targets: CombatUnit[], landed: Set<CombatUnit>): CombatUnit[] {
  if ('self' in e && e.self) return [u];
  const offensive = sk.effects.some((x) => x.kind === 'DAMAGE');
  if (offensive && e.kind === 'STATUS') return [...landed].filter(alive); // debuffs need a hit
  return targets;
}

function reactiveRoll(c: Combat, u: CombatUnit, trigger: TriggerKind): SkillDef | null {
  for (const id of u.deck) {
    const sk = SKILLS[id];
    if (!sk || sk.kind !== 'REACTIVE' || sk.trigger !== trigger) continue;
    if (sk.oncePerBattle && u.usedOnce.includes(sk.id)) continue;
    if (c.rng() * 100 < launchRate(c, u, sk)) {
      if (sk.oncePerBattle) u.usedOnce.push(sk.id);
      return sk;
    }
  }
  return null;
}

const WEAK: Partial<Record<Element, Element>> = { FIRE: 'EARTH', WATER: 'FIRE', LIGHTNING: 'WATER', EARTH: 'LIGHTNING', HOLY: 'SHADOW', SHADOW: 'HOLY' };
function elementMult(att: Element, def: Element): number {
  if (WEAK[att] === def) return 1.5;
  if (WEAK[def] === att) return 0.75;
  return 1;
}

/** Layer 3 for one strike: hit/dodge → crit → block → mitigation → damage. Returns true if it landed. */
function strike(
  c: Combat,
  u: CombatUnit,
  t: CombatUnit,
  e: Extract<Effect, { kind: 'DAMAGE' }>,
  sk: SkillDef,
  falloff: number,
  covered: boolean,
): boolean {
  const element = sk.element === 'NEUTRAL' ? (u.side === 'B' ? u.element : 'NEUTRAL') : sk.element;
  if (!sk.unavoidable && e.type !== 'TRUE') {
    const hitChance = Math.max(0.05, Math.min(1, stat(u, 'hit') - stat(t, 'dodge')));
    if (c.rng() >= hitChance) {
      push(c, { type: 'MISS', source: u.id, target: t.id });
      const onDodge = reactiveRoll(c, t, 'ON_DODGE');
      if (onDodge) useSkill(c, t, onDodge, { reactive: 'ON_DODGE', target: u });
      return false;
    }
  }

  if (u.mutation === 'PURE_STRENGTH' && e.type === 'PHYSICAL' && !t.isBoss && c.rng() < 0.15) {
    push(c, { type: 'DAMAGE', source: u.id, target: t.id, amount: t.hp, crit: true, block: false, element });
    damage(c, u, t, t.hp, { noShield: true });
    return true;
  }

  let raw = 0;
  for (const [k, v] of Object.entries(e.scaling)) raw += stat(u, k as keyof CombatStats) * (v ?? 0);
  raw = (raw + (e.flat ?? 0)) * falloff;
  const ranged = !!sk.ranged || u.classId === 'RANGER';
  if (u.mutation === 'PURE_DEX' && e.type === 'PHYSICAL' && !ranged) raw = 1;
  if (u.mutation === 'PURE_MAGE' && e.type === 'MAGIC') raw *= 5;
  if (u.mutation === 'PURE_TANK' && e.type !== 'TRUE') raw *= 0.2;

  const critChance = u.flags.enraged ? 1 : stat(u, 'crit') - stat(t, 'critResist');
  const crit = !!e.forceCrit || (u.mutation === 'PURE_DEX' && ranged && e.type === 'PHYSICAL') || c.rng() < critChance;
  if (crit) raw *= stat(u, 'critMult');
  raw *= elementMult(element, t.element);

  let amount = e.type === 'TRUE' ? Math.max(1, Math.round(raw)) : mitigate(raw, stat(t, e.type === 'PHYSICAL' ? 'def' : 'mdef'));
  let block = false;
  if (!sk.unavoidable && e.type !== 'TRUE' && c.rng() < stat(t, 'block')) {
    block = true;
    amount = Math.max(1, Math.round(amount * (1 - stat(t, 'blockReduce'))));
  }
  if (covered) amount = Math.max(1, Math.round(amount * COVER_MITIGATION));

  if (t.mutation === 'PURE_TANK' && e.type === 'PHYSICAL') {
    const reflect = Math.round(amount * 0.3);
    amount = Math.max(1, Math.round(amount * 0.1));
    if (reflect > 0 && alive(u)) {
      push(c, { type: 'DAMAGE', source: t.id, target: u.id, amount: reflect, crit: false, block: false, element: 'NEUTRAL' });
      damage(c, t, u, reflect);
    }
  }
  // Link Attack: a different ally landed the previous hit on this same target this round.
  const lh = c.lastHit;
  if (u.side === 'A' && lh && lh.side === 'A' && lh.round === c.round && lh.target === t.id && lh.attacker !== u.id) {
    amount = Math.max(1, Math.round(amount * LINK_MULT));
    push(c, { type: 'LINK', from: lh.attacker, unit: u.id, target: t.id });
  }
  push(c, { type: 'DAMAGE', source: u.id, target: t.id, amount, crit, block, element });
  c.lastHit = { attacker: u.id, target: t.id, side: u.side, round: c.round };
  if (u.awakenable) u.awaken = Math.min(AWAKEN_MAX, u.awaken + AWAKEN_GAIN_DEAL);
  if (t.awakenable) t.awaken = Math.min(AWAKEN_MAX, t.awaken + AWAKEN_GAIN_TAKE);
  damage(c, u, t, amount);
  return true;
}

function applySupport(c: Combat, u: CombatUnit, t: CombatUnit, e: Effect) {
  if (!alive(t)) return;
  switch (e.kind) {
    case 'HEAL': {
      let raw = e.flat ?? 0;
      for (const [k, v] of Object.entries(e.scaling)) raw += stat(u, k as keyof CombatStats) * (v ?? 0);
      heal(c, u, t, raw * stat(u, 'healPower'));
      break;
    }
    case 'STATUS': {
      let chance = e.chance ?? 1;
      if (t.isBoss && HARD_CC.includes(e.status)) chance *= 0.5;
      if (c.rng() >= chance) break;
      // Burn stores its per-turn damage at application time (scales with the caster).
      const potency = e.status === 'BURN' ? Math.round(stat(u, 'matk') * (e.potency ?? 0.3)) : e.potency ?? 0;
      t.statuses = t.statuses.filter((s) => s.id !== e.status);
      t.statuses.push({ id: e.status, turns: e.turns, potency, sourceId: u.id });
      push(c, { type: 'STATUS', target: t.id, status: e.status, turns: e.turns });
      break;
    }
    case 'BUFF':
      t.buffs.push({ stat: e.stat, pct: e.pct, flat: e.flat, turns: e.turns });
      push(c, { type: 'BUFF', target: t.id, stat: e.stat, pct: e.pct, flat: e.flat });
      break;
    case 'SHIELD': {
      const amount = Math.round(t.base.maxHp * e.pctMaxHp);
      t.shield = { amount: Math.max(amount, t.shield?.amount ?? 0), turns: e.turns };
      push(c, { type: 'SHIELD', target: t.id, amount });
      break;
    }
    case 'CLEANSE':
      t.statuses = t.statuses.filter((s) => s.id === 'TAUNTING');
      break;
    default:
      break;
  }
}

function heal(c: Combat, src: CombatUnit, t: CombatUnit, raw: number, quiet = false): number {
  const mult = c.modifier?.healMult ?? 1;
  const amount = Math.max(0, Math.round(Math.min(raw * mult, t.base.maxHp - t.hp)));
  t.hp += amount;
  if (!quiet) push(c, { type: 'HEAL', source: src.id, target: t.id, amount });
  return amount;
}

/** Applies damage through shields, Pure Luck miracle, death and HP-threshold triggers. */
function damage(c: Combat, src: CombatUnit, t: CombatUnit, amount: number, opts: { noShield?: boolean } = {}) {
  if (!alive(t)) return;
  let dmg = amount;
  if (t.shield && !opts.noShield) {
    const soaked = Math.min(t.shield.amount, dmg);
    t.shield.amount -= soaked;
    dmg -= soaked;
    if (t.shield.amount <= 0) t.shield = null;
  }
  if (dmg >= t.hp && t.mutation === 'PURE_LUCK' && !t.flags.miracleUsed) {
    t.flags.miracleUsed = true;
    if (c.rng() < 0.5) {
      t.hp = 1;
      t.shield = { amount: 999999, turns: 1 };
      push(c, { type: 'MIRACLE', unit: t.id });
      return;
    }
  }
  const before = t.hp;
  t.hp = Math.max(0, t.hp - dmg);

  if (!alive(t)) {
    t.statuses = [];
    push(c, { type: 'DEATH', unit: t.id });
    for (const ally of alliesOf(c, t)) {
      const trig = reactiveRoll(c, ally, 'ON_ALLY_DEATH');
      if (!trig) continue;
      const vengeance = trig.effects.some((e) => e.kind === 'DAMAGE');
      useSkill(c, ally, trig, { reactive: 'ON_ALLY_DEATH', target: vengeance && alive(src) && src.side !== ally.side ? src : undefined });
    }
    return;
  }
  if (before >= t.base.maxHp * 0.3 && t.hp < t.base.maxHp * 0.3) {
    const low = reactiveRoll(c, t, 'ON_LOW_HP');
    if (low) useSkill(c, t, low, { reactive: 'ON_LOW_HP' });
  }
  if (t.isBoss) checkPhase(c, t);
}

function checkPhase(c: Combat, u: CombatUnit) {
  const phases = (u.monsterId && MONSTERS[u.monsterId]?.boss?.phases) || [];
  const ordered = [...phases].sort((a, b) => b.hpBelow - a.hpBelow);
  for (let i = u.flags.phase; i < ordered.length; i++) {
    const ph = ordered[i]!;
    if (u.hp / u.base.maxHp >= ph.hpBelow) break;
    u.flags.phase = i + 1;
    for (const [k, m] of Object.entries(ph.statMult ?? {})) u.base[k as keyof CombatStats] *= m as number;
    if (ph.rateBonus) u.rateBonus.ALL = (u.rateBonus.ALL ?? 0) + ph.rateBonus;
    for (const id of ph.addDeck ?? []) if (!u.deck.includes(id)) u.deck.push(id);
    if (ph.everyTurns) c.ultEvery[u.id] = ph.everyTurns;
    push(c, { type: 'PHASE', unit: u.id, phase: i + 1, message: ph.message });
  }
}

/** Deterministic, unavoidable boss ultimate (plan Taunt/shields around it). */
function bossUltimateAttack(c: Combat, boss: CombatUnit, ult: BossSkill) {
  push(c, { type: 'SKILL', unit: boss.id, skill: ult.id, targets: foesOf(c, boss).map((f) => f.id) });
  const tank = foesOf(c, boss).find((p) => p.mutation === 'PURE_TANK' && !p.flags.ultimateBlocked);
  if (ult.ultimate && tank) {
    tank.flags.ultimateBlocked = true;
    push(c, { type: 'BLOCK_ULT', unit: tank.id, skill: ult.id });
    return;
  }
  const targets = ult.aoe ? foesOf(c, boss) : [pickTarget(c, boss, 'ENEMY')].filter((x): x is CombatUnit => !!x);
  for (const t of targets) {
    if (t.mutation === 'PURE_SPEED' && c.rng() < 0.5) {
      push(c, { type: 'MISS', source: boss.id, target: t.id });
      continue;
    }
    const raw = stat(boss, 'atk') * ult.damageScale * elementMult(boss.element, t.element) * (boss.flags.enraged ? stat(boss, 'critMult') : 1);
    const amount = mitigate(raw, stat(t, 'def'));
    push(c, { type: 'DAMAGE', source: boss.id, target: t.id, amount, crit: boss.flags.enraged, block: false, element: boss.element });
    damage(c, boss, t, amount);
    if (ult.status && alive(t)) {
      const potency = ult.status.status === 'BURN' ? Math.round(stat(boss, 'atk') * (ult.status.potency ?? 0.3)) : ult.status.potency ?? 0;
      t.statuses = t.statuses.filter((s) => s.id !== ult.status!.status);
      t.statuses.push({ id: ult.status.status, turns: ult.status.turns, potency, sourceId: boss.id });
      push(c, { type: 'STATUS', target: t.id, status: ult.status.status, turns: ult.status.turns });
    }
  }
  if (ult.summons) {
    const count = Math.min(ult.summons.count, 5 - sideOf(c, boss.side).filter((u) => !u.isBoss).length);
    for (let i = 0; i < count; i++) {
      const setup = monsterSetup(ult.summons.monsterId, `s${c.summonCounter++}`);
      const unit = makeUnit(setup, boss.side, c.rng);
      c.units.push(unit);
      push(c, { type: 'SUMMON', unit: unit.id, by: boss.id });
    }
  }
}

/** Monsters the players defeated (for loot). */
export function defeatedMonsters(c: Combat): string[] {
  return c.units.filter((u) => u.side === 'B' && !alive(u) && u.monsterId).map((u) => u.monsterId!);
}
