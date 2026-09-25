/** Builds combat parties from the local save (player now; companions/mercenaries later). */
import { BACK_ROW_CLASSES, statsFromDerived, totalStats, type UnitSetup } from '@pw/shared';
import { derivedOf, effectiveLoadout, mutationOf, type SaveData } from '../state/store';

export function playerSetup(s: SaveData): UnitSetup {
  const d = derivedOf(s);
  const stats = totalStats(s.allocated);
  return {
    id: 'me',
    name: s.name,
    row: BACK_ROW_CLASSES.includes(s.classId) ? 'BACK' : 'FRONT',
    sprite: 'hero',
    level: s.level,
    classId: s.classId,
    mutation: mutationOf(s),
    stats: statsFromDerived(d, { dex: stats.dex, luk: stats.luk, vit: stats.vit }),
    // No hp/mp: every new fight starts at full HP/MP (MASTER_SPEC §9). Floors inside one dungeon run still carry over.
    deck: effectiveLoadout(s),
    autoPotion: true,
  };
}
