/** FFT-style Time Mage (new class id TIME_MAGE, owner's picks + notes 2026-09-27): Haste(ga), Slow(ga), Stop, Quick, Graviga. */
import { describe, expect, it } from 'vitest';
import { BACK_ROW_CLASSES, CLASSES, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['haste', 'hastega', 'slow', 'slowga', 'stop', 'quick', 'graviga'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const mage = (deck: string[], id = 'tm') => hero({ id, classId: 'TIME_MAGE', row: 'BACK', alloc: { int: 36, agi: 10, vit: 12 }, deck });
const buddy = () => hero({ id: 'k', deck: [] });

describe('FFT Time Mage', () => {
  it('is a new back-row class with the picked kit', () => {
    expect(CLASSES.TIME_MAGE.nameEn).toBe('Time Mage');
    expect(CLASSES.TIME_MAGE.skills).toEqual(KIT);
    expect(BACK_ROW_CLASSES).toContain('TIME_MAGE');
  });

  it('Haste gives the strongest ally two turns in the next round', () => {
    const evs = runToEnd(createCombat({ partyA: [mage(['haste']), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 20 })], seed: 3 })).events;
    const hasted = of(evs, 'STATUS').find((e) => e.status === 'HASTE');
    expect(hasted).toBeDefined();
    // count the hasted unit's turns per round: some round has 2
    const perRound = new Map<number, number>();
    let round = 0;
    for (const e of evs) {
      if (e.type === 'ROUND') round = e.round;
      if (e.type === 'TURN' && e.unit === hasted!.target) perRound.set(round, (perRound.get(round) ?? 0) + 1);
    }
    expect(Math.max(...perRound.values())).toBe(2);
  });

  it('Quick hands the next turn to an ally, and needs one', () => {
    const evs = runToEnd(createCombat({ partyA: [mage(['quick']), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 20 })], seed: 4 })).events;
    const i = evs.findIndex((e) => e.type === 'QUICK');
    expect(i).toBeGreaterThan(0);
    const next = evs.slice(i).find((e) => e.type === 'TURN');
    expect(next?.type === 'TURN' && next.unit).toBe('k');
    const solo = runToEnd(createCombat({ partyA: [mage(['quick'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 4 })).events;
    expect(of(solo, 'QUICK')).toHaveLength(0);
  });

  it('Stop freezes time: the target skips its turns', () => {
    let stops = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const evs = runToEnd(createCombat({ partyA: [mage(['stop'])], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 5 })], seed })).events;
      stops += of(evs, 'SKIP').filter((e) => e.reason === 'STOP').length;
    }
    expect(stops).toBeGreaterThan(0);
  });

  it('Graviga (owner: an all-enemies attack that can stun) hits every foe', () => {
    const evs = runToEnd(createCombat({ partyA: [mage(['graviga'])], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 2 })).events;
    const i = evs.findIndex((e) => e.type === 'SKILL' && e.skill === 'graviga');
    expect(i).toBeGreaterThanOrEqual(0);
    const hit = new Set(evs.slice(i, i + 8).filter((e) => (e.type === 'DAMAGE' || e.type === 'MISS') && e.source === 'tm').map((e) => (e as { target: string }).target));
    expect(hit.size).toBe(2);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [mage(KIT), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 11 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
