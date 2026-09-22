import { describe, expect, it } from 'vitest';
import {
  baseStats,
  bossHpScale,
  computeDerived,
  deathGoldLoss,
  detectMutation,
  expToNext,
  gainExp,
  marketPrice,
  summarizeWalk,
  totalStats,
  walkExp,
  walkStatPoints,
  type Stats,
  type GpsFix,
} from '../index';

const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };

describe('progression', () => {
  it('uses floor(100 * L^1.5) EXP curve', () => {
    expect(expToNext(1)).toBe(100);
    expect(expToNext(4)).toBe(800);
  });

  it('carries overflow EXP across multiple levels and grants 5 points per level', () => {
    const r = gainExp({ level: 1, exp: 0 }, 100 + 282 + 10);
    expect(r.level).toBe(3);
    expect(r.exp).toBe(10);
    expect(r.statPointsGained).toBe(10);
  });

  it('gives Novice +10% walking EXP only below Lv.10', () => {
    expect(walkExp(1000, 'NOVICE', 5)).toBe(1100);
    expect(walkExp(1000, 'NOVICE', 10)).toBe(1000);
    expect(walkExp(1000, 'KNIGHT', 5)).toBe(1000);
  });

  it('caps walking stat points at 4 per day', () => {
    expect(walkStatPoints(0, 12000)).toBe(2);
    expect(walkStatPoints(4000, 6000)).toBe(1);
    expect(walkStatPoints(0, 99999)).toBe(4);
    expect(walkStatPoints(20000, 40000)).toBe(0);
  });
});

describe('mutation', () => {
  it('requires level 20 — dumping first points into one stat is not enough', () => {
    expect(detectMutation({ ...zero, vit: 5 }, 2)).toBeNull();
  });

  it('triggers at >= 80% of allocated points', () => {
    expect(detectMutation({ ...zero, vit: 80, str: 20 }, 20)).toBe('PURE_TANK');
    expect(detectMutation({ ...zero, vit: 79, str: 21 }, 20)).toBeNull();
    expect(detectMutation({ ...zero, dex: 90, agi: 10 }, 30)).toBe('PURE_DEX');
  });
});

describe('stats', () => {
  it('Knight passive boosts DEF and HP; Pure Tank replaces it and sets ATK = 1', () => {
    const stats = totalStats({ ...zero, vit: 20 });
    const novice = computeDerived({ level: 10, classId: 'NOVICE', mutation: null, stats, gear: [] });
    const knight = computeDerived({ level: 10, classId: 'KNIGHT', mutation: null, stats, gear: [] });
    expect(knight.def).toBeGreaterThan(novice.def);
    expect(knight.maxHp).toBe(Math.round(novice.maxHp * 1.2));
    const tank = computeDerived({ level: 20, classId: 'KNIGHT', mutation: 'PURE_TANK', stats, gear: [] });
    expect(tank.atk).toBe(1);
  });

  it('applies gear flat primary stats before deriving', () => {
    const d = computeDerived({
      level: 1,
      classId: 'NOVICE',
      mutation: null,
      stats: baseStats(),
      gear: [{ flat: { str: 10, atk: 3 } }],
    });
    expect(d.atk).toBe((5 + 10) * 3 + 5 + 1 * 2 + 3);
  });
});

describe('walk validation', () => {
  const base = { lat: 18.7883, lng: 98.9853, accuracy: 10 };
  // ~0.0009 deg lat ≈ 100 m
  const trace = (dtSec: number, n: number): GpsFix[] =>
    Array.from({ length: n }, (_, i) => ({ ...base, lat: base.lat + i * 0.0009, t: i * dtSec * 1000 }));

  it('counts walking pace (100 m / 72 s ≈ 5 km/h)', () => {
    const s = summarizeWalk(trace(72, 11));
    expect(s.meters).toBeGreaterThan(950);
    expect(s.meters).toBeLessThan(1050);
    expect(s.steps).toBeGreaterThan(1200);
    expect(s.suspicious).toBe(false);
  });

  it('ignores vehicle speed (100 m / 10 s = 36 km/h)', () => {
    const s = summarizeWalk(trace(10, 11));
    expect(s.meters).toBe(0);
    expect(s.vehicleSeconds).toBeGreaterThan(90);
  });

  it('flags teleports', () => {
    const s = summarizeWalk([
      { ...base, t: 0 },
      { ...base, lat: base.lat + 0.1, t: 5000 },
    ]);
    expect(s.suspicious).toBe(true);
  });

  it('drops inaccurate fixes', () => {
    const s = summarizeWalk([{ ...base, t: 0, accuracy: 200 }]);
    expect(s.rejectedFixes).toBe(1);
  });
});

describe('economy', () => {
  it('death costs 20% of carried gold only', () => {
    expect(deathGoldLoss(1000)).toBe(200);
  });
  it('market price clamps to 50%..300%', () => {
    expect(marketPrice(100, 0, 1000)).toBe(50);
    expect(marketPrice(100, 1000, 0)).toBe(300);
    expect(marketPrice(100, 10, 10)).toBe(100);
  });
});

describe('boss scaling', () => {
  it('scales non-world boss HP to party size, never world bosses', () => {
    expect(bossHpScale('goblin_king', 1)).toBeCloseTo(1 / 4);
    expect(bossHpScale('goblin_king', 5)).toBe(1);
    expect(bossHpScale('park_treant', 1)).toBe(1);
  });
});
