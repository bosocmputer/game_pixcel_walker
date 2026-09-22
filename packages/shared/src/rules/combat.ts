/**
 * ATB combat engine (MASTER_SPEC §8), "wait" mode: time freezes while a manual unit chooses.
 * Fully deterministic from (setup, seed, commands) so the server can replay and verify.
 */
import type { ClassId, DerivedStats, Element, MutationId } from '../types';
import { SKILLS, type SkillDef, type SkillEffect, type StatusId } from '../data/skills';
import { MONSTERS, type BossSkill, type MonsterDef } from '../data/monsters';
import { CONSUMABLES } from '../data/items';
import { CLASSES } from '../data/classes';
import { createRng, type Rng } from './rng';
import { mitigate } from './stats';

export const TICK = 0.1;
export const GAUGE_FULL = 100;
export const CRIT_MULT = 1.5;
const MAX_TICKS = 20000;
const MAX_SUMMONS_ALIVE = 5;

export type Side = 'PLAYER' | 'ENEMY';

interface ActiveStatus {
  id: StatusId;
  remaining: number;
  potency: number;
  sourceId: string;
  /** Seconds accumulated toward the next DoT tick. */
  acc: number;
}

interface Buff {
  pct: Partial<Record<keyof DerivedStats, number>>;
  remaining: number;
}

export interface Unit {
  id: string;
  side: Side;
  name: string;
  sprite: string;
  level: number;
  classId: ClassId | null;
  mutation: MutationId | null;
  monsterId: string | null;
  isBoss: boolean;
  element: Element;
  base: DerivedStats;
  hp: number;
  mp: number;
  gauge: number;
  turns: number;
  skills: string[];
  cooldowns: Record<string, number>;
  statuses: ActiveStatus[];
  buffs: Buff[];
  evasionStacks: number[];
  manaShield: { ratio: number; remaining: number } | null;
  absorb: { amount: number; remaining: number } | null;
  invulnerable: number;
  flags: { ironWallUsed: boolean; miracleUsed: boolean; ultimateBlockUsed: boolean };
  controller: 'MANUAL' | 'AUTO';
}

export type Command =
  | { type: 'SKILL'; unitId: string; skillId: string; targetId?: string }
  | { type: 'ITEM'; unitId: string; itemId: string; targetId?: string }
  | { type: 'FLEE'; unitId: string };

export type BattleEvent =
  | { t: number; type: 'ACT'; unit: string; skill: string }
  | { t: number; type: 'DAMAGE'; source: string; target: string; amount: number; crit: boolean; element: Element }
  | { t: number; type: 'MISS'; source: string; target: string }
  | { t: number; type: 'HEAL'; source: string; target: string; amount: number }
  | { t: number; type: 'STATUS'; target: string; status: StatusId; seconds: number }
  | { t: number; type: 'DOT'; target: string; amount: number; status: StatusId }
  | { t: number; type: 'BLOCK'; unit: string; skill: string }
  | { t: number; type: 'MIRACLE'; unit: string }
  | { t: number; type: 'SHIELD'; unit: string; amount: number }
  | { t: number; type: 'SUMMON'; unit: string; by: string }
  | { t: number; type: 'DEATH'; unit: string }
  | { t: number; type: 'FLEE'; unit: string; success: boolean }
  | { t: number; type: 'END'; result: BattleResult };

export type BattleResult = 'ONGOING' | 'WIN' | 'LOSE' | 'FLED';

export interface BattleEnv {
  /** Element damage multipliers, e.g. weather: rain → { WATER: 1.25, LIGHTNING: 1.25 }. */
  elementBoost?: Partial<Record<Element, number>>;
  /** Enemy ATK multiplier (e.g. Night event). */
  enemyAtkMult?: number;
}

export interface PlayerSetup {
  id: string;
  name: string;
  sprite: string;
  level: number;
  classId: ClassId;
  mutation: MutationId | null;
  derived: DerivedStats;
  hp?: number;
  mp?: number;
  controller: 'MANUAL' | 'AUTO';
}

