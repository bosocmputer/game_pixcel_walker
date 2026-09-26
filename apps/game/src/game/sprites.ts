/**
 * Native-resolution 16-bit sprites drawn with the pixel-art-studio skill
 * (pixel-art/monsters, pixel-art/landmarks → /assets/...). Preloaded once at boot; art.ts falls
 * back to the old procedural sprites for anything missing.
 */
import { MONSTERS } from '@pw/shared';

type Sheet = 'monsters' | 'landmarks';
const images = new Map<string, HTMLImageElement>();
/**
 * Map pins (pixel-art/landmarks, docs/STORY.md §5): every pin is the place itself. Gates have an
 * open strip (4 frames, the rift alive in the doorway) and a sealed picture; places without a
 * gate have one picture each.
 */
export const GATE_PIN_KINDS = ['CONVENIENCE', 'MALL', 'FUEL', 'STATION', 'TEMPLE', 'MUSEUM', 'PARK'];
export const RIFT_FRAMES = 4;
export const PIN_FILES = [
  ...GATE_PIN_KINDS.flatMap((k) => [`gate_${k}`, `sealed_${k}`]),
  'HOSPITAL',
  'MARKET',
  'SANCTUARY',
  'HOME',
];

function load(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images.set(src, img);
      resolve();
    };
    img.onerror = () => resolve(); // missing art → procedural fallback
    img.src = src;
  });
}

export async function loadPixelSprites(): Promise<void> {
  const monsterKeys = new Set(Object.values(MONSTERS).map((m) => m.sprite));
  await Promise.all([
    ...[...monsterKeys].map((k) => load(`/assets/monsters/${k}.png`)),
    // Battle animation strips (idle · breathe · attack · hurt), pixel-art/monsters anim_strip()
    ...[...monsterKeys].map((k) => load(`/assets/monsters/${k}_anim.png`)),
    ...PIN_FILES.map((k) => load(`/assets/landmarks/${k}.png`)),
  ]);
}

/** A fresh canvas of the sprite at 1x, or null if the PNG is not available. */
export function pixelSprite(sheet: Sheet, key: string): HTMLCanvasElement | null {
  const img = images.get(`/assets/${sheet}/${key}.png`);
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

/** The loaded image itself (for Phaser sprite sheets), or null if missing. */
export function pixelImage(sheet: Sheet, key: string): HTMLImageElement | null {
  return images.get(`/assets/${sheet}/${key}.png`) ?? null;
}

export function hasPixelSprite(sheet: Sheet, key: string): boolean {
  return images.has(`/assets/${sheet}/${key}.png`);
}
