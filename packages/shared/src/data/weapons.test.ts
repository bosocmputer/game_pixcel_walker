import { describe, expect, it } from 'vitest';
import { EQUIPMENT, weaponStyle } from './items';

describe('weapon battle look', () => {
  it('every weapon says how it attacks, and nothing else does', () => {
    for (const e of Object.values(EQUIPMENT)) {
      if (e.slot === 'weapon') expect(e.weapon, e.id).toBeDefined();
      else expect(e.weapon, e.id).toBeUndefined();
    }
  });

  it('maps a visible weapon sprite to its style; no / unknown weapon = fists', () => {
    expect(weaponStyle(EQUIPMENT.naga_staff!.sprite)).toEqual({ type: 'STAFF', element: 'WATER' });
    expect(weaponStyle(EQUIPMENT.bamboo_spear!.sprite)).toEqual({ type: 'SPEAR', element: 'NEUTRAL' });
    expect(weaponStyle(undefined)).toEqual({ type: 'FIST', element: 'NEUTRAL' });
    expect(weaponStyle('not_a_weapon')).toEqual({ type: 'FIST', element: 'NEUTRAL' });
  });
});