export interface BattleSetup {
  players: PlayerSetup[];
  enemies: { monsterId: string; hp?: number; hpScale?: number; atkScale?: number }[];
  /** Shared consumables for the player side. */
  items?: Record<string, number>;
  env?: BattleEnv;
  canFlee?: boolean;
}

export interface Battle {
  seed: number;
  rng: Rng;
  tick: number;
  units: Unit[];
  items: Record<string, number>;
  itemCooldown: number;
  env: BattleEnv;
  canFlee: boolean;
  threat: Record<string, Record<string, number>>;
  events: BattleEvent[];
  log: Command[];
  awaiting: string | null;
  result: BattleResult;
  summonCounter: number;
}

// ---------------------------------------------------------------------------------------------
// Setup

export function monsterDerived(m: MonsterDef): DerivedStats {
  return {
    maxHp: m.hp,
    maxMp: m.mp,
    atk: m.atk,
    matk: m.matk,
    def: m.def,
    mdef: m.mdef,
    crit: 0.05,
    evasion: m.evasion,
    speed: m.speed,
    moveSpeed: 1,
    healPower: 1,
    dropRate: 1,
    carryWeight: 0,
  };
}

/** Boss ATK scaled to party size: solo players face 60% + 40% × hpScale. */
export function bossAtkScale(monsterId: string, partySize: number): number {
  return 0.6 + 0.4 * bossHpScale(monsterId, partySize);
}

/** Boss HP scaled to party size (MASTER_SPEC §10). World bosses are never scaled. */
export function bossHpScale(monsterId: string, partySize: number): number {
  const boss = MONSTERS[monsterId]?.boss;
  if (!boss || boss.worldBoss) return 1;
  // Baseline is one more than the recommended max so a solo player sees ~1/4 HP.
  return Math.min(1, Math.max(0.2, partySize / (boss.recommendedParty[1] + 1)));
}

function makeMonsterUnit(monsterId: string, id: string, hp?: number, hpScale = 1, atkScale = 1): Unit {
  const m = MONSTERS[monsterId];
  if (!m) throw new Error(`Unknown monster ${monsterId}`);
  const base = monsterDerived(m);
  base.maxHp = Math.round(base.maxHp * hpScale);
  base.atk = Math.round(base.atk * atkScale);
  base.matk = Math.round(base.matk * atkScale);
  return {
    id,
    side: 'ENEMY',
    name: m.nameTh,
    sprite: m.sprite,
    level: m.level,
    classId: null,
    mutation: null,
    monsterId,
    isBoss: !!m.boss,
    element: m.element,
    base,
    hp: Math.min(base.maxHp, hp ?? base.maxHp),
    mp: base.maxMp,
    gauge: 0,
    turns: 0,
    skills: ['basic_attack'],
    cooldowns: {},
    statuses: [],
    buffs: [],
    evasionStacks: [],
    manaShield: null,
    absorb: null,
    invulnerable: 0,
    flags: { ironWallUsed: false, miracleUsed: false, ultimateBlockUsed: false },
    controller: 'AUTO',
  };
}

export function createBattle(setup: BattleSetup, seed: number): Battle {
  const rng = createRng(seed);
  const players: Unit[] = setup.players.map((p) => ({
    id: p.id,
    side: 'PLAYER',
    name: p.name,
    sprite: p.sprite,
    level: p.level,
    classId: p.classId,
    mutation: p.mutation,
    monsterId: null,
    isBoss: false,
    element: 'NEUTRAL',
    base: p.derived,
    hp: Math.min(p.derived.maxHp, p.hp ?? p.derived.maxHp),
    mp: Math.min(p.derived.maxMp, p.mp ?? p.derived.maxMp),
    gauge: rng() * 40,
    turns: 0,
    skills: classSkills(p.classId),
    cooldowns: {},
    statuses: [],
    buffs: [],
    evasionStacks: [],
    manaShield: null,
    absorb: null,
    invulnerable: 0,
    flags: { ironWallUsed: false, miracleUsed: false, ultimateBlockUsed: false },
    controller: p.controller,
  }));
  const enemies = setup.enemies.map((e, i) => {
    const u = makeMonsterUnit(e.monsterId, `e${i}`, e.hp, e.hpScale, e.atkScale);
    u.gauge = rng() * 30;
    return u;
  });
  const threat: Battle['threat'] = {};
  for (const e of enemies) threat[e.id] = {};
  return {
    seed,
    rng,
    tick: 0,
    units: [...players, ...enemies],
    items: { ...(setup.items ?? {}) },
    itemCooldown: 0,
    env: setup.env ?? {},
    canFlee: setup.canFlee ?? true,
    threat,
    events: [],
    log: [],
    awaiting: null,
    result: 'ONGOING',
    summonCounter: 0,
  };
}

