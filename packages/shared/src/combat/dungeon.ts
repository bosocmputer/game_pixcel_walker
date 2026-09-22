/**
 * Multi-wave dungeons (docs/COMBAT_SPEC.md §4B): party HP/MP, statuses and cooldowns persist
 * across waves; each wave rolls an environmental modifier; supports roll recovery between waves.
 */
import { MONSTERS } from '../data/monsters';
import { createRng, type Rng } from '../rules/rng';
import { bossAtkScale, bossHpScale, createCombat, monsterSetup, type Combat } from './engine';
import type { CombatConfig, CombatUnit, UnitSetup, WaveModifier } from './types';

export const WAVE_MODIFIERS: WaveModifier[] = [
  { id: 'calm', nameTh: 'สงบ — ไม่มีผลพิเศษ' },
  { id: 'heatwave', nameTh: 'คลื่นความร้อน: สกิลไฟ +20% โอกาสทำงาน', rateBonus: { FIRE: 20 } },
  { id: 'monsoon', nameTh: 'มรสุม: สกิลน้ำ/สายฟ้า +20% โอกาสทำงาน', rateBonus: { WATER: 20, LIGHTNING: 20 } },
  { id: 'cursed', nameTh: 'ต้องสาป: การรักษา -30%', healMult: 0.7 },
  { id: 'frenzy', nameTh: 'คลุ้มคลั่ง: ศัตรู ATK +20%', enemyStatMult: { atk: 1.2, matk: 1.2 } },
  { id: 'miasma', nameTh: 'หมอกพิษ: ทุกคนเสีย 3% HP ทุกรอบ', roundDotPct: 0.03 },
  { id: 'focus', nameTh: 'สมาธิ: ทุกสกิล +10% โอกาสทำงาน', rateBonus: { ALL: 10 } },
];

/** Chance each surviving support unit restores HP between waves, and the amount. */
export const RECOVERY_CHANCE = 0.5;
export const RECOVERY_PCT = 0.15;
const SUPPORT_CLASSES = new Set(['CLERIC']);

export interface WaveDef {
  monsterIds: string[];
  /** Boss wave (party-size scaling applies). */
  boss?: boolean;
}

export interface Dungeon {
  seed: number;
  rng: Rng;
  waves: WaveDef[];
  wave: number;
  party: UnitSetup[];
  items: Record<string, number>;
  combat: Combat;
  modifiers: (WaveModifier | null)[];
  result: 'ONGOING' | 'WIN' | 'LOSE';
  defeated: string[];
  /** Fixed HP for a world boss (shared HP across visitors). */
  bossHp?: number;
  /** Per-wave round cap (e.g. a world boss attack window). */
  maxRounds?: number;
  /** Test arena: multiply every enemy's HP/ATK; skip party-size boss scaling. */
  enemyScale?: { hp: number; atk: number };
  noBossScaling?: boolean;
}

/** Waves for a landmark boss: its minion waves followed by the boss. */
export function landmarkWaves(bossId: string): WaveDef[] {
  const boss = MONSTERS[bossId]?.boss;
  const minions = (boss?.dungeonWaves ?? []).map((monsterIds) => ({ monsterIds }));
  return [...minions, { monsterIds: [bossId], boss: true }];
}

function waveConfig(d: Dungeon, index: number): CombatConfig {
  const def = d.waves[index]!;
  const partySize = d.party.length;
  const partyB = def.monsterIds.map((id, i) => {
    const isBoss = !!MONSTERS[id]?.boss;
    const scaled = isBoss && def.boss && !d.noBossScaling;
    const hpScale = (scaled ? bossHpScale(id, partySize) : 1) * (d.enemyScale?.hp ?? 1);
    const atkScale = (scaled ? bossAtkScale(id, partySize) : 1) * (d.enemyScale?.atk ?? 1);
    return monsterSetup(id, `w${index}e${i}`, { hpScale, atkScale, hp: isBoss && def.boss ? d.bossHp : undefined });
  });
  return { partyA: d.party, partyB, seed: (d.seed + index * 7919) >>> 0, items: d.items, modifier: d.modifiers[index] ?? null, maxRounds: d.maxRounds };
}

