/** FFT-style Geomancer (new class id GEOMANCER, owner's picks 2026-09-27): five geomancy spells, Nature's Wrath, Attack Boost. */
import { describe, expect, it } from 'vitest';
import { CLASSES, SKILLS, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['tanglevine', 'sinkhole', 'sandstorm', 'snowstorm', 'wind_blast', 'natures_wrath'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const geo = (deck: string[]) => hero({ id: 'g', classId: 'GEOMANCER', alloc: { str: 25, int: 25, vit: 20 }, deck });

describe('FFT Geomancer', () => {
  it('is a new class with the picked kit and Attack Boost', () => {
    expect(CLASSES.GEOMANCER.nameEn).toBe('Geomancer');
    expect(CLASSES.GEOMANCER.skills).toEqual(KIT);
    expect(CLASSES.GEOMANCER.passive.modifiers.pct?.atk).toBeGreaterThan(0);
  });

  it('geomancy scales with both ATK and MATK and carries a nature effect', () => {
    for (const id of KIT.slice(0, 5)) {
      const dmg = SKILLS[id]!.effects.find((e) => e.kind === 'DAMAGE');
      expect(dmg && dmg.kind === 'DAMAGE' && dmg.scaling.atk && dmg.scaling.matk).toBeTruthy();
      expect(SKILLS[id]!.effects.length).toBe(2);
    }
  });

  it('Sandstorm lowers the target’s accuracy', () => {
    let blinded = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const evs = runToEnd(createCombat({ partyA: [geo(['sandstorm'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 5 })], seed })).events;
      blinded += of(evs, 'BUFF').filter((e) => e.target === 'e0' && e.stat === 'hit' && (e.pct ?? 0) < 0).length;
    }
    expect(blinded).toBeGreaterThan(0);
  });

  it("Nature's Wrath strikes back when hit", () => {
    let wraths = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [geo(['natures_wrath'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 5 })], seed })).events;
      wraths += of(evs, 'SKILL').filter((e) => e.skill === 'natures_wrath' && e.reactive === 'COUNTER').length;
    }
    expect(wraths).toBeGreaterThan(0);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [geo(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 13 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