function classSkills(classId: ClassId): string[] {
  return CLASSES[classId].skills.filter((s) => SKILLS[s]?.kind === 'ACTIVE');
}

// ---------------------------------------------------------------------------------------------
// Queries

const now = (b: Battle) => Math.round(b.tick * TICK * 10) / 10;
export const alive = (u: Unit) => u.hp > 0;
export const unitsOf = (b: Battle, side: Side) => b.units.filter((u) => u.side === side && alive(u));
export const getUnit = (b: Battle, id: string) => b.units.find((u) => u.id === id);
const hasStatus = (u: Unit, s: StatusId) => u.statuses.some((x) => x.id === s);

export function stat(u: Unit, key: keyof DerivedStats): number {
  let v = u.base[key];
  let pct = 0;
  for (const b of u.buffs) pct += b.pct[key] ?? 0;
  v *= 1 + pct;
  if (key === 'speed') {
    const slow = u.statuses.find((s) => s.id === 'SLOW');
    if (slow) v *= 1 - slow.potency;
  }
  if (key === 'evasion') {
    v += u.evasionStacks.length * 0.04;
    v = Math.min(u.mutation === 'PURE_SPEED' ? 0.85 : 0.6, v);
    if (u.mutation === 'PURE_MAGE') v = 0;
  }
  return v;
}

function isRanged(u: Unit, skillId: string): boolean {
  return u.classId === 'RANGER' || skillId === 'snipe_shot';
}

export function skillMpCost(u: Unit, skill: SkillDef): number {
  const mult = u.mutation === 'PURE_MAGE' ? 3 : u.mutation === 'PURE_STRENGTH' ? 2 : 1;
  return skill.mp * mult;
}

function skillCooldown(u: Unit, skill: SkillDef): number {
  if (u.mutation === 'PURE_MAGE') return 0;
  const isMagic = skill.effects.some((e) => e.kind === 'DAMAGE' && e.type === 'MAGIC');
  return u.classId === 'SORCERER' && isMagic ? skill.cooldown * 0.85 : skill.cooldown;
}

export function canUseSkill(u: Unit, skillId: string): boolean {
  const skill = SKILLS[skillId];
  if (!skill || skill.kind !== 'ACTIVE' || !u.skills.includes(skillId)) return false;
  return (u.cooldowns[skillId] ?? 0) <= 0 && u.mp >= skillMpCost(u, skill);
}

// ---------------------------------------------------------------------------------------------
// Simulation

/**
 * Runs the clock until a manual unit must choose, the battle ends, or `maxTicks` clock ticks
 * have elapsed (the client passes a small budget each frame to animate in real time).
 */
export function advance(b: Battle, maxTicks = Infinity): Battle {
  let ticks = 0;
  while (b.result === 'ONGOING' && !b.awaiting && b.tick < MAX_TICKS && ticks < maxTicks) {
    const ready = b.units
      .filter((u) => alive(u) && u.gauge >= GAUGE_FULL)
      .sort((x, y) => y.gauge - x.gauge || x.id.localeCompare(y.id));
    const actor = ready[0];
    if (actor) {
      if (actor.controller === 'MANUAL') {
        b.awaiting = actor.id;
        return b;
      }
      execute(b, actor.side === 'PLAYER' ? autoCommand(b, actor.id) : null, actor);
      checkEnd(b);
      continue;
    }
    step(b);
    ticks++;
    checkEnd(b);
  }
  if (b.result === 'ONGOING' && b.tick >= MAX_TICKS) end(b, 'LOSE');
  return b;
}

