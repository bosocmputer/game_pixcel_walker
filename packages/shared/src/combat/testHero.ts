/** Test-only helper: a geared Lv.12 Knight setup (shared by the combat test files). */
import { computeDerived, statsFromDerived, totalStats, type ClassId, type Stats, type UnitSetup } from '../index';

const zero: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };

export function hero(opts: { id?: string; level?: number; classId?: ClassId; alloc?: Partial<Stats>; deck?: string[]; row?: 'FRONT' | 'BACK'; gearAtk?: number; gearDef?: number } = {}): UnitSetup {
  const level = opts.level ?? 12;
  const classId = opts.classId ?? 'KNIGHT';
  const stats = totalStats({ ...zero, str: 20, vit: 25, agi: 10, ...(opts.alloc ?? {}) });
  const d = computeDerived({ level, classId, mutation: null, stats, gear: [{ flat: { atk: opts.gearAtk ?? 45, def: opts.gearDef ?? 20 } }] });
  return {
    id: opts.id ?? 'p1',
    name: 'Hero',
    row: opts.row ?? 'FRONT',
    sprite: 'hero',
    level,
    classId,
    stats: statsFromDerived(d, { dex: stats.dex, luk: stats.luk, vit: stats.vit }),
    deck: opts.deck ?? ['shield_bash', 'taunt', 'iron_wall'],
    autoPotion: true,
  };
}

