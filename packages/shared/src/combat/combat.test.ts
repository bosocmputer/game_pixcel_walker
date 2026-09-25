import { describe, expect, it } from 'vitest';
import {
  SKILLS,
  computeDerived,
  createCombat,
  createDungeon,
  landmarkWaves,
  launchRate,
  monsterSetup,
  nextWave,
  replayCombat,
  runToEnd,
  stat,
  statsFromDerived,
  step,
  totalStats,
  type ClassId,
  type CombatConfig,
  type CombatEvent,
  type Stats,
  type UnitSetup,
} from '../index';
import { hero } from './testHero';

const events = (cfg: CombatConfig) => runToEnd(createCombat(cfg)).events;
const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

describe('combat engine', () => {
  it('is deterministic from config + seed (replayable)', () => {
    const cfg: CombatConfig = { partyA: [hero()], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 7 };
    expect(replayCombat(cfg).events).toEqual(events(cfg));
  });

  it('a geared Lv.12 Knight beats two rats', () => {
    const c = runToEnd(createCombat({ partyA: [hero()], partyB: [monsterSetup('alley_rat', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 3 }));
    expect(c.result).toBe('WIN');
  });

  it('acts strictly by speed each round', () => {
    const c = createCombat({ partyA: [hero({ alloc: { agi: 80 } })], partyB: [monsterSetup('pixel_slime', 'e0')], seed: 1 });
    step(c);
    expect(c.events.find((e) => e.type === 'TURN')).toEqual({ type: 'TURN', unit: 'p1' });
  });

  it('only rolls skills from the deck (basic attack as fallback)', () => {
    const evs = events({ partyA: [hero({ deck: ['taunt'] })], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 4 });
    const used = new Set(of(evs, 'SKILL').filter((e) => e.unit === 'p1' && !e.reactive).map((e) => e.skill));
    expect([...used].every((s) => s === 'taunt' || s === 'basic_attack')).toBe(true);
  });

  it('adds element and wave bonuses to the launch rate', () => {
    const c = createCombat({ partyA: [{ ...hero(), rateBonus: { FIRE: 10 } }], partyB: [monsterSetup('pixel_slime', 'e0')], seed: 1, modifier: { id: 'h', nameTh: '', rateBonus: { FIRE: 20 } } });
    expect(launchRate(c, c.units[0]!, SKILLS.fireball!)).toBe(SKILLS.fireball!.rate + 30);
  });

  it('taunt forces every enemy attack onto the taunter', () => {
    const tank = { ...hero({ id: 'tank' }), statuses: [{ id: 'TAUNTING' as const, turns: 99, potency: 0, sourceId: 'tank' }] };
    const mage = hero({ id: 'mage', classId: 'SORCERER', row: 'BACK', deck: [] });
    const evs = events({ partyA: [tank, mage], partyB: [monsterSetup('alley_rat', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 11, maxRounds: 3 });
    const hits = of(evs, 'DAMAGE').filter((e) => e.source.startsWith('e'));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.target === 'tank')).toBe(true);
  });

  it('front row draws ~70% of single-target aggro', () => {
    let front = 0;
    let total = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const evs = events({
        partyA: [hero({ id: 'f', deck: [] }), hero({ id: 'b', row: 'BACK', deck: [] })],
        partyB: [monsterSetup('alley_rat', 'e0')],
        seed,
        maxRounds: 2,
      });
      for (const e of of(evs, 'SKILL').filter((x) => x.unit === 'e0' && !x.reactive)) {
        total++;
        if (e.targets[0] === 'f') front++;
      }
    }
    expect(front / total).toBeGreaterThan(0.6);
    expect(front / total).toBeLessThan(0.8);
  });

  it('Guardian covers allies from single-target attacks', () => {
    let covers = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const evs = events({
        partyA: [hero({ id: 'k', deck: ['guardian'] }), hero({ id: 'm', row: 'BACK', deck: [] })],
        partyB: [monsterSetup('soi_dog_spirit', 'e0')],
        seed,
        maxRounds: 4,
      });
      covers += of(evs, 'COVER').filter((e) => e.unit === 'k' && e.protected === 'm').length;
    }
    expect(covers).toBeGreaterThan(0);
  });

  it('Assist triggers follow-up strikes from allies', () => {
    let assists = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const evs = events({
        partyA: [hero({ id: 'a', deck: [] }), hero({ id: 'r', classId: 'RANGER', row: 'BACK', deck: ['covering_fire'] })],
        partyB: [monsterSetup('songthaew_mimic', 'e0')],
        seed,
        maxRounds: 4,
      });
      assists += of(evs, 'SKILL').filter((e) => e.reactive === 'ASSIST').length;
    }
    expect(assists).toBeGreaterThan(0);
  });

  it('boss uses its unavoidable ultimate on every Nth turn and shifts phase below 50%', () => {
    const evs = events({ partyA: [hero({ level: 14 })], partyB: [monsterSetup('goblin_king', 'b', { hpScale: 0.3 })], seed: 5 });
    const bossTurns = of(evs, 'SKILL').filter((e) => e.unit === 'b' && !e.reactive);
    expect(bossTurns.some((e) => e.skill === 'snack_barrage')).toBe(true);
    expect(of(evs, 'PHASE').length).toBe(1);
  });

  it('enrages after the round limit (anti-stall)', () => {
    const wall = hero({ alloc: { vit: 200, str: 0 }, gearAtk: 0, gearDef: 400, deck: [] });
    const evs = events({ partyA: [wall], partyB: [monsterSetup('goblin_king', 'b')], seed: 2, maxRounds: 40 });
    expect(of(evs, 'ENRAGE').length).toBe(1);
  });
});

