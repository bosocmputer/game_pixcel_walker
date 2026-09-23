/** Head-and-shoulders portraits of player avatars for party frames and player lists. */
import type { PlayerLook } from '@pw/shared';
import { heroCanvas, type HairStyle, type Paperdoll } from '../game/art';

const cache = new Map<string, string>();

export function dollFromLook(l: PlayerLook): Paperdoll {
  return {
    classId: l.classId,
    appearance: { ...l.appearance, hairStyle: l.appearance.hairStyle as HairStyle },
    helmet: l.helmet,
    chest: l.chest,
    weapon: l.weapon,
    accessory: l.accessory,
    aura: l.aura,
  };
}

/** 32x32 PNG data URL of the avatar's face (crop of the front-facing frame), cached. */
export function portraitUrl(doll: Paperdoll): string {
  const key = JSON.stringify(doll);
  const hit = cache.get(key);
  if (hit) return hit;
  const full = heroCanvas({ ...doll, weapon: undefined }, 'down', 0);
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // Avatar-pack cells are 48x64 with the head in the upper half; the old 16x24 hero is scaled up.
  if (full.width >= 48) ctx.drawImage(full, 8, 12, 32, 32, 0, 0, 32, 32);
  else ctx.drawImage(full, 0, 0, full.width, Math.min(full.height, full.width), 0, 0, 32, 32);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function portraitImg(doll: Paperdoll | null, cls = 'pt-ico'): string {
  return doll ? `<img class="${cls}" src="${portraitUrl(doll)}" alt="" draggable="false" />` : `<span class="${cls} pt-none">?</span>`;
}