export function createDungeon(opts: {
  party: UnitSetup[];
  waves: WaveDef[];
  seed: number;
  items?: Record<string, number>;
  rollModifiers?: boolean;
  bossHp?: number;
  maxRounds?: number;
  enemyScale?: { hp: number; atk: number };
  noBossScaling?: boolean;
}): Dungeon {
  const rng = createRng(opts.seed ^ 0x5bd1e995);
  const modifiers = opts.waves.map(() => (opts.rollModifiers === false ? null : WAVE_MODIFIERS[Math.floor(rng() * WAVE_MODIFIERS.length)]!));
  const d: Dungeon = {
    seed: opts.seed,
    rng,
    waves: opts.waves,
    wave: 0,
    party: opts.party.map((p) => ({ ...p })),
    items: { ...(opts.items ?? {}) },
    combat: null as unknown as Combat,
    modifiers,
    result: 'ONGOING',
    defeated: [],
    bossHp: opts.bossHp,
    maxRounds: opts.maxRounds,
    enemyScale: opts.enemyScale,
    noBossScaling: opts.noBossScaling,
  };
  d.combat = createCombat(waveConfig(d, 0));
  d.combat.events.unshift({ type: 'WAVE', wave: 1, total: d.waves.length, modifier: modifiers[0]?.nameTh ?? null });
  return d;
}

/** Carry a unit's state into the next wave's setup. */
function persist(setup: UnitSetup, u: CombatUnit): UnitSetup {
  return {
    ...setup,
    hp: u.hp,
    mp: u.mp,
    cooldowns: { ...u.cooldowns },
    statuses: u.statuses.filter((s) => s.id !== 'TAUNTING').map((s) => ({ ...s })),
  };
}

/**
 * Call when `d.combat.result` is no longer ONGOING. On a win, records kills, rolls recovery and
 * starts the next wave (returns true); otherwise finalises the dungeon (returns false).
 */
export function nextWave(d: Dungeon): boolean {
  const c = d.combat;
  d.defeated.push(...c.units.filter((u) => u.side === 'B' && u.hp <= 0 && u.monsterId).map((u) => u.monsterId!));
  d.items = { ...c.items };
  if (c.result !== 'WIN') {
    d.result = 'LOSE';
    return false;
  }
  const survivors = c.units.filter((u) => u.side === 'A');
  d.party = d.party
    .map((setup) => {
      const u = survivors.find((x) => x.id === setup.id);
      return u && u.hp > 0 ? persist(setup, u) : null;
    })
    .filter((x): x is UnitSetup => !!x);

  if (d.wave + 1 >= d.waves.length) {
    d.result = 'WIN';
    return false;
  }

  // Post-battle recovery rolls from support units.
  const recoverEvents: Combat['events'] = [];
  const healers = d.party.filter((p) => p.classId && SUPPORT_CLASSES.has(p.classId)).length;
  for (let i = 0; i < healers; i++) {
    if (d.rng() >= RECOVERY_CHANCE) continue;
    for (const p of d.party) {
      const amount = Math.round(p.stats.maxHp * RECOVERY_PCT);
      p.hp = Math.min(p.stats.maxHp, (p.hp ?? p.stats.maxHp) + amount);
      recoverEvents.push({ type: 'RECOVER', unit: p.id, amount });
    }
  }

  d.wave++;
  d.combat = createCombat(waveConfig(d, d.wave));
  d.combat.events.unshift(
    { type: 'WAVE', wave: d.wave + 1, total: d.waves.length, modifier: d.modifiers[d.wave]?.nameTh ?? null },
    ...recoverEvents,
  );
  return true;
}