/** Applies the awaiting unit's command. Throws on an invalid command. */
export function command(b: Battle, cmd: Command): Battle {
  if (b.result !== 'ONGOING') throw new Error('Battle is over');
  if (cmd.unitId !== b.awaiting) throw new Error(`Not ${cmd.unitId}'s turn`);
  const u = getUnit(b, cmd.unitId);
  if (!u) throw new Error('Unknown unit');
  if (cmd.type === 'SKILL' && !canUseSkill(u, cmd.skillId)) throw new Error('Skill not ready');
  if (cmd.type === 'ITEM' && (!(b.items[cmd.itemId] ?? 0) || b.itemCooldown > 0)) throw new Error('Item not available');
  b.awaiting = null;
  execute(b, cmd, u);
  checkEnd(b);
  return b;
}

/** Replays a finished battle for server-side verification. */
export function replay(setup: BattleSetup, seed: number, commands: Command[]): Battle {
  const b = createBattle(setup, seed);
  advance(b);
  for (const c of commands) {
    if (b.result !== 'ONGOING') break;
    command(b, c);
    advance(b);
  }
  return b;
}

function step(b: Battle) {
  b.tick++;
  b.itemCooldown = Math.max(0, b.itemCooldown - TICK);
  for (const u of b.units) {
    if (!alive(u)) continue;
    for (const k of Object.keys(u.cooldowns)) u.cooldowns[k] = Math.max(0, (u.cooldowns[k] ?? 0) - TICK);
    u.invulnerable = Math.max(0, u.invulnerable - TICK);
    if (u.manaShield && (u.manaShield.remaining -= TICK) <= 0) u.manaShield = null;
    if (u.absorb && (u.absorb.remaining -= TICK) <= 0) u.absorb = null;
    u.buffs = u.buffs.filter((x) => (x.remaining -= TICK) > 0);
    u.evasionStacks = u.evasionStacks.map((s) => s - TICK).filter((s) => s > 0);

    for (const s of u.statuses) {
      s.remaining -= TICK;
      s.acc += TICK;
      // DoTs tick once per whole second.
      if ((s.id === 'POISON' || s.id === 'BLEED') && s.acc >= 1 - 1e-9) {
        s.acc -= 1;
        const amount =
          s.id === 'POISON'
            ? Math.max(1, Math.round(u.base.maxHp * (u.isBoss ? Math.min(0.01, s.potency) : s.potency)))
            : Math.round(s.potency);
        b.events.push({ t: now(b), type: 'DOT', target: u.id, amount, status: s.id });
        applyDamage(b, getUnit(b, s.sourceId) ?? u, u, amount, 'TRUE');
        if (!alive(u)) break;
      }
    }
    u.statuses = u.statuses.filter((s) => s.remaining > 0);
    if (!alive(u)) continue;
    if (hasStatus(u, 'STUN') || hasStatus(u, 'ROOT')) continue;
    u.gauge += stat(u, 'speed') * TICK;
  }
}

function checkEnd(b: Battle) {
  if (b.result !== 'ONGOING') return;
  if (unitsOf(b, 'ENEMY').length === 0) end(b, 'WIN');
  else if (unitsOf(b, 'PLAYER').length === 0) end(b, 'LOSE');
}

function end(b: Battle, result: BattleResult) {
  b.result = result;
  b.awaiting = null;
  b.events.push({ t: now(b), type: 'END', result });
}

// ---------------------------------------------------------------------------------------------
// Actions

