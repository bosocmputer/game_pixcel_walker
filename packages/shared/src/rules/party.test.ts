import { describe, expect, it } from 'vitest';
import {
  PARTY_RANGE_M,
  computeDerived,
  createDungeon,
  isolatedMembers,
  nextWave,
  partyFieldHpScale,
  runToEnd,
  statsFromDerived,
  totalStats,
  type UnitSetup,
} from '../index';

// ~0.0009° latitude ≈ 100 m
const at = (id: string, metersNorth: number) => ({ id, lat: 18.7877 + metersNorth / 111_320, lng: 98.9931 });

describe('party leash', () => {
  it('keeps everyone when the party is together', () => {
    expect(isolatedMembers([at('a', 0), at('b', 150), at('c', 300)])).toEqual([]); // c is near b
  });

  it('drops the member who wandered away from everyone', () => {
    expect(isolatedMembers([at('a', 0), at('b', 50), at('c', PARTY_RANGE_M + 100)])).toEqual(['c']);
  });

  it('a pair that splits up are both isolated', () => {
    expect(isolatedMembers([at('a', 0), at('b', 500)]).sort()).toEqual(['a', 'b']);
  });

  it('ignores members without a position and never drops a lone located member', () => {
    expect(isolatedMembers([at('a', 0), { id: 'b', lat: null, lng: null }])).toEqual([]);
  });
});

describe('co-op field fights', () => {
  it('enemy HP grows slower than party size', () => {
    expect(partyFieldHpScale(1)).toBe(1);
    expect(partyFieldHpScale(3)).toBeGreaterThan(1.5);
    expect(partyFieldHpScale(3)).toBeLessThan(3);
  });

  it('a trio beats scaled field monsters faster than a solo player beats unscaled ones', () => {
    const stats = totalStats({ str: 10, agi: 0, vit: 10, int: 0, dex: 0, luk: 0 });
    const d = computeDerived({ level: 5, classId: 'NOVICE', mutation: null, stats, gear: [{ flat: { atk: 3, def: 2 } }] });
    const hero = (id: string): UnitSetup => ({ id, name: id, row: 'FRONT', sprite: 'h', level: 5, classId: 'NOVICE', deck: ['power_smash', 'stone_throw'], autoPotion: true, items: {}, stats: statsFromDerived(d, { dex: 0, luk: 0, vit: 10 }) });
    const rounds = (n: number) => {
      let total = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const dg = createDungeon({ party: Array.from({ length: n }, (_, i) => hero(`p${i}`)), waves: [{ monsterIds: ['alley_rat', 'alley_rat'] }], seed, rollModifiers: false, enemyScale: { hp: partyFieldHpScale(n), atk: 1 }, noBossScaling: true });
        runToEnd(dg.combat);
        nextWave(dg);
        total += dg.combat.round;
      }
      return total / 60;
    };
    expect(rounds(3)).toBeLessThan(rounds(1));
  });
});
