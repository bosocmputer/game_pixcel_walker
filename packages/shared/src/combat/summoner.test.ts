/** FFT-style Summoner (new class id SUMMONER, owner's picks 2026-09-27): Moogle, Shiva, Ramuh, Ifrit, Bahamut, Critical: Recover MP, Halve MP. */
import { describe, expect, it } from 'vitest';
import { BACK_ROW_CLASSES, CLASSES, SKILLS, createCombat, monsterSetup, replayCombat, runToEnd, skillMpCost, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['moogle', 'shiva', 'ramuh', 'ifrit', 'bahamut', 'critical_recover_mp'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const summoner = (deck: string[], id = 'sm') => hero({ id, classId: 'SUMMONER', row: 'BACK', alloc: { int: 36, vit: 12 }, deck });

describe('FFT Summoner', () => {
  it('is a new back-row class with the picked kit', () => {
    expect(CLASSES.SUMMONER.nameEn).toBe('Summoner');
    expect(CLASSES.SUMMONER.skills).toEqual(KIT);
    expect(BACK_ROW_CLASSES).toContain('SUMMONER');
  });

  it('Halve MP: every skill costs half (a mutation removes it)', () => {
    const c = createCombat({ partyA: [summoner(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    expect(skillMpCost(c.units[0]!, SKILLS.bahamut!)).toBe(45);
    const m = createCombat({ partyA: [{ ...summoner(KIT), mutation: 'PURE_TANK' }], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    expect(skillMpCost(m.units[0]!, SKILLS.bahamut!)).toBe(90);
  });

  it('summons strike every enemy', () => {
    for (const id of ['shiva', 'ramuh', 'ifrit', 'bahamut']) expect(SKILLS[id]!.target).toBe('ALL_ENEMIES');
    const evs = runToEnd(createCombat({ partyA: [summoner(['ifrit'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 20 }), monsterSetup('alley_rat', 'e1', { hpScale: 20 })], seed: 2 })).events;
    const i = evs.findIndex((e) => e.type === 'SKILL' && e.skill === 'ifrit');
    expect(i).toBeGreaterThanOrEqual(0);
    const hit = new Set(evs.slice(i, i + 8).filter((e) => (e.type === 'DAMAGE' || e.type === 'MISS') && e.source === 'sm').map((e) => (e as { target: string }).target));
    expect(hit.size).toBe(2);
  });

  it('Critical: Recover MP refills MP when HP drops low', () => {
    let refills = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const c = createCombat({ partyA: [summoner(['critical_recover_mp'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { atkScale: 2 })], seed });
      const me = c.units[0]!;
      me.mp = 0;
      me.hp = Math.round(me.base.maxHp * 0.32); // one bite away from the critical line
      refills += of(runToEnd(c).events, 'MP').filter((e) => e.unit === 'sm' && e.amount > 0).length;
    }
    expect(refills).toBeGreaterThan(0);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [summoner(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 12 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