function execute(b: Battle, cmd: Command | null, actor: Unit) {
  actor.gauge = 0;
  actor.turns++;
  if (cmd) b.log.push(cmd);

  if (actor.side === 'ENEMY') return enemyTurn(b, actor);
  if (!cmd) return;

  if (cmd.type === 'FLEE') {
    const bossFight = unitsOf(b, 'ENEMY').some((e) => e.isBoss);
    const success = b.canFlee && !bossFight && b.rng() < 0.5;
    b.events.push({ t: now(b), type: 'FLEE', unit: actor.id, success });
    if (success) end(b, 'FLED');
    return;
  }

  if (cmd.type === 'ITEM') {
    const item = CONSUMABLES[cmd.itemId];
    const target = (cmd.targetId && getUnit(b, cmd.targetId)) || actor;
    b.items[cmd.itemId] = (b.items[cmd.itemId] ?? 0) - 1;
    b.itemCooldown = item?.cooldown ?? 0;
    b.events.push({ t: now(b), type: 'ACT', unit: actor.id, skill: `item:${cmd.itemId}` });
    if (item?.kind === 'HEAL_HP') heal(b, actor, target, item.amount);
    if (item?.kind === 'HEAL_MP') target.mp = Math.min(target.base.maxMp, target.mp + item.amount);
    return;
  }

  const skill = SKILLS[cmd.skillId];
  if (!skill) return;
  actor.mp -= skillMpCost(actor, skill);
  const cd = skillCooldown(actor, skill);
  if (cd > 0) actor.cooldowns[skill.id] = cd;
  b.events.push({ t: now(b), type: 'ACT', unit: actor.id, skill: skill.id });

  const targets = resolveTargets(b, actor, skill, cmd.targetId);
  for (const effect of skill.effects) {
    for (const [i, target] of targets.entries()) {
      if (!alive(target) && effect.kind !== 'HEAL') continue;
      applyEffect(b, actor, target, effect, skill, i);
    }
  }
}

function resolveTargets(b: Battle, actor: Unit, skill: SkillDef, targetId?: string): Unit[] {
  const foes = unitsOf(b, actor.side === 'PLAYER' ? 'ENEMY' : 'PLAYER');
  const allies = unitsOf(b, actor.side);
  switch (skill.target) {
    case 'SELF':
      return [actor];
    case 'ALL_ALLIES':
      return allies;
    case 'ALL_ENEMIES':
      return foes;
    case 'ENEMY': {
      const primary = foes.find((f) => f.id === targetId) ?? foes[0];
      return primary ? [primary] : [];
    }
  }
}

function applyEffect(b: Battle, actor: Unit, target: Unit, effect: SkillEffect, skill: SkillDef, _index: number) {
  switch (effect.kind) {
    case 'DAMAGE': {
      hit(b, actor, target, effect, skill.id, 1);
      if (effect.chain) {
        const others = unitsOf(b, target.side).filter((u) => u.id !== target.id);
        for (let j = 0; j < Math.min(effect.chain.jumps, others.length); j++) {
          const next = others[j];
          if (next) hit(b, actor, next, effect, skill.id, 1 - effect.chain.falloff * (j + 1));
        }
      }
      break;
    }
    case 'HEAL': {
      const raw = sumScaling(actor, effect.scaling) + (effect.flat ?? 0);
      heal(b, actor, target, raw * stat(actor, 'healPower'));
      break;
    }
    case 'STATUS':
      if (effect.chance === undefined || b.rng() < effect.chance) {
        addStatus(b, actor, target, effect.status, effect.seconds, effect.potency ?? 0);
      }
      break;
    case 'BUFF':
      target.buffs.push({ pct: effect.pct, remaining: effect.seconds });
      break;
    case 'MANA_SHIELD':
      target.manaShield = { ratio: effect.ratio, remaining: effect.seconds };
      break;
  }
}

function sumScaling(u: Unit, scaling: Partial<Record<keyof DerivedStats, number>>): number {
  let total = 0;
  for (const [k, v] of Object.entries(scaling)) total += stat(u, k as keyof DerivedStats) * (v ?? 0);
  return total;
}

