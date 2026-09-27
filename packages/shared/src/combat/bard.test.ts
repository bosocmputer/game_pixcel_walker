/** FFT-style Bard (new class id BARD, owner's picks + notes 2026-09-27): Seraph Song, Life's Anthem, Rousing Melody, Battle Chant, Soothing Tune. */
import { describe, expect, it } from 'vitest';
import { BACK_ROW_CLASSES, CLASSES, SKILLS, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['seraph_song', 'lifes_anthem', 'rousing_melody', 'battle_chant', 'soothing_tune'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const bard = (deck: string[]) => hero({ id: 'b', classId: 'BARD', row: 'BACK', alloc: { int: 30, vit: 20 }, deck });
const buddy = () => hero({ id: 'k', deck: [] });

describe('FFT Bard', () => {
  it('is a new back-row class with the picked kit', () => {
    expect(CLASSES.BARD.nameEn).toBe('Bard');
    expect(CLASSES.BARD.skills).toEqual(KIT);
    expect(BACK_ROW_CLASSES).toContain('BARD');
  });

  it('Battle Chant (owner: ATK and MATK) lifts the whole party', () => {
    const evs = runToEnd(createCombat({ partyA: [bard(['battle_chant']), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 60 })], seed: 1 })).events;
    const buffs = of(evs, 'BUFF');
    for (const who of ['b', 'k']) {
      expect(buffs.some((e) => e.target === who && e.stat === 'atk')).toBe(true);
      expect(buffs.some((e) => e.target === who && e.stat === 'matk')).toBe(true);
    }
  });

  it('Seraph Song refills the party’s MP when it runs low', () => {
    const c = createCombat({ partyA: [bard(['seraph_song']), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 10 })], seed: 2 });
    for (const u of c.units.filter((x) => x.side === 'A')) u.mp = 0;
    const evs = runToEnd(c).events;
    expect(of(evs, 'MP').filter((e) => e.amount > 0).length).toBeGreaterThanOrEqual(2);
  });

  it('Soothing Tune (owner: heal the team when hit, 30%)', () => {
    expect(SKILLS.soothing_tune!.rate).toBe(30);
    let tunes = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [bard(['soothing_tune']), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 5 })], seed })).events;
      tunes += of(evs, 'SKILL').filter((e) => e.skill === 'soothing_tune' && e.reactive === 'ON_HIT').length;
    }
    expect(tunes).toBeGreaterThan(0);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [bard(KIT), buddy()], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 17 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
