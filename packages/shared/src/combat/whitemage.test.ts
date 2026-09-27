/** FFT-style White Mage (class id CLERIC, owner's picks 2026-09-27): Cure, Curaga, Arise, Protectja, Esuna, Holy, Regenerate. */
import { describe, expect, it } from 'vitest';
import { CLASSES, createCombat, monsterSetup, replayCombat, runToEnd, step, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['cure', 'curaga', 'raise', 'protect', 'esuna', 'holy', 'regenerate'];
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const mage = (deck: string[], id = 'w') => hero({ id, classId: 'CLERIC', row: 'BACK', alloc: { int: 30, vit: 15 }, deck });

describe('FFT White Mage', () => {
  it('keeps the CLERIC id with the White Mage kit', () => {
    expect(CLASSES.CLERIC.nameEn).toBe('White Mage');
    expect(CLASSES.CLERIC.skills).toEqual(KIT);
  });

  it('Arise brings a fallen ally back with full HP', () => {
    const dummy = monsterSetup('soi_dog_spirit', 'e0');
    const c = createCombat({ partyA: [hero({ id: 'k', deck: [] }), mage(['raise'])], partyB: [{ ...dummy, passive: true, hp: 1e6, stats: { ...dummy.stats, maxHp: 1e6 } }], seed: 5 });
    const k = c.units.find((u) => u.id === 'k')!;
    k.hp = 0; // fell before the mage's turn
    let revived: Extract<CombatEvent, { type: 'REVIVE' }> | undefined;
    for (let i = 0; i < 40 && !revived && c.result === 'ONGOING'; i++) {
      step(c);
      revived = of(c.events, 'REVIVE')[0];
    }
    expect(revived).toBeDefined();
    expect(revived!.unit).toBe('k');
    expect(revived!.hp).toBe(k.base.maxHp);
  });

  it('Esuna clears harmful statuses but keeps Regen', () => {
    const c = createCombat({ partyA: [mage(['esuna'])], partyB: [{ ...monsterSetup('soi_dog_spirit', 'e0'), passive: true }], seed: 2 });
    const w = c.units[0]!;
    w.statuses = [
      { id: 'POISON', turns: 5, potency: 0.01, sourceId: 'e0' },
      { id: 'REGEN', turns: 5, potency: 0.05, sourceId: 'w' },
    ];
    for (let i = 0; i < 30 && !of(c.events, 'SKILL').some((e) => e.skill === 'esuna'); i++) step(c);
    expect(w.statuses.some((s) => s.id === 'POISON')).toBe(false);
    expect(w.statuses.some((s) => s.id === 'REGEN')).toBe(true);
  });

  it('Regenerate: being hit may grant Regen, and Regen heals at the start of the turn', () => {
    let gained = 0;
    let ticks = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const evs = runToEnd(createCombat({ partyA: [mage(['regenerate'])], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed })).events;
      gained += of(evs, 'STATUS').filter((e) => e.target === 'w' && e.status === 'REGEN').length;
      ticks += of(evs, 'RECOVER').filter((e) => e.unit === 'w').length;
    }
    expect(gained).toBeGreaterThan(0);
    expect(ticks).toBeGreaterThan(0);
  });

  it('Cure only fires when an ally is below 60% HP', () => {
    const evs = runToEnd(createCombat({ partyA: [mage(['cure'])], partyB: [{ ...monsterSetup('soi_dog_spirit', 'e0'), passive: true }], seed: 3, maxRounds: 5 })).events;
    expect(of(evs, 'SKILL').some((e) => e.skill === 'cure')).toBe(false);
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [hero({ id: 'k', deck: [] }), mage(KIT)], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 9 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
