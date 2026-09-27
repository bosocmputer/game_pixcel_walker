/** FFT-style Ninja (new class id NINJA, owner's picks + notes 2026-09-27): Shuriken, Bomb, Shadow Clone, Vanish, Kawarimi, Ninja Arts. */
import { describe, expect, it } from 'vitest';
import { CLASSES, SKILLS, createCombat, monsterSetup, replayCombat, runToEnd, step, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['shuriken', 'bomb', 'shadow_clone', 'ninja_vanish', 'kawarimi'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const ninja = (deck: string[]) => hero({ id: 'n', classId: 'NINJA', alloc: { agi: 35, dex: 15, str: 20 }, deck });

describe('FFT Ninja', () => {
  it('is a new class with the picked kit plus the owner’s additions', () => {
    expect(CLASSES.NINJA.nameEn).toBe('Ninja');
    expect(CLASSES.NINJA.skills).toEqual(KIT);
    expect(CLASSES.NINJA.passive.modifiers.flat?.evasion).toBeGreaterThan(0);
    expect(CLASSES.NINJA.passive.modifiers.pct?.speed).toBeGreaterThan(0);
  });

  it('Kawarimi: 30% perfect dodge, drawn as a log swap', () => {
    expect(SKILLS.kawarimi!.rate).toBe(30);
    let logs = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [ninja(['kawarimi'])], partyB: [monsterSetup('moat_carp', 'e0', { hpScale: 3 })], seed })).events;
      logs += of(evs, 'MISS').filter((e) => e.evade && e.by === 'kawarimi').length;
    }
    expect(logs).toBeGreaterThan(0);
  });

  it('Vanish: once hidden, no foe targets the ninja until its turn is over', () => {
    let hides = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const c = createCombat({ partyA: [ninja(['ninja_vanish']), hero({ id: 'k', deck: [] })], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 10 })], seed });
      for (let i = 0; i < 300 && c.result === 'ONGOING'; i++) {
        const from = c.events.length;
        const hiddenBefore = c.units[0]!.statuses.some((s) => s.id === 'HIDDEN');
        step(c);
        const evs = c.events.slice(from);
        if (hiddenBefore) {
          hides++;
          // while hidden, the dog's own turn never lands on the ninja
          const dogTurn = evs.some((e) => e.type === 'TURN' && e.unit === 'e0');
          if (dogTurn) expect(evs.some((e) => (e.type === 'DAMAGE' || e.type === 'MISS') && e.source === 'e0' && e.target === 'n')).toBe(false);
        }
      }
    }
    expect(hides).toBeGreaterThan(0);
  });

  it('Shadow Clone strikes three times; Bomb hits every foe', () => {
    expect(SKILLS.shadow_clone!.effects[0]).toMatchObject({ hits: 3 });
    expect(SKILLS.bomb!.target).toBe('ALL_ENEMIES');
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [ninja(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 16 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
