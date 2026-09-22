/**
 * Balance guardrails: Monte-Carlo win rates for typical builds. If a data change breaks
 * these bands, re-tune numbers in src/data rather than loosening the bands casually.
 */
import { describe, expect, it } from 'vitest';
import {
  advance,
  bossAtkScale,
  bossHpScale,
  computeDerived,
  createBattle,
  totalStats,
  type BattleSetup,
  type ClassId,
  type Modifiers,
  type Stats,
} from '../index';

const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };

function winRate(opts: {
  level: number;
  classId: ClassId;
  alloc: Partial<Stats>;
  gear: Modifiers[];
  enemies: BattleSetup['enemies'];
  potions?: number;
  runs?: number;
}): number {
  const runs = opts.runs ?? 200;
  const derived = computeDerived({
    level: opts.level,
    classId: opts.classId,
    mutation: null,
    stats: totalStats({ ...zero, ...opts.alloc }),
    gear: opts.gear,
  });
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const b = advance(
      createBattle(
        {
          players: [{ id: 'p', name: 'p', sprite: 'h', level: opts.level, classId: opts.classId, mutation: null, derived, controller: 'AUTO' }],
          enemies: opts.enemies,
          items: { red_potion: opts.potions ?? 0 },
        },
        seed,
      ),
    );
    if (b.result === 'WIN') wins++;
  }
  return wins / runs;
}

const starterGear: Modifiers[] = [{ flat: { def: 2 } }, { flat: { atk: 3 } }];
const midGear: Modifiers[] = [{ flat: { atk: 45, str: 5 } }, { flat: { def: 12 } }, { flat: { agi: 8 } }];
// 45 allocated points at Lv.10 (9 level-ups) + ~4 walking points
const lv10Bruiser = { str: 22, vit: 22, agi: 5 };

describe('balance', () => {
  it('Lv.1 Novice with starter gear reliably beats a slime', () => {
    expect(winRate({ level: 1, classId: 'NOVICE', alloc: {}, gear: starterGear, enemies: [{ monsterId: 'pixel_slime' }] })).toBeGreaterThan(0.95);
  });

  it('Lv.5 Novice beats two rats most of the time', () => {
    const r = winRate({ level: 5, classId: 'NOVICE', alloc: { str: 10, vit: 10 }, gear: starterGear, enemies: [{ monsterId: 'alley_rat' }, { monsterId: 'alley_rat' }] });
    expect(r).toBeGreaterThan(0.8);
  });

  it('Lv.10 solo vs Goblin King (scaled) is a real fight but winnable with potions', () => {
    const r = winRate({
      level: 10,
      classId: 'NOVICE',
      alloc: lv10Bruiser,
      gear: starterGear,
      potions: 5,
      enemies: [{ monsterId: 'goblin_king', hpScale: bossHpScale('goblin_king', 1), atkScale: bossAtkScale('goblin_king', 1) }],
    });
    console.log('Lv10 novice vs goblin king', r);
    expect(r).toBeGreaterThan(0.35);
    expect(r).toBeLessThan(0.95);
  });

  it('Lv.12 Knight with mid gear clears the Goblin King solo', () => {
    const r = winRate({
      level: 12,
      classId: 'KNIGHT',
      alloc: { str: 25, vit: 30, agi: 5 },
      gear: midGear,
      potions: 5,
      enemies: [{ monsterId: 'goblin_king', hpScale: bossHpScale('goblin_king', 1), atkScale: bossAtkScale('goblin_king', 1) }],
    });
    console.log('Lv12 knight vs goblin king', r);
    expect(r).toBeGreaterThan(0.8);
  });

  it('Lv.20 solo vs Octane Overlord (scaled) is hard but possible', () => {
    const r = winRate({
      level: 20,
      classId: 'KNIGHT',
      alloc: { str: 45, vit: 50, agi: 10 },
      gear: midGear,
      potions: 8,
      enemies: [{ monsterId: 'octane_overlord', hpScale: bossHpScale('octane_overlord', 1), atkScale: bossAtkScale('octane_overlord', 1) }],
    });
    console.log('Lv20 knight vs octane', r);
    expect(r).toBeGreaterThan(0.25);
  });
});
