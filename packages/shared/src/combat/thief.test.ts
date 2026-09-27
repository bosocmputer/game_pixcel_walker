/** FFT-style Thief (class id ASSASSIN, owner's picks + notes 2026-09-27): Steal Gil, Vanish, Steal Heart, Double Attack, Perfect Dodge, Poach. */
import { describe, expect, it } from 'vitest';
import { CLASSES, MONSTERS, SKILLS, createCombat, createRng, monsterSetup, replayCombat, rollLoot, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['steal_gil', 'vanish', 'steal_heart', 'double_attack', 'perfect_dodge'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const thief = (deck: string[], agi = 30) => hero({ id: 't', classId: 'ASSASSIN', alloc: { agi, str: 20 }, deck });

describe('FFT Thief', () => {
  it('keeps the ASSASSIN id with the Thief kit and Poach', () => {
    expect(CLASSES.ASSASSIN.nameEn).toBe('Thief');
    expect(CLASSES.ASSASSIN.skills).toEqual(KIT);
    expect(CLASSES.ASSASSIN.traits?.poach).toBe(0.3);
  });

  it('Steal Gil takes gold once per monster', () => {
    let steals = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const c = runToEnd(createCombat({ partyA: [thief(['steal_gil'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed }));
      const st = of(c.events, 'STEAL');
      expect(st.length).toBeLessThanOrEqual(1);
      for (const s of st) {
        expect(s.gold).toBe(MONSTERS.soi_dog_spirit!.gold[1]);
        steals++;
      }
    }
    expect(steals).toBeGreaterThan(0);
  });

  it('Perfect Dodge slips out of spells as well as blows', () => {
    let vsMagic = 0;
    let vsPhysical = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const a = runToEnd(createCombat({ partyA: [thief(['perfect_dodge'])], partyB: [monsterSetup('moat_carp', 'e0')], seed })).events;
      vsMagic += of(a, 'MISS').filter((e) => e.evade).length;
      const b = runToEnd(createCombat({ partyA: [thief(['perfect_dodge'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      vsPhysical += of(b, 'MISS').filter((e) => e.evade).length;
    }
    expect(vsMagic).toBeGreaterThan(0);
    expect(vsPhysical).toBeGreaterThan(0);
  });

  it('Vanish hits harder the faster the thief is, and cannot be dodged', () => {
    expect(SKILLS.vanish!.unavoidable).toBe(true);
    const first = (agi: number) => {
      const evs = runToEnd(createCombat({ partyA: [thief(['vanish'], agi)], partyB: [monsterSetup('soi_dog_spirit', 'e0', { hpScale: 1000 })], seed: 3 })).events;
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i]!;
        if (e.type !== 'SKILL' || e.skill !== 'vanish') continue;
        const d = evs.slice(i).find((x) => x.type === 'DAMAGE');
        if (d?.type === 'DAMAGE' && !d.crit && !d.block) return d.amount;
      }
      return null;
    };
    const slow = first(10);
    const fast = first(60);
    expect(slow).not.toBeNull();
    expect(fast!).toBeGreaterThan(slow!);
  });

  it('Steal Heart slows the target; Double Attack strikes twice', () => {
    let slows = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const evs = runToEnd(createCombat({ partyA: [thief(['steal_heart'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      slows += of(evs, 'STATUS').filter((e) => e.status === 'SLOW' && e.target === 'e0').length;
    }
    expect(slows).toBeGreaterThan(0);
    expect(SKILLS.double_attack!.effects[0]).toMatchObject({ kind: 'DAMAGE', hits: 2 });
  });

  it('Poach adds monster materials, and changes nothing when absent', () => {
    let plain = 0;
    let poached = 0;
    const a = createRng(9);
    const b = createRng(9);
    for (let i = 0; i < 400; i++) {
      plain += rollLoot('pixel_slime', a).items.slime_goo ?? 0;
      poached += rollLoot('pixel_slime', b, 1, 0.3).items.slime_goo ?? 0;
    }
    expect(poached - plain).toBeGreaterThan(60);
    // no poach → identical rolls to the old signature
    expect(rollLoot('pixel_slime', createRng(4))).toEqual(rollLoot('pixel_slime', createRng(4), 1, 0));
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [thief(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('moat_carp', 'e1')], seed: 8 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