const ELEMENT_WEAKNESS: Partial<Record<Element, Element>> = {
  FIRE: 'EARTH',
  WATER: 'FIRE',
  LIGHTNING: 'WATER',
  EARTH: 'LIGHTNING',
  HOLY: 'SHADOW',
  SHADOW: 'HOLY',
};

function elementMult(b: Battle, attack: Element, defender: Element): number {
  let m = b.env.elementBoost?.[attack] ?? 1;
  if (ELEMENT_WEAKNESS[attack] === defender) m *= 1.5;
  if (ELEMENT_WEAKNESS[defender] === attack) m *= 0.75;
  return m;
}

function hit(
  b: Battle,
  actor: Unit,
  target: Unit,
  effect: Extract<SkillEffect, { kind: 'DAMAGE' }>,
  skillId: string,
  falloff: number,
) {
  const element = effect.element ?? 'NEUTRAL';

  if (effect.type === 'PHYSICAL' && b.rng() < stat(target, 'evasion')) {
    b.events.push({ t: now(b), type: 'MISS', source: actor.id, target: target.id });
    if (target.skills.includes('evasion_mastery') || target.classId === 'ASSASSIN') {
      if (target.evasionStacks.length < 5) target.evasionStacks.push(5);
    }
    return;
  }

  // Pure Strength: 15% to obliterate a non-boss enemy with a physical hit.
  if (actor.mutation === 'PURE_STRENGTH' && effect.type === 'PHYSICAL' && !target.isBoss && b.rng() < 0.15) {
    b.events.push({ t: now(b), type: 'DAMAGE', source: actor.id, target: target.id, amount: target.hp, crit: true, element });
    applyDamage(b, actor, target, target.hp, 'TRUE');
    return;
  }

  let raw = (sumScaling(actor, effect.scaling) + (effect.flat ?? 0)) * falloff;
  const ranged = isRanged(actor, skillId);
  if (actor.mutation === 'PURE_DEX' && effect.type === 'PHYSICAL' && !ranged) raw = 1;
  if (actor.mutation === 'PURE_MAGE' && effect.type === 'MAGIC') raw *= 5;
  // Pure Tank relies on the party for damage: DEF-scaling skills are cut to 20%.
  if (actor.mutation === 'PURE_TANK' && effect.type !== 'TRUE') raw *= 0.2;

  const crit =
    effect.forceCrit ||
    (actor.mutation === 'PURE_DEX' && ranged && effect.type === 'PHYSICAL') ||
    b.rng() < stat(actor, 'crit');
  if (crit) raw *= CRIT_MULT;
  raw *= elementMult(b, element, target.element);

  const amount =
    effect.type === 'TRUE'
      ? Math.max(1, Math.round(raw))
      : mitigate(raw, stat(target, effect.type === 'PHYSICAL' ? 'def' : 'mdef'));

  dealDamage(b, actor, target, amount, effect.type, crit, element);
}

/** Final damage pipeline shared by skills and boss attacks. */
function dealDamage(
  b: Battle,
  actor: Unit,
  target: Unit,
  amount: number,
  type: 'PHYSICAL' | 'MAGIC' | 'TRUE',
  crit: boolean,
  element: Element,
) {
  let dmg = amount;
  if (target.mutation === 'PURE_TANK' && type === 'PHYSICAL') {
    dmg = Math.max(1, Math.round(amount * 0.1));
    const reflect = Math.round(amount * 0.3);
    if (reflect > 0 && alive(actor)) {
      b.events.push({ t: now(b), type: 'DAMAGE', source: target.id, target: actor.id, amount: reflect, crit: false, element: 'NEUTRAL' });
      applyDamage(b, target, actor, reflect, 'TRUE');
    }
  }
  b.events.push({ t: now(b), type: 'DAMAGE', source: actor.id, target: target.id, amount: dmg, crit, element });
  applyDamage(b, actor, target, dmg, type);
}

