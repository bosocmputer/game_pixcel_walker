/** Story/world rules: ranks, gates on new places, services, daily hunting quests (docs/STORY.md). */
import { describe, expect, it } from 'vitest';
import {
  LANDMARK_BOSS,
  MONSTERS,
  computeDerived,
  createDungeon,
  dailyBonusReady,
  dailyReward,
  dayKey,
  ensureDaily,
  gateRank,
  hospitalCost,
  junkValue,
  landmarkWaves,
  nextWave,
  rankOf,
  recordBattle,
  rollDaily,
  runToEnd,
  sellPrice,
  shopForLandmark,
  statsFromDerived,
  totalStats,
  type ClassId,
  type DailyState,
  type Modifiers,
  type Stats,
  type UnitSetup,
} from '../index';

describe('ranks', () => {
  it('are a label every 10 levels, E to S', () => {
    expect(rankOf(1)).toBe('E');
    expect(rankOf(9)).toBe('E');
    expect(rankOf(10)).toBe('D');
    expect(rankOf(29)).toBe('C');
    expect(rankOf(33)).toBe('B');
    expect(rankOf(50)).toBe('S');
  });

  it('gate rank comes from the boss level; services have no gate', () => {
    expect(gateRank('CONVENIENCE')).toBe('D');
    expect(gateRank('STATION')).toBe('C');
    expect(gateRank('MUSEUM')).toBe('B');
    expect(gateRank('HOSPITAL')).toBeNull();
    expect(gateRank('SANCTUARY')).toBeNull();
    expect(LANDMARK_BOSS.MARKET).toBeUndefined();
  });
});

describe('world places', () => {
  it('the market buys junk for more, and it is still a loss to buy potions to resell', () => {
    const market = shopForLandmark('MARKET')!;
    expect(market.junkBonus).toBeGreaterThan(1);
    expect(sellPrice('crab_shell', undefined, market.junkBonus)).toBeGreaterThan(sellPrice('crab_shell'));
    expect(junkValue({ slime_goo: 10 }, market.junkBonus)).toBe(40);
  });

  it('hospital care gets pricier with level but stays affordable', () => {
    expect(hospitalCost(1)).toBeLessThan(hospitalCost(30));
    expect(hospitalCost(30)).toBeLessThan(MONSTERS.moat_python!.gold[1] * 3);
  });
});

describe('daily quests', () => {
  const day = dayKey(new Date(2026, 8, 24));

  it('three hunting quests per day, the same for everyone that day, none about walking', () => {
    const a = rollDaily(day, 12);
    expect(a.quests).toHaveLength(3);
    expect(a.quests[0]!.kind).toBe('KILL');
    expect(rollDaily(day, 12)).toEqual(a);
    expect(dayKey(new Date(2026, 8, 24, 23, 59))).toBe('2026-09-24');
  });

  it('keeps progress during the day and resets on the next one', () => {
    const s = rollDaily(day, 5);
    expect(ensureDaily(s, day, 5)).toBe(s);
    expect(ensureDaily(s, '2026-09-25', 5).day).toBe('2026-09-25');
    expect(ensureDaily(undefined, day, 5).quests).toHaveLength(3);
  });

  it('counts kills, stronger foes, gates and junk from won fights', () => {
    let s: DailyState = { day, bonusClaimed: false, quests: [
      { kind: 'KILL' as const, target: 3, progress: 0, claimed: false },
      { kind: 'STRONG' as const, target: 1, progress: 0, claimed: false },
      { kind: 'LOOT' as const, target: 3, progress: 0, claimed: false },
    ] };
    const r1 = recordBattle(s, { defeated: ['pixel_slime', 'alley_rat'], playerLevel: 3, gateCleared: false, loot: { slime_goo: 2, red_potion: 1 } });
    s = r1.state;
    expect(s.quests.map((q) => q.progress)).toEqual([2, 1, 2]);
    expect(r1.completed.map((q) => q.kind)).toEqual(['STRONG']);
    const r2 = recordBattle(s, { defeated: ['training_dummy', 'street_pigeon', 'street_pigeon'], playerLevel: 3, gateCleared: false, loot: { pigeon_feather: 5 } });
    expect(r2.state.quests.map((q) => q.progress)).toEqual([3, 1, 3]);
    expect(r2.completed.map((q) => q.kind)).toEqual(['KILL', 'LOOT']);
  });

  it('pays a slice of the EXP bar per quest and a bonus once all three are claimed', () => {
    expect(dailyReward(10).exp).toBeGreaterThan(dailyReward(2).exp);
    const s = rollDaily(day, 5);
    expect(dailyBonusReady(s)).toBe(false);
    expect(dailyBonusReady({ ...s, quests: s.quests.map((q) => ({ ...q, claimed: true })) })).toBe(true);
  });
});

// --- New gate bosses are beatable by the party size the story recommends ---------------------
const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
const gear: Modifiers[] = [{ flat: { atk: 58, str: 4, def: 6 } }, { flat: { def: 26, vit: 4, maxHp: 60 } }, { flat: { def: 20, mdef: 8 } }];
const kit = { red_potion: 5, blue_elixir: 3 };
function unit(id: string, level: number, classId: ClassId, alloc: Partial<Stats>, deck: string[]): UnitSetup {
  const stats = totalStats({ ...zero, ...alloc });
  const d = computeDerived({ level, classId, mutation: null, stats, gear });
  const back = classId === 'SORCERER' || classId === 'CLERIC';
  return { id, name: id, row: back ? 'BACK' : 'FRONT', sprite: 'h', level, classId, deck, autoPotion: true, items: { ...kit }, stats: statsFromDerived(d, { dex: stats.dex, luk: stats.luk, vit: stats.vit }) };
}
const trio = (lv: number) => [
  unit('k', lv, 'KNIGHT', { str: lv * 2 + 5, vit: lv * 2 + 10, agi: 10 }, ['quick_strike', 'first_aid', 'shield_bash', 'taunt', 'guardian', 'iron_wall']),
  unit('s', lv, 'SORCERER', { int: lv * 3, vit: lv }, ['fireball', 'chain_lightning', 'frost_nova', 'mana_shield', 'focus', 'first_aid']),
  unit('c', lv, 'CLERIC', { int: lv * 2, vit: lv * 2 }, ['holy_heal', 'blessing_of_light', 'smite', 'divine_grace', 'first_aid', 'quick_strike']),
];
function winRate(party: UnitSetup[], bossId: string, runs = 100): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const d = createDungeon({ party, waves: landmarkWaves(bossId), seed, rollModifiers: true });
    do runToEnd(d.combat);
    while (nextWave(d));
    if (d.result === 'WIN') wins++;
  }
  return wins / runs;
}

describe('new gate bosses', () => {
  it('Phantom Stationmaster: a Lv.22 trio usually wins, a lone Knight rarely', () => {
    const solo = winRate([trio(22)[0]!], 'phantom_stationmaster');
    const party = winRate(trio(22), 'phantom_stationmaster');
    console.log('stationmaster solo / trio', solo, party);
    expect(solo).toBeLessThan(0.5);
    expect(party).toBeGreaterThan(0.7);
  });

  it('Relic Guardian: a Lv.33 trio usually wins, a lone Knight rarely', () => {
    const solo = winRate([trio(33)[0]!], 'relic_colossus');
    const party = winRate(trio(33), 'relic_colossus');
    console.log('relic solo / trio', solo, party);
    expect(solo).toBeLessThan(0.5);
    expect(party).toBeGreaterThan(0.7);
  });
});
