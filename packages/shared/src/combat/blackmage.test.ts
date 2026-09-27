/** FFT-style Black Mage (class id SORCERER, owner's picks 2026-09-27): Fire/Thunder/Blizzard, their -ga forms, Magick Counter. */
import { describe, expect, it } from 'vitest';
import { CLASSES, SKILLS, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['fire', 'firaga', 'thunder', 'thundaga', 'blizzard', 'blizzaga', 'magick_counter'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const mage = (deck: string[]) => hero({ id: 'b', classId: 'SORCERER', row: 'BACK', alloc: { int: 36, vit: 12 }, deck });

describe('FFT Black Mage', () => {
  it('keeps the SORCERER id with the Black Mage kit and Arcane Strength', () => {
    expect(CLASSES.SORCERER.nameEn).toBe('Black Mage');
    expect(CLASSES.SORCERER.skills).toEqual(KIT);
    expect(CLASSES.SORCERER.passive.modifiers.pct?.matk).toBeGreaterThan(0);
  });

  it('each element has a single-target and an all-enemies spell', () => {
    for (const [one, all, el] of [['fire', 'firaga', 'FIRE'], ['thunder', 'thundaga', 'LIGHTNING'], ['blizzard', 'blizzaga', 'WATER']] as const) {
      expect(SKILLS[one]!.element).toBe(el);
      expect(SKILLS[one]!.target).toBe('ENEMY');
      expect(SKILLS[all]!.target).toBe('ALL_ENEMIES');
    }
  });

  it('Magick Counter answers spells only', () => {
    let vsMagic = 0;
    let vsPhysical = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const a = runToEnd(createCombat({ partyA: [mage(['magick_counter'])], partyB: [monsterSetup('moat_carp', 'e0')], seed })).events;
      vsMagic += of(a, 'SKILL').filter((e) => e.reactive === 'MAGIC_COUNTER').length;
      const b = runToEnd(createCombat({ partyA: [mage(['magick_counter'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      vsPhysical += of(b, 'SKILL').filter((e) => e.reactive === 'MAGIC_COUNTER').length;
    }
    expect(vsMagic).toBeGreaterThan(0);
    expect(vsPhysical).toBe(0);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [mage(KIT)], partyB: [monsterSetup('moat_carp', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 4 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
