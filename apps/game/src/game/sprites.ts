/**
 * Native-resolution 16-bit sprites drawn with the pixel-art-studio skill
 * (pixel-art/monsters, pixel-art/landmarks → /assets/...). Preloaded once at boot; art.ts falls
 * back to the old procedural sprites for anything missing.
 */
import { MONSTERS } from '@pw/shared';

type Sheet = 'monsters' | 'landmarks';
const images = new Map<string, HTMLImageElement>();
/**
 * Map pins (pixel-art/landmarks, docs/STORY.md §5): gates are rift strips per layer and rank
 * (4 frames) plus a sealed crack per rank; places without a gate have one picture each.
 */
export const PIN_RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
export const RIFT_FRAMES = 4;
export const PIN_FILES = [
  ...PIN_RANKS.flatMap((r) => [`rift_pixel_${r}`, `rift_myth_${r}`, `rift_world_${r}`, `sealed_${r}`]),
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
