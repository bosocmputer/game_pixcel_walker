/** FFT-style Dragoon (new class id DRAGOON, owner's picks + notes 2026-09-27): Jump, Dragon's Faith, Dragonheart, Dragon Blood. */
import { describe, expect, it } from 'vitest';
import { CLASSES, createCombat, monsterSetup, replayCombat, runToEnd, stat, step, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['jump', 'dragons_faith', 'dragonheart'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const dragoon = (deck: string[]) => hero({ id: 'd', classId: 'DRAGOON', alloc: { str: 30, vit: 25 }, deck });

describe('FFT Dragoon', () => {
  it('is a new class with the picked kit and Dragon Blood', () => {
    expect(CLASSES.DRAGOON.nameEn).toBe('Dragoon');
    expect(CLASSES.DRAGOON.skills).toEqual(KIT);
    expect(CLASSES.DRAGOON.traits?.rageAtk).toBe(0.5);
  });

  it('Jump: up in the sky nobody can touch it, it dives down on its next turn', () => {
    const c = createCombat({ partyA: [dragoon(['jump'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 20 })], seed: 1 });
    let hitWhileUp = 0;
    let landed = 0;
    let airborne = false;
    for (let i = 0; i < 400 && c.result === 'ONGOING'; i++) {
      const from = c.events.length;
      step(c);
      for (const e of c.events.slice(from)) {
        if (e.type === 'JUMP') airborne = true;
        if (e.type === 'LAND') {
          airborne = false;
          landed++;
          expect(e.target).toBe('e0');
        }
        if (airborne && (e.type === 'DAMAGE' || e.type === 'MISS') && e.target === 'd') hitWhileUp++;
      }
    }
    expect(landed).toBeGreaterThan(0);
    expect(hitWhileUp).toBe(0);
    // the landing strike follows the LAND event
    const i = c.events.findIndex((e) => e.type === 'LAND');
    expect(c.events.slice(i, i + 4).some((e) => (e.type === 'DAMAGE' || e.type === 'MISS') && e.source === 'd')).toBe(true);
  });

  it('a lone dragoon in the air does not lose the fight', () => {
    const c = runToEnd(createCombat({ partyA: [dragoon(['jump'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 2 }));
    expect(c.result).toBe('WIN');
  });

  it('Dragon Blood: ATK grows as HP drops', () => {
    const c = createCombat({ partyA: [dragoon([])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    const d = c.units[0]!;
    const full = stat(d, 'atk');
    d.hp = Math.round(d.base.maxHp * 0.5);
    expect(stat(d, 'atk')).toBeCloseTo(full * 1.25, 0);
  });

  it('Dragonheart: may rise again with 30% HP instead of dying', () => {
    let rises = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const c = runToEnd(createCombat({ partyA: [dragoon(['dragonheart'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { atkScale: 6, hpScale: 10 })], seed }));
      for (const e of of(c.events, 'REVIVE').filter((x) => x.unit === 'd')) {
        rises++;
        expect(e.hp).toBe(Math.round(c.units[0]!.base.maxHp * 0.3));
      }
    }
    expect(rises).toBeGreaterThan(0);
  });

  it("Dragon's Faith raises ATK and crit", () => {
    const evs = runToEnd(createCombat({ partyA: [dragoon(['dragons_faith'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 10 })], seed: 3 })).events;
    const buffs = of(evs, 'BUFF').filter((e) => e.target === 'd');
    expect(buffs.some((e) => e.stat === 'atk')).toBe(true);
    expect(buffs.some((e) => e.stat === 'crit')).toBe(true);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [dragoon(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 14 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