function applyDamage(b: Battle, source: Unit, target: Unit, amount: number, _type: string) {
  if (!alive(target) || target.invulnerable > 0) return;
  let dmg = amount;

  if (target.manaShield) {
    const toMp = Math.min(target.mp, Math.round(dmg * target.manaShield.ratio));
    target.mp -= toMp;
    dmg -= toMp;
  }
  if (target.absorb) {
    const soaked = Math.min(target.absorb.amount, dmg);
    target.absorb.amount -= soaked;
    dmg -= soaked;
    if (target.absorb.amount <= 0) target.absorb = null;
  }

  if (dmg >= target.hp && target.mutation === 'PURE_LUCK' && !target.flags.miracleUsed) {
    target.flags.miracleUsed = true;
    if (b.rng() < 0.5) {
      target.hp = 1;
      target.invulnerable = 3;
      b.events.push({ t: now(b), type: 'MIRACLE', unit: target.id });
      return;
    }
  }

  target.hp = Math.max(0, target.hp - dmg);

  if (source.side === 'PLAYER' && target.side === 'ENEMY') {
    const mult = source.classId === 'KNIGHT' ? 3 : 1;
    const t = (b.threat[target.id] ??= {});
    t[source.id] = (t[source.id] ?? 0) + dmg * mult;
  }

  if (!alive(target)) {
    target.statuses = [];
    b.events.push({ t: now(b), type: 'DEATH', unit: target.id });
    return;
  }

  // Knight Iron Wall: once per battle below 30% HP.
  if (target.classId === 'KNIGHT' && !target.flags.ironWallUsed && target.hp < target.base.maxHp * 0.3) {
    target.flags.ironWallUsed = true;
    const amount = Math.round(target.base.maxHp * 0.5);
    target.absorb = { amount, remaining: 8 };
    b.events.push({ t: now(b), type: 'SHIELD', unit: target.id, amount });
  }
}

function heal(b: Battle, source: Unit, target: Unit, raw: number) {
  if (!alive(target)) return;
  const amount = Math.round(Math.min(raw, target.base.maxHp - target.hp));
  target.hp += amount;
  b.events.push({ t: now(b), type: 'HEAL', source: source.id, target: target.id, amount });
  if (source.side === 'PLAYER' && amount > 0) {
    for (const e of unitsOf(b, 'ENEMY')) {
      const t = (b.threat[e.id] ??= {});
      t[source.id] = (t[source.id] ?? 0) + amount * 1.5;
    }
  }
}

function addStatus(b: Battle, source: Unit, target: Unit, status: StatusId, seconds: number, potency: number) {
  const dur = target.isBoss && (status === 'STUN' || status === 'ROOT') ? seconds / 2 : seconds;
  target.statuses = target.statuses.filter((s) => s.id !== status);
  target.statuses.push({ id: status, remaining: dur, potency, sourceId: source.id, acc: 0 });
  b.events.push({ t: now(b), type: 'STATUS', target: target.id, status, seconds: dur });
}

// ---------------------------------------------------------------------------------------------
// AI

function enemyTarget(b: Battle, enemy: Unit): Unit | undefined {
  const players = unitsOf(b, 'PLAYER');
  const taunter = players.find((p) => hasStatus(p, 'TAUNT'));
  if (taunter) return taunter;
  const threat = b.threat[enemy.id] ?? {};
  const ranked = [...players].sort((x, y) => (threat[y.id] ?? 0) - (threat[x.id] ?? 0));
  if (ranked.length > 1 && b.rng() < 0.3) return ranked[Math.floor(b.rng() * ranked.length)];
  return ranked[0];
}

function enemyTurn(b: Battle, enemy: Unit) {
  const def = enemy.monsterId ? MONSTERS[enemy.monsterId] : undefined;
  const bossSkill = def?.boss?.skills.find((s) => enemy.turns % s.everyTurns === 0);
  if (bossSkill) return bossAttack(b, enemy, bossSkill);

  const target = enemyTarget(b, enemy);
  if (!target) return;
  b.events.push({ t: now(b), type: 'ACT', unit: enemy.id, skill: 'basic_attack' });
  const magic = enemy.base.matk > enemy.base.atk;
  hit(
    b,
    enemy,
    target,
    { kind: 'DAMAGE', type: magic ? 'MAGIC' : 'PHYSICAL', element: enemy.element, scaling: magic ? { matk: envAtk(b) } : { atk: envAtk(b) } },
    'basic_attack',
    1,
  );
}

