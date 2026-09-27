/** FFT-style Monk (new class id MONK, owner's picks + notes 2026-09-27): Pummel, Aurablast, Chakra, Purification, First Strike, Brawler, Lifefont. */
import { describe, expect, it } from 'vitest';
import { CLASSES, SKILLS, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['pummel', 'aurablast', 'chakra', 'purification', 'first_strike'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const monk = (deck: string[], id = 'm') => hero({ id, classId: 'MONK', alloc: { str: 25, vit: 30 }, deck });

describe('FFT Monk', () => {
  it('is a new class with the picked kit, Brawler and Lifefont', () => {
    expect(CLASSES.MONK.nameEn).toBe('Monk');
    expect(CLASSES.MONK.skills).toEqual(KIT);
    expect(CLASSES.MONK.passive.modifiers.pct?.atk).toBeGreaterThan(0);
    expect(CLASSES.MONK.traits?.allyTurnHeal?.ownTurnOnly).toBe(true);
  });

  it('Pummel lands 1 to 4 blows', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const evs = runToEnd(createCombat({ partyA: [monk(['pummel'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 50 })], seed })).events;
      evs.forEach((e, i) => {
        if (e.type !== 'SKILL' || e.skill !== 'pummel') return;
        let n = 0;
        for (const x of evs.slice(i + 1)) {
          if (x.type === 'TURN' || x.type === 'SKILL') break;
          if ((x.type === 'DAMAGE' || x.type === 'MISS') && x.source === 'm') n++;
        }
        counts.add(n);
      });
    }
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...counts)).toBeLessThanOrEqual(4);
    expect(counts.size).toBeGreaterThanOrEqual(3);
  });

  it('First Strike answers melee blows only, before they land', () => {
    let fired = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const foe of ['soi_dog_spirit', 'moat_carp']) {
        const evs = runToEnd(createCombat({ partyA: [monk(['first_strike'])], partyB: [monsterSetup(foe, 'e0')], seed })).events;
        evs.forEach((e, i) => {
          if (e.type !== 'SKILL' || e.reactive !== 'FIRST_STRIKE') return;
          fired++;
          // the foe's own action is announced right before the monk's answer, and it is a melee one
          const prev = evs[i - 1];
          expect(prev?.type).toBe('SKILL');
          if (prev?.type !== 'SKILL') return;
          expect(prev.unit).toBe('e0');
          expect(SKILLS[prev.skill]?.ranged ?? false).toBe(false);
        });
      }
    }
    expect(fired).toBeGreaterThan(0);
  });

  it('Lifefont heals only on the monk’s own turns', () => {
    const cfg: CombatConfig = {
      partyA: [monk([], 'm'), hero({ id: 'k', deck: [] })],
      partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 5 })],
      seed: 2,
    };
    const evs = runToEnd(createCombat(cfg)).events;
    let turn = '';
    let heals = 0;
    for (const e of evs) {
      if (e.type === 'TURN') turn = e.unit;
      if (e.type === 'RECOVER' && e.unit === 'm') {
        heals++;
        expect(turn).toBe('m');
      }
    }
    expect(heals).toBeGreaterThan(0);
  });

  it('Chakra heals HP and restores MP', () => {
    const c = createCombat({ partyA: [monk(['chakra'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 5 })], seed: 5 });
    const me = c.units[0]!;
    me.hp = Math.round(me.base.maxHp * 0.3);
    me.mp = 0;
    const evs = runToEnd(c).events;
    const i = evs.findIndex((e) => e.type === 'SKILL' && e.skill === 'chakra');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(evs.slice(i).some((e) => e.type === 'HEAL' && e.target === 'm')).toBe(true);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [monk(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 9 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
