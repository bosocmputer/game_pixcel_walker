import { describe, expect, it } from 'vitest';
import {
  AWAKEN_MAX,
  addInput,
  awakenGrade,
  createCombat,
  createDungeon,
  landmarkWaves,
  monsterSetup,
  nextWave,
  replayCombat,
  runToEnd,
  step,
  type CombatConfig,
  type CombatEvent,
  type Dungeon,
} from '../index';
import { hero } from './testHero';

const of = <T extends CombatEvent['type']>(evs: CombatEvent[], type: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
const full = (id = 'p1') => ({ ...hero({ id }), awaken: AWAKEN_MAX });

describe('awakening', () => {
  it('grades a press by its timing error', () => {
    expect(awakenGrade(0)).toBe('PERFECT');
    expect(awakenGrade(-80)).toBe('PERFECT');
    expect(awakenGrade(150)).toBe('GOOD');
    expect(awakenGrade(400)).toBe('MISS');
    expect(awakenGrade(null)).toBe('MISS');
  });

  it('a full gauge + input turns the next turn into an unavoidable Awakening Strike, then empties the gauge', () => {
    const cfg: CombatConfig = {
      partyA: [full()],
      partyB: [monsterSetup('training_dummy', 'd')],
      seed: 4,
      maxRounds: 3,
      inputs: [{ unit: 'p1', turn: 0, kind: 'AWAKEN', grade: 'PERFECT' }],
    };
    const c = runToEnd(createCombat(cfg));
    const aw = of(c.events, 'AWAKEN');
    expect(aw).toHaveLength(1);
    expect(aw[0]).toMatchObject({ unit: 'p1', grade: 'PERFECT', target: 'd' });
    const i = c.events.indexOf(aw[0]!);
    expect(c.events[i + 1]).toMatchObject({ type: 'DAMAGE', source: 'p1', target: 'd' });
    expect(of(c.events, 'MISS').some((e) => e.source === 'p1' && c.events.indexOf(e) === i + 1)).toBe(false);
  });

  it('is deterministic from (setup, seed, inputs) — the replay key', () => {
    const cfg: CombatConfig = {
      partyA: [full()],
      partyB: [monsterSetup('soi_dog_spirit', 'e0'), monsterSetup('alley_rat', 'e1')],
      seed: 12,
      inputs: [{ unit: 'p1', turn: 1, kind: 'AWAKEN', grade: 'GOOD' }],
    };
    expect(replayCombat(cfg).events).toEqual(runToEnd(createCombat(cfg)).events);
    // …and the input really changes the fight.
    expect(replayCombat({ ...cfg, inputs: [] }).events).not.toEqual(replayCombat(cfg).events);
  });

  it('PERFECT hits harder than MISS (same seed)', () => {
    const hit = (grade: 'PERFECT' | 'MISS') => {
      const c = runToEnd(createCombat({ partyA: [full()], partyB: [monsterSetup('training_dummy', 'd')], seed: 8, maxRounds: 2, inputs: [{ unit: 'p1', turn: 0, kind: 'AWAKEN', grade }] }));
      const i = c.events.findIndex((e) => e.type === 'AWAKEN');
      return (c.events[i + 1] as Extract<CombatEvent, { type: 'DAMAGE' }>).amount;
    };
    expect(hit('PERFECT')).toBeGreaterThan(hit('MISS'));
  });

  it('ignores a press while the gauge is not full, and fills the gauge from hits (capped)', () => {
    const c = runToEnd(createCombat({ partyA: [hero()], partyB: [monsterSetup('soi_dog_spirit', 'e0')], seed: 2, inputs: [{ unit: 'p1', turn: 0, kind: 'AWAKEN', grade: 'PERFECT' }] }));
    const aw = of(c.events, 'AWAKEN');
    // The only input was at turn 0 with an empty gauge → consumed without effect.
    expect(aw).toHaveLength(0);
    const p = c.units.find((u) => u.id === 'p1')!;
    expect(p.awaken).toBeGreaterThan(0);
    expect(p.awaken).toBeLessThanOrEqual(AWAKEN_MAX);
    // Monsters never get a gauge.
    expect(c.units.filter((u) => u.side === 'B').every((u) => u.awaken === 0 && !u.awakenable)).toBe(true);
  });

  it('dungeon inputs are logged per wave and replay to the same fight', () => {
    const play = (inputs?: Dungeon['inputs']) => {
      const d = createDungeon({ party: [{ ...hero({ level: 16 }), awaken: AWAKEN_MAX }], waves: landmarkWaves('goblin_king'), seed: 21, rollModifiers: false, inputs });
      const events: CombatEvent[] = [];
      let pressed = false;
      while (true) {
        while (d.combat.result === 'ONGOING') {
          // Live play: press once, mid second wave, on the hero's next turn.
          if (!inputs && !pressed && d.wave === 1 && d.combat.round >= 2) {
            const me = d.combat.units.find((u) => u.id === 'p1')!;
            addInput(d, { unit: 'p1', turn: me.turnsTaken, kind: 'AWAKEN', grade: 'GOOD' });
            pressed = true;
          }
          step(d.combat);
        }
        events.push(...d.combat.events);
        if (!nextWave(d)) break;
      }
      return { d, events };
    };
    const live = play();
    expect(live.d.inputs).toEqual([expect.objectContaining({ wave: 1, unit: 'p1', grade: 'GOOD' })]);
    const replay = play(live.d.inputs);
    expect(replay.events).toEqual(live.events);
  });
});

describe('link attack', () => {
  it('boosts back-to-back hits by two allies on the same target (party only)', () => {
    const party = runToEnd(
      createCombat({ partyA: [hero({ id: 'p1' }), hero({ id: 'p2' })], partyB: [monsterSetup('training_dummy', 'd')], seed: 5, maxRounds: 6 }),
    );
    const links = of(party.events, 'LINK');
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.from).not.toBe(l.unit);
      expect(party.events[party.events.indexOf(l) + 1]).toMatchObject({ type: 'DAMAGE', source: l.unit, target: l.target });
    }
    const solo = runToEnd(createCombat({ partyA: [hero()], partyB: [monsterSetup('training_dummy', 'd')], seed: 5, maxRounds: 6 }));
    expect(of(solo.events, 'LINK')).toHaveLength(0);
  });
});
