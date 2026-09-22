import { describe, expect, it } from 'vitest';
import { MONSTERS, SPAWN_SLOT_MS, cellOf, spawnPool, spawnsAround, spawnsForCell } from '../index';

const road = () => 'ROAD' as const;
const T0 = 1_790_000_000_000;

describe('spawns', () => {
  it('is identical for two players in the same place, slot and level band', () => {
    const a = spawnsAround(18.7877, 98.9931, 0.003, T0, 3, road);
    const b = spawnsAround(18.7877, 98.9931, 0.003, T0 + 1000, 5, road);
    expect(a.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });

  it('rotates every slot', () => {
    const a = spawnsAround(18.7877, 98.9931, 0.003, T0, 3, road);
    const b = spawnsAround(18.7877, 98.9931, 0.003, T0 + SPAWN_SLOT_MS, 3, road);
    expect(b).not.toEqual(a);
  });

  it('never spawns where terrain is blocked (safe zones, buildings, unloaded map)', () => {
    const { cx, cy } = cellOf(18.7877, 98.9931);
    expect(spawnsForCell(cx, cy, T0, 3, () => null)).toEqual([]);
  });

  it('keeps spawns inside their cell and fitted to terrain', () => {
    for (const s of spawnsAround(18.8, 99.0, 0.005, T0, 12, () => 'WATER')) {
      expect(MONSTERS[s.monsterId]!.terrain).toContain('WATER');
    }
  });

  it('pools never exceed the band max level', () => {
    for (const id of spawnPool('ROAD', 0)) expect(MONSTERS[id]!.level).toBeLessThanOrEqual(5);
    expect(spawnPool('ROAD', 0)).toContain('pixel_slime');
  });
});
