/**
 * Balance guardrails: Monte-Carlo win rates for typical solo builds on the party engine.
 * If a data change breaks these bands, re-tune numbers in src/data rather than the bands.
 */
import { describe, expect, it } from 'vitest';
import {
  DECK_PRESETS,
  DECK_SIZE,
  SKILLS,
  classSkillPool,
  computeDerived,
  createDungeon,
  landmarkWaves,
  monsterSetup,
  nextWave,
  runToEnd,
  createCombat,
  statsFromDerived,
  totalStats,
  type ClassId,
  type Modifiers,
  type Stats,
  type UnitSetup,
} from '../index';

const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
const starterGear: Modifiers[] = [{ flat: { def: 2 } }, { flat: { atk: 3 } }];
const midGear: Modifiers[] = [{ flat: { atk: 45, str: 5 } }, { flat: { def: 12 } }, { flat: { agi: 8 } }];

function unit(level: number, classId: ClassId, alloc: Partial<Stats>, gear: Modifiers[], deck: string[]): UnitSetup {
  const stats = totalStats({ ...zero, ...alloc });
  const d = computeDerived({ level, classId, mutation: null, stats, gear });
  return { id: 'p', name: 'p', row: 'FRONT', sprite: 'h', level, classId, deck, autoPotion: true, stats: statsFromDerived(d, { dex: stats.dex, luk: stats.luk, vit: stats.vit }) };
}

function fieldRate(u: UnitSetup, monsters: string[], potions = 0, runs = 200): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const c = runToEnd(createCombat({ partyA: [u], partyB: monsters.map((m, i) => monsterSetup(m, `e${i}`)), seed, items: { red_potion: potions } }));
    if (c.result === 'WIN') wins++;
  }
  return wins / runs;
}

export function dungeonRate(u: UnitSetup, bossId: string, potions: number, runs = 150): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const d = createDungeon({ party: [u], waves: landmarkWaves(bossId), seed, items: { red_potion: potions } });
    do runToEnd(d.combat);
    while (nextWave(d));
    if (d.result === 'WIN') wins++;
  }
  return wins / runs;
}

const NOVICE_DECK = ['quick_strike', 'first_aid', 'lucky_dodge'];
const KNIGHT_DECK = ['quick_strike', 'first_aid', 'shield_bash', 'taunt', 'guardian', 'iron_wall'];

describe('balance', () => {
  it('Lv.1 Novice with starter gear reliably beats a slime', () => {
    expect(fieldRate(unit(1, 'NOVICE', {}, starterGear, NOVICE_DECK), ['pixel_slime'])).toBeGreaterThan(0.95);
  });

  it('Lv.5 Novice beats two rats most of the time', () => {
    expect(fieldRate(unit(5, 'NOVICE', { str: 10, vit: 10 }, starterGear, NOVICE_DECK), ['alley_rat', 'alley_rat'])).toBeGreaterThan(0.8);
  });

  it('Lv.10 Novice clears the Goblin King dungeon sometimes (real challenge)', () => {
    const r = dungeonRate(unit(10, 'NOVICE', { str: 22, vit: 22, agi: 5 }, starterGear, NOVICE_DECK), 'goblin_king', 5);
    console.log('Lv10 novice goblin dungeon', r);
    expect(r).toBeGreaterThan(0.3);
    expect(r).toBeLessThan(0.95);
  });

  it('Lv.12 Knight with mid gear clears the Goblin King dungeon', () => {
    const r = dungeonRate(unit(12, 'KNIGHT', { str: 25, vit: 30, agi: 5 }, midGear, KNIGHT_DECK), 'goblin_king', 5);
    console.log('Lv12 knight goblin dungeon', r);
    expect(r).toBeGreaterThan(0.8);
  });

  it('Lv.20 Knight vs the Octane dungeon is hard but possible', () => {
    const r = dungeonRate(unit(20, 'KNIGHT', { str: 45, vit: 50, agi: 10 }, midGear, KNIGHT_DECK), 'octane_overlord', 8);
    console.log('Lv20 knight octane dungeon', r);
    expect(r).toBeGreaterThan(0.2);
    expect(r).toBeLessThan(0.9);
  });
});

describe('Novice deck presets', () => {
  const presets = DECK_PRESETS.NOVICE ?? [];

  it('are valid decks (≤ 6 known Novice skills, no duplicates)', () => {
    expect(presets.length).toBeGreaterThanOrEqual(3);
    for (const p of presets) {
      expect(p.deck.length).toBeLessThanOrEqual(DECK_SIZE);
      expect(new Set(p.deck).size).toBe(p.deck.length);
      for (const id of p.deck) {
        expect(SKILLS[id], id).toBeDefined();
        expect(classSkillPool('NOVICE')).toContain(id);
      }
    }
  });

  it('are all viable and none dominates (Lv.10 Novice, Goblin King dungeon)', () => {
    const rates = presets.map((p) => {
      // Each preset is tested with the build it is meant for (elemental = INT).
      const alloc = p.id === 'elemental' ? { int: 24, vit: 20, str: 5 } : { str: 22, vit: 22, agi: 5 };
      const r = dungeonRate(unit(10, 'NOVICE', alloc, starterGear, p.deck), 'goblin_king', 5, 150);
      console.log(`preset ${p.id}`, r);
      return r;
    });
    for (const r of rates) expect(r).toBeGreaterThan(0.2);
    expect(Math.max(...rates) - Math.min(...rates)).toBeLessThan(0.5);
  });
});