const envAtk = (b: Battle) => b.env.enemyAtkMult ?? 1;

function bossAttack(b: Battle, boss: Unit, skill: BossSkill) {
  b.events.push({ t: now(b), type: 'ACT', unit: boss.id, skill: skill.id });
  const players = unitsOf(b, 'PLAYER');

  if (skill.ultimate) {
    const tank = players.find((p) => p.mutation === 'PURE_TANK' && !p.flags.ultimateBlockUsed);
    if (tank) {
      tank.flags.ultimateBlockUsed = true;
      b.events.push({ t: now(b), type: 'BLOCK', unit: tank.id, skill: skill.id });
      return;
    }
  }

  const targets = skill.aoe ? players : [enemyTarget(b, boss)].filter((u): u is Unit => !!u);
  for (const t of targets) {
    if (t.mutation === 'PURE_SPEED' && b.rng() < 0.5) {
      b.events.push({ t: now(b), type: 'MISS', source: boss.id, target: t.id });
      continue;
    }
    const raw = boss.base.atk * skill.damageScale * envAtk(b) * elementMult(b, boss.element, t.element);
    dealDamage(b, boss, t, mitigate(raw, stat(t, 'def')), 'PHYSICAL', false, boss.element);
    if (skill.status && alive(t)) addStatus(b, boss, t, skill.status.status, skill.status.seconds, skill.status.potency ?? 0);
  }

  if (skill.summons) {
    const aliveSummons = unitsOf(b, 'ENEMY').filter((u) => !u.isBoss).length;
    const n = Math.min(skill.summons.count, MAX_SUMMONS_ALIVE - aliveSummons);
    for (let i = 0; i < n; i++) {
      const u = makeMonsterUnit(skill.summons.monsterId, `s${b.summonCounter++}`);
      b.units.push(u);
      b.threat[u.id] = {};
      b.events.push({ t: now(b), type: 'SUMMON', unit: u.id, by: boss.id });
    }
  }
}

/** Simple auto-battle policy for players (and Mercenaries). */
export function autoCommand(b: Battle, unitId: string): Command {
  const u = getUnit(b, unitId);
  if (!u) throw new Error('Unknown unit');
  const allies = unitsOf(b, u.side);
  const foes = unitsOf(b, u.side === 'PLAYER' ? 'ENEMY' : 'PLAYER');
  const usable = u.skills.filter((s) => canUseSkill(u, s)).map((s) => SKILLS[s]!);

  const hurt = allies.some((a) => a.hp < a.base.maxHp * 0.4);
  const healSkill = usable.find((s) => s.effects.some((e) => e.kind === 'HEAL'));
  if (hurt && healSkill) return { type: 'SKILL', unitId, skillId: healSkill.id };

  if (u.hp < u.base.maxHp * 0.3 && (b.items['red_potion'] ?? 0) > 0 && b.itemCooldown <= 0) {
    return { type: 'ITEM', unitId, itemId: 'red_potion' };
  }

  const boss = foes.find((f) => f.isBoss);
  const target = boss ?? [...foes].sort((x, y) => x.hp - y.hp)[0];
  const attack = usable
    .filter((s) => s.id !== 'basic_attack' && s.effects.some((e) => e.kind === 'DAMAGE'))
    .sort((x, y) => y.mp - x.mp)[0];
  const buff = usable.find((s) => s.effects.some((e) => e.kind === 'BUFF' || e.kind === 'MANA_SHIELD'));
  // Must not consume battle RNG: manual commands are replayed without calling this.
  if (buff && u.turns % 3 === 0) return { type: 'SKILL', unitId, skillId: buff.id };
  return { type: 'SKILL', unitId, skillId: attack?.id ?? 'basic_attack', targetId: target?.id };
}
