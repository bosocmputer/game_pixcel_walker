/** FFT-style Dancer (new class id DANCER, owner's picks + notes 2026-09-27): four dances, Heartbreak, MP aura. */
import { describe, expect, it } from 'vitest';
import { BACK_ROW_CLASSES, CLASSES, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['mincing_minuet', 'polka', 'slow_dance', 'forbidden_dance', 'heartbreak'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const dancer = (deck: string[]) => hero({ id: 'dn', classId: 'DANCER', row: 'BACK', alloc: { agi: 25, int: 20, str: 15 }, deck });
const buddy = () => hero({ id: 'k', deck: [] });
const pack = () => [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 40 }), monsterSetup('moat_carp', 'e1', { hpScale: 40 })];

describe('FFT Dancer', () => {
  it('is a new back-row class with the picked kit', () => {
    expect(CLASSES.DANCER.nameEn).toBe('Dancer');
    expect(CLASSES.DANCER.skills).toEqual(KIT);
    expect(BACK_ROW_CLASSES).toContain('DANCER');
  });

  it('Polka (owner: lowers ATK and MATK) hexes every foe', () => {
    const evs = runToEnd(createCombat({ partyA: [dancer(['polka']), buddy()], partyB: pack(), seed: 1 })).events;
    const down = of(evs, 'BUFF').filter((e) => (e.pct ?? 0) < 0);
    for (const foe of ['e0', 'e1']) {
      expect(down.some((e) => e.target === foe && e.stat === 'atk')).toBe(true);
      expect(down.some((e) => e.target === foe && e.stat === 'matk')).toBe(true);
    }
  });

  it('Heartbreak (owner: when hit, 30% to strike every foe)', () => {
    let hits = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const evs = runToEnd(createCombat({ partyA: [dancer(['heartbreak'])], partyB: pack(), seed, maxRounds: 15 })).events;
      evs.forEach((e, i) => {
        if (e.type !== 'SKILL' || e.skill !== 'heartbreak') return;
        const struck = new Set(evs.slice(i + 1, i + 6).filter((x) => (x.type === 'DAMAGE' || x.type === 'MISS') && x.source === 'dn').map((x) => (x as { target: string }).target));
        if (struck.size === 2) hits++;
      });
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('owner support: every dancer turn tops up the party’s MP', () => {
    const c = createCombat({ partyA: [dancer([]), buddy()], partyB: pack(), seed: 3, maxRounds: 3 });
    for (const u of c.units.filter((x) => x.side === 'A')) u.mp = 0;
    const evs = runToEnd(c).events;
    let turn = '';
    for (const e of evs) {
      if (e.type === 'TURN') turn = e.unit;
      if (e.type === 'MP' && e.amount > 0) expect(turn).toBe('dn');
    }
    expect(new Set(of(evs, 'MP').filter((e) => e.amount > 0).map((e) => e.unit))).toEqual(new Set(['dn', 'k']));
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [dancer(KIT), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 18 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
