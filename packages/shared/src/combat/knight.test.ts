/** FFT-style Knight (owner's picks 2026-09-27): Iron Blood regen, Parry, Rend debuffs. */
import { describe, expect, it } from 'vitest';
import { CLASSES, createCombat, monsterSetup, replayCombat, runToEnd, type CombatConfig, type CombatEvent } from '../index';
import { hero } from './testHero';

const KIT = ['rend_power', 'rend_magick', 'rend_speed', 'taunt', 'parry'];
const events = (cfg: CombatConfig) => runToEnd(createCombat(cfg)).events;
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

describe('FFT Knight', () => {
  it('the class pool is the owner-picked kit', () => {
    expect(CLASSES.KNIGHT.skills).toEqual(KIT);
    expect(CLASSES.KNIGHT.traits?.allyTurnHeal).toBeDefined();
  });

  it('Iron Blood: recovers on allied turns, never more than 2% max HP a tick', () => {
    const knight = hero({ id: 'k', deck: KIT });
    const buddy = hero({ id: 'b', classId: 'NOVICE', deck: [] });
    const c = runToEnd(createCombat({ partyA: [knight, buddy], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 3 }));
    const regen = of(c.events, 'RECOVER').filter((e) => e.unit === 'k');
    expect(regen.length).toBeGreaterThan(0);
    const cap = Math.round(knight.stats.maxHp * 0.02);
    for (const r of regen) expect(r.amount).toBeLessThanOrEqual(cap);
    // the Novice has no such trait
    expect(of(c.events, 'RECOVER').some((e) => e.unit === 'b')).toBe(false);
  });

  it('a mutation replaces Iron Blood like the class passive', () => {
    const c = createCombat({ partyA: [{ ...hero({ deck: KIT }), mutation: 'PURE_TANK' }], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 1 });
    expect(c.units[0]!.traits).toEqual({});
  });

  it('Parry turns physical strikes aside (a MISS marked parry, no damage)', () => {
    let parried = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const evs = events({ partyA: [hero({ id: 'k', deck: ['parry'] })], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed });
      for (const m of of(evs, 'MISS')) if (m.target === 'k' && m.parry) parried++;
    }
    expect(parried).toBeGreaterThan(0);
  });

  it('Rend Power only debuffs a target it actually hit', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const evs = events({ partyA: [hero({ id: 'k', deck: ['rend_power'] })], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed });
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i]!;
        if (e.type !== 'SKILL' || e.skill !== 'rend_power') continue;
        const after = evs.slice(i + 1, i + 4);
        const missed = after.some((x) => x.type === 'MISS' && x.source === 'k');
        const debuffed = after.some((x) => x.type === 'BUFF' && x.stat === 'atk' && (x.pct ?? 0) < 0);
        if (missed) expect(debuffed).toBe(false);
      }
    }
  });

  it('stays deterministic (replay)', () => {
    const cfg: CombatConfig = { partyA: [hero({ deck: KIT })], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 11 };
    expect(replayCombat(cfg).events).toEqual(replayCombat(cfg).events);
  });
});
