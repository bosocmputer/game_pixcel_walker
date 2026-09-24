/** Party dungeons: personal potion bags, member state across waves, determinism, balance bands. */
import { describe, expect, it } from 'vitest';
import {
  DUNGEONS,
  DUNGEON_BY_ID,
  MONSTERS,
  computeDerived,
  createDungeon,
  memberLootSeed,
  memberState,
  nextWave,
  runToEnd,
  statsFromDerived,
  totalStats,
  type ClassId,
  type Dungeon,
  type Modifiers,
  type Stats,
  type UnitSetup,
} from '../index';

const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
const starterGear: Modifiers[] = [{ flat: { def: 2 } }, { flat: { atk: 3 } }];
const midGear: Modifiers[] = [{ flat: { atk: 45, str: 5 } }, { flat: { def: 12 } }, { flat: { agi: 8 } }];
const NOVICE_DECK = ['power_smash', 'stone_throw', 'focus', 'counter_jab'];

function unit(id: string, level: number, classId: ClassId, alloc: Partial<Stats>, gear: Modifiers[], deck = NOVICE_DECK, items?: Record<string, number>): UnitSetup {
  const stats = totalStats({ ...zero, ...alloc });
  const d = computeDerived({ level, classId, mutation: null, stats, gear });
  const back = classId === 'SORCERER' || classId === 'CLERIC' || classId === 'RANGER';
  return { id, name: id, row: back ? 'BACK' : 'FRONT', sprite: 'h', level, classId, deck, autoPotion: true, items, stats: statsFromDerived(d, { dex: stats.dex, luk: stats.luk, vit: stats.vit }) };
}

function run(d: Dungeon): Dungeon {
  do runToEnd(d.combat);
  while (nextWave(d));
  return d;
}

function clearRate(party: UnitSetup[], dungeonId: string, runs = 120): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const d = run(createDungeon({ party, waves: DUNGEON_BY_ID[dungeonId]!.waves, seed, rollModifiers: true }));
    if (d.result === 'WIN') wins++;
  }
  return wins / runs;
}

describe('dungeon data', () => {
  it('every dungeon references real monsters and ends in its hardest wave', () => {
    for (const dg of DUNGEONS) {
      for (const w of dg.waves) for (const id of w.monsterIds) expect(MONSTERS[id], `${dg.id}: ${id}`).toBeDefined();
      expect(dg.minLevel).toBeLessThanOrEqual(dg.recLevel[0]);
    }
  });
});

describe('party dungeon mechanics', () => {
  it('each member drinks only from their own potion bag', () => {
    const tank = unit('a', 5, 'NOVICE', { vit: 15 }, starterGear, NOVICE_DECK, { red_potion: 3 });
    const glass = unit('b', 5, 'NOVICE', { str: 15 }, starterGear, NOVICE_DECK, {});
    const d = run(createDungeon({ party: [tank, glass], waves: DUNGEON_BY_ID.ghost_alley!.waves, seed: 7, items: { red_potion: 99 } }));
    const drank = (id: string) => d.combat.events.filter((e) => e.type === 'ITEM' && e.unit === id).length;
    expect(drank('b')).toBe(0);
    expect(memberState(d, 'b')!.items).toEqual({});
    const a = memberState(d, 'a')!;
    expect((a.items!.red_potion ?? 0)).toBeLessThanOrEqual(3);
    expect(d.items.red_potion).toBe(99); // shared pool untouched
  });

  it('remembers a member knocked out in an earlier wave', () => {
    const weak = unit('weak', 1, 'NOVICE', {}, [], NOVICE_DECK, {});
    weak.hp = 1;
    const strong = unit('strong', 30, 'KNIGHT', { str: 40, vit: 40 }, midGear, ['power_smash', 'stone_throw']);
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      const d = createDungeon({ party: [strong, weak], waves: DUNGEON_BY_ID.ghost_alley!.waves, seed });
      runToEnd(d.combat);
      if (!d.combat.units.some((u) => u.id === 'weak' && u.hp <= 0)) continue;
      nextWave(d);
      if (d.result !== 'ONGOING') continue;
      found = true;
      expect(d.combat.units.some((u) => u.id === 'weak')).toBe(false);
      expect(memberState(d, 'weak')).toMatchObject({ hp: 0 });
      run(d);
      expect(d.result).toBe('WIN');
    }
    expect(found).toBe(true);
  });

  it('two devices simulating the same run see identical events', () => {
    const party = () => [unit('p1', 10, 'KNIGHT', { str: 20, vit: 20 }, midGear), unit('p2', 10, 'NOVICE', { str: 20 }, starterGear, NOVICE_DECK, { red_potion: 2 })];
    const a = run(createDungeon({ party: party(), waves: DUNGEON_BY_ID.goblin_backroom!.waves, seed: 4242, rollModifiers: true }));
    const b = run(createDungeon({ party: party(), waves: DUNGEON_BY_ID.goblin_backroom!.waves, seed: 4242, rollModifiers: true }));
    expect(b.combat.events).toEqual(a.combat.events);
    expect(b.result).toBe(a.result);
    expect(b.members).toEqual(a.members);
  });

  it('members roll loot from different seeds', () => {
    expect(memberLootSeed(1, 'p_a')).not.toBe(memberLootSeed(1, 'p_b'));
    expect(memberLootSeed(1, 'p_a')).toBe(memberLootSeed(1, 'p_a'));
  });
});

