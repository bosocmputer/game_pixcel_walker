/** FFT-style Samurai (new class id SAMURAI, owner's picks + notes 2026-09-27): Kotetsu, Osafune, Ama-no-Murakumo, Shirahadori (LUK), Bushido. */
import { describe, expect, it } from 'vitest';
import { CLASSES, SKILLS, createCombat, launchRate, monsterSetup, replayCombat, runToEnd, stat, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['kotetsu', 'osafune', 'ama_no_murakumo', 'shirahadori'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const samurai = (deck: string[], luk = 10) => hero({ id: 'sa', classId: 'SAMURAI', alloc: { str: 30, luk }, deck });

describe('FFT Samurai', () => {
  it('is a new class with the picked kit and Bushido', () => {
    expect(CLASSES.SAMURAI.nameEn).toBe('Samurai');
    expect(CLASSES.SAMURAI.skills).toEqual(KIT);
  });

  it('Shirahadori: the catch chance grows with LUK (owner: LUK instead of Brave), capped at 50%', () => {
    const rate = (luk: number) => {
      const c = createCombat({ partyA: [samurai(['shirahadori'], luk)], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
      return launchRate(c, c.units[0]!, SKILLS.shirahadori!);
    };
    expect(rate(40)).toBeGreaterThan(rate(0));
    expect(rate(500)).toBe(50);
  });

  it('Bushido: ATK climbs with every own turn, up to +30%', () => {
    const c = createCombat({ partyA: [samurai([])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    const u = c.units[0]!;
    const base = stat(u, 'atk');
    u.turnsTaken = 5;
    expect(stat(u, 'atk')).toBeCloseTo(base * 1.15, 3);
    u.turnsTaken = 50;
    expect(stat(u, 'atk')).toBeCloseTo(base * 1.3, 3);
  });

  it('Osafune burns the target’s MP', () => {
    let burns = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const evs = runToEnd(createCombat({ partyA: [samurai(['osafune'])], partyB: [monsterSetup('moat_carp', 'e0', { hpScale: 5 })], seed })).events;
      burns += of(evs, 'MP').filter((e) => e.unit === 'e0' && e.amount < 0).length;
    }
    expect(burns).toBeGreaterThan(0);
  });

  it('Kotetsu and Ama-no-Murakumo cut every foe', () => {
    for (const id of ['kotetsu', 'ama_no_murakumo']) expect(SKILLS[id]!.target).toBe('ALL_ENEMIES');
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [samurai(KIT, 30)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 15 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
