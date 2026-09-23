import { EQUIPMENT, MUTATIONS } from '@pw/shared';
import type { Paperdoll } from './art';
import { mutationOf, type SaveData } from '../state/store';

/** Visible paperdoll layers: broken gear (durability 0) is not rendered. */
export function paperdollOf(s: SaveData): Paperdoll {
  const layer = (slot: 'helmet' | 'chest' | 'weapon' | 'offhand' | 'boots') => {
    const eq = s.equipment[slot];
    return eq && eq.durability > 0 ? EQUIPMENT[eq.itemId]?.sprite : undefined;
  };
  const mut = mutationOf(s);
  return {
    classId: s.classId,
    appearance: s.appearance,
    helmet: layer('helmet'),
    chest: layer('chest'),
    weapon: layer('weapon'),
    offhand: layer('offhand'),
    boots: layer('boots'),
    aura: mut ? MUTATIONS[mut].aura : null,
  };
}