describe('MP', () => {
  it('skills spend MP and the auto MP potion kicks in when low', () => {
    const u = { ...hero({ deck: ['stone_throw', 'power_smash'] }), mp: 20 };
    const c = runToEnd(createCombat({ partyA: [u], partyB: [monsterSetup('training_dummy', 'd')], seed: 5, maxRounds: 8, items: { blue_elixir: 1 } }));
    expect(of(c.events, 'SKILL').some((e) => e.unit === 'p1' && (e.mp ?? 0) > 0)).toBe(true);
    expect(of(c.events, 'ITEM').some((e) => e.item === 'blue_elixir')).toBe(true);
  });

  it('skills without enough MP are never rolled (basic attack instead)', () => {
    const u = { ...hero({ deck: ['power_smash'] }), mp: 0 };
    const c = runToEnd(createCombat({ partyA: [u], partyB: [monsterSetup('training_dummy', 'd')], seed: 5, maxRounds: 6 }));
    expect(of(c.events, 'SKILL').filter((e) => e.unit === 'p1').every((e) => e.skill === 'basic_attack')).toBe(true);
  });
});

describe('flat buffs', () => {
  it('adds Focus-style flat ATK on top of the base stat', () => {
    const c = createCombat({ partyA: [hero()], partyB: [monsterSetup('training_dummy', 'd')], seed: 1 });
    const u = c.units.find((x) => x.id === 'p1')!;
    u.buffs.push({ stat: 'atk', flat: 1, turns: 1 });
    expect(stat(u, 'atk')).toBe(u.base.atk + 1);
  });
});

describe('training dummy', () => {
  it('never deals damage and survives until the round limit', () => {
    const c = runToEnd(createCombat({ partyA: [hero()], partyB: [monsterSetup('training_dummy', 'd')], seed: 3, maxRounds: 10 }));
    expect(of(c.events, 'DAMAGE').some((e) => e.target === 'p1')).toBe(false);
    expect(of(c.events, 'DAMAGE').filter((e) => e.target === 'd').length).toBeGreaterThan(5);
    expect(c.round).toBeGreaterThanOrEqual(10);
    expect(c.units.find((u) => u.id === 'p1')!.hp).toBe(c.units.find((u) => u.id === 'p1')!.base.maxHp);
  });
});

describe('fresh start', () => {
  it('every new fight starts at full HP/MP, even after a fight that drained the hero', () => {
    const first = runToEnd(createCombat({ partyA: [hero()], partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')], seed: 5 }));
    const after = first.units.find((u) => u.id === 'p1')!;
    expect(after.hp).toBeLessThan(after.base.maxHp);
    // The client builds the next fight from the save without hp/mp → the engine starts it full.
    const next = createCombat({ partyA: [hero()], partyB: [monsterSetup('alley_rat', 'e0')], seed: 6 });
    const p = next.units.find((u) => u.id === 'p1')!;
    expect(p.hp).toBe(p.base.maxHp);
    expect(p.mp).toBe(p.base.maxMp);
  });
});

describe('dungeon', () => {
  it('persists HP across waves and ends after the boss wave', () => {
    const d = createDungeon({ party: [hero({ level: 16 })], waves: landmarkWaves('goblin_king'), seed: 9, items: { red_potion: 5 }, rollModifiers: false });
    const hpAtEnd: number[] = [];
    while (true) {
      runToEnd(d.combat);
      hpAtEnd.push(d.combat.units.find((u) => u.id === 'p1')!.hp);
      if (!nextWave(d)) break;
      expect(d.party[0]!.hp).toBe(hpAtEnd[hpAtEnd.length - 1]);
    }
    expect(hpAtEnd.length).toBeGreaterThanOrEqual(2);
    expect(['WIN', 'LOSE']).toContain(d.result);
    if (d.result === 'WIN') expect(d.defeated).toContain('goblin_king');
  });
});
