/** Monster roster: signature skills scale with level, local bosses are beatable by a party. */
import { describe, expect, it } from 'vitest';
import {
  LANDMARK_BOSS,
  MONSTERS,
  SKILLS,
  computeDerived,
  createDungeon,
  landmarkWaves,
  monsterDeck,
  monsterSetup,
  monsterSkillSlots,
  nextWave,
  runToEnd,
  spawnPool,
  statsFromDerived,
  totalStats,
  type ClassId,
  type Modifiers,
  type Stats,
  type UnitSetup,
} from '../index';

const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
const midGear: Modifiers[] = [{ flat: { atk: 45, str: 5 } }, { flat: { def: 12 } }, { flat: { agi: 8 } }];
const kit = { red_potion: 5, blue_elixir: 3 };

function unit(id: string, level: number, classId: ClassId, alloc: Partial<Stats>, deck: string[]): UnitSetup {
  const stats = totalStats({ ...zero, ...alloc });
  const d = computeDerived({ level, classId, mutation: null, stats, gear: midGear });
  const back = classId === 'SORCERER' || classId === 'CLERIC' || classId === 'RANGER';
  return { id, name: id, row: back ? 'BACK' : 'FRONT', sprite: 'h', level, classId, deck, autoPotion: true, items: { ...kit }, stats: statsFromDerived(d, { dex: stats.dex, luk: stats.luk, vit: stats.vit }) };
}
const knight = (lv: number) => unit('k', lv, 'KNIGHT', { str: lv * 2 + 5, vit: lv * 2 + 10, agi: 10 }, ['quick_strike', 'first_aid', 'shield_bash', 'taunt', 'guardian', 'iron_wall']);
const sorcerer = (lv: number) => unit('s', lv, 'SORCERER', { int: lv * 3, vit: lv }, ['fireball', 'chain_lightning', 'frost_nova', 'mana_shield', 'focus', 'first_aid']);
const cleric = (lv: number) => unit('c', lv, 'CLERIC', { int: lv * 2, vit: lv * 2 }, ['holy_heal', 'blessing_of_light', 'smite', 'divine_grace', 'first_aid', 'quick_strike']);

function bossRate(party: UnitSetup[], bossId: string, runs = 120): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const d = createDungeon({ party, waves: landmarkWaves(bossId), seed, rollModifiers: true });
    do runToEnd(d.combat);
    while (nextWave(d));
    if (d.result === 'WIN') wins++;
  }
  return wins / runs;
}

describe('monster roster', () => {
  it('every monster skill exists and every landmark has a boss', () => {
    for (const m of Object.values(MONSTERS)) for (const id of m.deck ?? []) expect(SKILLS[id], `${m.id}: ${id}`).toBeDefined();
    for (const [kind, id] of Object.entries(LANDMARK_BOSS)) expect(MONSTERS[id]?.boss?.landmark, kind).toBe(kind);
  });

  it('higher-level monsters bring more signature skills', () => {
    expect(monsterSkillSlots(1)).toBe(1);
    expect(monsterSkillSlots(8)).toBe(2);
    expect(monsterSkillSlots(16)).toBe(3);
    expect(monsterSkillSlots(24)).toBe(4);
    expect(monsterSkillSlots(60)).toBe(4);
    expect(monsterDeck(MONSTERS.pixel_slime!)).toHaveLength(1);
    expect(monsterDeck(MONSTERS.krasue!)).toHaveLength(4);
    expect(monsterSetup('neon_bat', 'x').deck).toEqual(monsterDeck(MONSTERS.neon_bat!));
  });

  it('every field level band has a mix of monsters on every terrain', () => {
    for (const terrain of ['ROAD', 'URBAN', 'GREEN', 'WATER'] as const) {
      for (let band = 0; band < 6; band++) expect(spawnPool(terrain, band).length, `${terrain} band ${band}`).toBeGreaterThan(0);
    }
    const field = Object.values(MONSTERS).filter((m) => m.terrain && !m.boss);
    expect(field.length).toBeGreaterThanOrEqual(20);
  });
});

describe('local bosses', () => {
  it('Mall Sale Queen: tough solo, a Lv.15 pair clears it', () => {
    const solo = bossRate([knight(15)], 'sale_queen');
    const duo = bossRate([knight(15), cleric(15)], 'sale_queen');
    console.log('sale_queen K / KC', solo, duo);
    expect(solo).toBeLessThan(0.9);
    expect(duo).toBeGreaterThan(0.7);
  });

  it('Temple Yaksha: a Lv.25 trio usually passes the guardian trial', () => {
    const solo = bossRate([knight(25)], 'yaksha_guardian');
    const trio = bossRate([knight(25), sorcerer(25), cleric(25)], 'yaksha_guardian');
    console.log('yaksha K / KSC', solo, trio);
    expect(solo).toBeLessThan(0.5);
    expect(trio).toBeGreaterThan(0.75);
  });
});