describe('dungeon balance', () => {
  const novice = (id: string, lv: number) => unit(id, lv, 'NOVICE', { str: lv * 2, vit: lv * 2 }, starterGear, NOVICE_DECK, { red_potion: 3 });
  const kit = { red_potion: 5, blue_elixir: 3 };
  const knight = (lv: number) => unit('k', lv, 'KNIGHT', { str: lv * 2 + 5, vit: lv * 2 + 10, agi: 10 }, midGear, ['power_smash', 'focus', 'shield_bash', 'taunt', 'guardian', 'iron_wall'], kit);
  const sorcerer = (lv: number) => unit('s', lv, 'SORCERER', { int: lv * 3, vit: lv }, midGear, ['power_smash', 'focus', 'fireball', 'chain_lightning', 'frost_nova', 'mana_shield'], kit);
  const cleric = (lv: number) => unit('c', lv, 'CLERIC', { int: lv * 2, vit: lv * 2 }, midGear, ['power_smash', 'focus', 'holy_heal', 'blessing_of_light', 'smite', 'divine_grace'], kit);

  it('Ghost Alley: a challenge solo at Lv.5, easy as a party', () => {
    const solo = clearRate([novice('a', 5)], 'ghost_alley');
    const duo = clearRate([novice('a', 5), novice('b', 5)], 'ghost_alley');
    console.log('ghost_alley solo/duo', solo, duo);
    expect(solo).toBeGreaterThan(0.4);
    expect(solo).toBeLessThan(0.95);
    expect(duo).toBeGreaterThan(0.95);
  });

  it('Goblin backroom: casters struggle solo, a pair clears it', () => {
    const solo = clearRate([sorcerer(12)], 'goblin_backroom');
    const duo = clearRate([sorcerer(12), cleric(12)], 'goblin_backroom');
    console.log('goblin_backroom sorc solo / sorc+cleric', solo, duo);
    expect(solo).toBeLessThan(0.5);
    expect(duo).toBeGreaterThan(0.9);
  });

  it('Abandoned pump: built for a party — each member adds a lot', () => {
    const solo = clearRate([knight(20)], 'abandoned_pump');
    const duo = clearRate([knight(20), cleric(20)], 'abandoned_pump');
    const trio = clearRate([knight(20), sorcerer(20), cleric(20)], 'abandoned_pump');
    console.log('abandoned_pump K / KC / KSC', solo, duo, trio);
    expect(solo).toBeLessThan(0.4);
    expect(duo).toBeGreaterThan(solo + 0.25);
    expect(trio).toBeGreaterThan(0.85);
  });
});
