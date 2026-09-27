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
  const knight = (lv: number) => unit('k', lv, 'KNIGHT', { str: lv * 2 + 5, vit: lv * 2 + 10, agi: 10 }, midGear, ['power_smash', 'rend_power', 'rend_speed', 'rend_magick', 'taunt', 'parry'], kit);
  const sorcerer = (lv: number) => unit('s', lv, 'SORCERER', { int: lv * 3, vit: lv }, midGear, ['power_smash', 'fire', 'firaga', 'thunder', 'blizzaga', 'magick_counter'], kit);
  const cleric = (lv: number) => unit('c', lv, 'CLERIC', { int: lv * 2, vit: lv * 2 }, midGear, ['power_smash', 'cure', 'curaga', 'raise', 'protect', 'holy'], kit);

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

  it('Time Mage: struggles alone, speeds a partner up (goblin backroom solo, abandoned pump with a Knight)', () => {
    const tm = (lv: number) => unit('tm', lv, 'TIME_MAGE', { int: lv * 3, agi: 12, vit: lv }, midGear, ['power_smash', 'haste', 'hastega', 'stop', 'quick', 'graviga'], kit);
    const solo = clearRate([tm(12)], 'goblin_backroom');
    const k = clearRate([knight(20)], 'abandoned_pump');
    const duo = clearRate([knight(20), tm(20)], 'abandoned_pump');
    console.log('TimeMage goblin solo / pump Knight / pump Knight+TimeMage', solo, k, duo);
    expect(solo).toBeLessThan(0.5);
    expect(duo).toBeGreaterThan(k + 0.25);
  });

  it('Summoner: casters struggle solo, a pair with a Knight clears far more', () => {
    const sm = (lv: number) => unit('sm', lv, 'SUMMONER', { int: lv * 3, vit: lv }, midGear, ['power_smash', 'moogle', 'shiva', 'ramuh', 'ifrit', 'bahamut'], kit);
    const solo = clearRate([sm(12)], 'goblin_backroom');
    const duo = clearRate([knight(20), sm(20)], 'abandoned_pump');
    console.log('Summoner goblin solo / pump Knight+Summoner', solo, duo);
    expect(solo).toBeLessThan(0.5);
    expect(duo).toBeGreaterThan(0.45);
  });

  it('Bard: weak alone, lifts a Knight a lot', () => {
    const bard = (lv: number) => unit('b', lv, 'BARD', { int: lv * 2, vit: lv * 2 }, midGear, ['power_smash', 'seraph_song', 'lifes_anthem', 'rousing_melody', 'battle_chant', 'soothing_tune'], kit);
    const solo = clearRate([bard(12)], 'goblin_backroom');
    const k = clearRate([knight(20)], 'abandoned_pump');
    const duo = clearRate([knight(20), bard(20)], 'abandoned_pump');
    console.log('Bard goblin solo / pump Knight / Knight+Bard', solo, k, duo);
    expect(solo).toBeLessThan(0.5);
    expect(duo).toBeGreaterThan(k + 0.25);
  });

  it('Dancer: weak alone, hexes the pump for a Knight', () => {
    const dancer = (lv: number) => unit('dn', lv, 'DANCER', { agi: lv * 2, int: lv, vit: lv * 2 }, midGear, ['power_smash', 'mincing_minuet', 'polka', 'slow_dance', 'forbidden_dance', 'heartbreak'], kit);
    const solo = clearRate([dancer(12)], 'goblin_backroom');
    const k = clearRate([knight(20)], 'abandoned_pump');
    const duo = clearRate([knight(20), dancer(20)], 'abandoned_pump');
    console.log('Dancer goblin solo / pump Knight / Knight+Dancer', solo, k, duo);
    expect(solo).toBeLessThan(0.5);
    expect(duo).toBeGreaterThan(k + 0.2);
  });

  it('Abandoned pump: the new melee classes cannot solo it either (FFT Monk, Thief, Geomancer, Dragoon, Samurai, Ninja)', () => {
    const monk = unit('m', 20, 'MONK', { str: 45, vit: 50, agi: 10 }, midGear, ['power_smash', 'pummel', 'aurablast', 'chakra', 'purification', 'first_strike'], kit);
    const geo = unit('g', 20, 'GEOMANCER', { str: 35, int: 30, vit: 35 }, midGear, ['power_smash', 'tanglevine', 'sinkhole', 'sandstorm', 'snowstorm', 'natures_wrath'], kit);
    const dragoon = unit('d', 20, 'DRAGOON', { str: 45, vit: 50, agi: 10 }, midGear, ['power_smash', 'stone_throw', 'jump', 'dragons_faith', 'dragonheart', 'counter_jab'], kit);
    const samurai = unit('sa', 20, 'SAMURAI', { str: 45, vit: 40, luk: 20 }, midGear, ['power_smash', 'stone_throw', 'kotetsu', 'osafune', 'ama_no_murakumo', 'shirahadori'], kit);
    const ninja = unit('n', 20, 'NINJA', { str: 35, agi: 45, dex: 15, vit: 25 }, midGear, ['power_smash', 'shuriken', 'bomb', 'shadow_clone', 'ninja_vanish', 'kawarimi'], kit);
    const thief = unit('t', 20, 'ASSASSIN', { str: 40, agi: 45, vit: 30 }, midGear, ['power_smash', 'steal_gil', 'vanish', 'steal_heart', 'double_attack', 'perfect_dodge'], kit);
    const m = clearRate([monk], 'abandoned_pump');
    const t = clearRate([thief], 'abandoned_pump');
    const g = clearRate([geo], 'abandoned_pump');
    const sa = clearRate([samurai], 'abandoned_pump');
    const sc = clearRate([samurai, cleric(20)], 'abandoned_pump');
    console.log('abandoned_pump Samurai / Samurai+Cleric', sa, sc);
    expect(sa).toBeLessThan(0.4);
    const nj = clearRate([ninja], 'abandoned_pump');
    const nc = clearRate([ninja, cleric(20)], 'abandoned_pump');
    console.log('abandoned_pump Ninja / Ninja+Cleric', nj, nc);
    expect(nj).toBeLessThan(0.4);
    const dr = clearRate([dragoon], 'abandoned_pump');
    const dc = clearRate([dragoon, cleric(20)], 'abandoned_pump');
    console.log('abandoned_pump Dragoon / Dragoon+Cleric', dr, dc);
    expect(dr).toBeLessThan(0.4);
    expect(dc).toBeGreaterThan(dr + 0.2);
    const mc = clearRate([monk, cleric(20)], 'abandoned_pump');
    console.log('abandoned_pump Monk / Thief / Geomancer / Monk+Cleric', m, t, g, mc);
    expect(m).toBeLessThan(0.4);
    expect(g).toBeLessThan(0.4);
    expect(t).toBeLessThan(0.4);
    expect(mc).toBeGreaterThan(m + 0.25);
  });
});
