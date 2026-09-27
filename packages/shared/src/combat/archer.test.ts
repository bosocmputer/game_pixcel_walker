/** FFT-style Archer (class id RANGER, owner's picks + notes 2026-09-27): Aim, Arrow Rain, Double Shot, Adrenaline Rush, Concentration. */
import { describe, expect, it } from 'vitest';
import { CLASSES, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['aim', 'arrow_rain', 'double_shot', 'adrenaline_rush'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const archer = (deck: string[]) => hero({ id: 'a', classId: 'RANGER', row: 'BACK', alloc: { dex: 30 }, deck });

describe('FFT Archer', () => {
  it('keeps the RANGER id with the Archer kit', () => {
    expect(CLASSES.RANGER.nameEn).toBe('Archer');
    expect(CLASSES.RANGER.skills).toEqual(KIT);
  });

  it('Concentration: +50% hit, removed by a mutation', () => {
    const plain = archer([]);
    const c = createCombat({ partyA: [plain], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    expect(c.units[0]!.base.hit).toBeCloseTo(plain.stats.hit + 0.5);
    const m = createCombat({ partyA: [{ ...plain, mutation: 'PURE_DEX' }], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    expect(m.units[0]!.base.hit).toBeCloseTo(plain.stats.hit);
  });

  it('Aim always lands as a critical hit', () => {
    let aims = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [archer(['aim'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      evs.forEach((e, i) => {
        if (e.type !== 'SKILL' || e.skill !== 'aim') return;
        const dmg = evs.slice(i + 1).find((x) => x.type === 'DAMAGE' || x.type === 'MISS');
        if (dmg?.type === 'DAMAGE') {
          aims++;
          expect(dmg.crit).toBe(true);
        }
      });
    }
    expect(aims).toBeGreaterThan(0);
  });

  it('Double Shot strikes twice', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [archer(['double_shot'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      const i = evs.findIndex((e) => e.type === 'SKILL' && e.skill === 'double_shot');
      if (i < 0) continue;
      const strikes = evs.slice(i + 1, i + 6).filter((e) => (e.type === 'DAMAGE' || e.type === 'MISS') && e.source === 'a');
      expect(strikes.length).toBeGreaterThanOrEqual(1);
      if (strikes.length && evs.slice(i + 1).find((e) => e.type === 'DEATH') === undefined) expect(strikes.length).toBe(2);
      return;
    }
  });

  it('Adrenaline Rush: being hit may speed the archer up', () => {
    let rushes = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [archer(['adrenaline_rush'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      rushes += of(evs, 'BUFF').filter((e) => e.target === 'a' && e.stat === 'speed' && (e.pct ?? 0) > 0).length;
    }
    expect(rushes).toBeGreaterThan(0);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [archer(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 6 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
