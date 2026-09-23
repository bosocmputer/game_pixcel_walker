/**
 * Avatar pack loader & renderer.
 * Loads base body + hairstyles from apps/game/public/assets/avatar/manifest.json.
 * Stacks body and hair layers, recolors skin and hair tones according to HANDOFF.md,
 * and caches rendered frames as offscreen canvases.
 */

export const USE_AVATAR_PACK = true;

export type Gender = 'male' | 'female';

export interface AvatarAnimFrame {
  body: string;
  hair: string;
}

export interface AvatarStyle {
  id: string;
  gender: Gender;
  label_th: string;
  tones: number;
  anims: {
    walk_front: AvatarAnimFrame[];
    walk_back: AvatarAnimFrame[];
    idle: AvatarAnimFrame[];
  };
}

export interface AvatarManifest {
  note: string;
  cell: {
    w: number;
    h: number;
    anchor: {
      x: number;
      y: number;
      meaning: string;
    };
  };
  facing: string;
  draw_order: string[];
  body: {
    frames: string[];
    grey_to_role: Record<string, string>;
    example_skin_tones: { shadow: string; base: string }[];
  };
  hair_tone_encoding: string;
  hair_color_ramps: Record<string, string[]>;
  styles: AvatarStyle[];
}

export const AVATAR_CELL_W = 48;
export const AVATAR_CELL_H = 64;
export const AVATAR_ANCHOR_X = 24;
export const AVATAR_ANCHOR_Y = 58;
export const AVATAR_ORIGIN_X = AVATAR_ANCHOR_X / AVATAR_CELL_W; // 0.5
export const AVATAR_ORIGIN_Y = AVATAR_ANCHOR_Y / AVATAR_CELL_H; // 0.90625
export const AVATAR_WORLD_SCALE = 1.6;

type RGB = [number, number, number];

let manifest: AvatarManifest | null = null;
const imageCache = new Map<string, HTMLImageElement>();
const canvasCache = new Map<string, HTMLCanvasElement>();

function hexToRgb(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => reject(new Error(`Failed to load avatar image: ${src} (${e})`));
    img.src = src;
  });
}

/** Preload manifest and all images listed in it. */
export async function loadAvatarPack(baseUrl = '/assets/avatar'): Promise<AvatarManifest> {
  if (manifest) return manifest;

  const res = await fetch(`${baseUrl}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load avatar manifest: ${res.statusText}`);
  const data = (await res.json()) as AvatarManifest;
  manifest = data;

  if (typeof Image === 'undefined') {
    return manifest;
  }

  // Collect all image URLs to preload
  const urls = new Set<string>();
  for (const b of data.body.frames) {
    urls.add(`${baseUrl}/body/${b}`);
  }
  for (const style of data.styles) {
    for (const anim of Object.values(style.anims)) {
      for (const f of anim) {
        urls.add(`${baseUrl}/${f.body}`);
        urls.add(`${baseUrl}/${f.hair}`);
      }
    }
  }

  await Promise.all(Array.from(urls).map((u) => loadImage(u).catch((err) => {
    console.warn(`[AvatarPack] image load error:`, err);
    return null;
  })));

  return manifest;
}

export function isAvatarPackLoaded(): boolean {
  return manifest !== null;
}

export function getAvatarManifest(): AvatarManifest | null {
  return manifest;
}

export function getStylesForGender(gender: Gender): AvatarStyle[] {
  if (!manifest) return [];
  return manifest.styles.filter((s) => s.gender === gender);
}

export function getDefaultStyleForGender(gender: Gender): string {
  const styles = getStylesForGender(gender);
  return styles[0]?.id ?? (gender === 'female' ? 'F01_low_ponytail' : 'M01_short_messy');
}

export function getSkinTones(): { shadow: string; base: string }[] {
  return manifest?.body.example_skin_tones ?? [
    { shadow: '#ca9694', base: '#f0d9c6' },
    { shadow: '#a8705a', base: '#d9a47e' },
    { shadow: '#6e4632', base: '#9c6a4a' },
  ];
}

export function getHairColorRamps(): Record<string, string[]> {
  return manifest?.hair_color_ramps ?? {};
}

export function getHairRampKeys(): string[] {
  return Object.keys(manifest?.hair_color_ramps ?? { black: [], blonde: [], silver: [], red: [], blue: [] });
}

/** Swatch preview colors for UI swatches. */
export function getHairSwatchColors(): string[] {
  const ramps = getHairColorRamps();
  return Object.values(ramps).map((r) => r[3] ?? r[0] ?? '#333333');
}

export function getSkinSwatchColors(): string[] {
  return getSkinTones().map((s) => s.base);
}

/**
 * Composite and recolor a body + hair frame into a 48×64 canvas.
 * Results are cached in canvasCache.
 */
export function compositeAvatar(
  bodyPath: string,
  hairPath: string,
  skinIdx: number,
  hairColorIdx: number,
  baseUrl = '/assets/avatar',
): HTMLCanvasElement {
  const cacheKey = `${bodyPath}|${hairPath}|${skinIdx}|${hairColorIdx}`;
  const existing = canvasCache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_CELL_W;
  canvas.height = AVATAR_CELL_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const bodyImg = imageCache.get(`${baseUrl}/${bodyPath}`);
  const hairImg = imageCache.get(`${baseUrl}/${hairPath}`);

  if (!bodyImg || !hairImg) {
    // If not in cache, fallback to empty or synchronous draw if possible
    return canvas;
  }

  // 1. Draw body to get pixel data
  ctx.drawImage(bodyImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, AVATAR_CELL_W, AVATAR_CELL_H);
  const data = imgData.data;

  // Body skin colors
  const skinTones = getSkinTones();
  const skin = skinTones[skinIdx] ?? skinTones[0]!;
  const shadowRgb = hexToRgb(skin.shadow);
  const baseRgb = hexToRgb(skin.base);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i]!;
    // Exact grey matching per HANDOFF.md: 0x47 = shadow, 0x8a = base
    if (r === 0x47) {
      data[i] = shadowRgb[0];
      data[i + 1] = shadowRgb[1];
      data[i + 2] = shadowRgb[2];
    } else if (r === 0x8a) {
      data[i] = baseRgb[0];
      data[i + 1] = baseRgb[1];
      data[i + 2] = baseRgb[2];
    }
  }

  // 2. Read hair pixel data & recolor hair on top
  const hairCanvas = document.createElement('canvas');
  hairCanvas.width = AVATAR_CELL_W;
  hairCanvas.height = AVATAR_CELL_H;
  const hairCtx = hairCanvas.getContext('2d', { willReadFrequently: true });
  if (hairCtx) {
    hairCtx.drawImage(hairImg, 0, 0);
    const hairData = hairCtx.getImageData(0, 0, AVATAR_CELL_W, AVATAR_CELL_H).data;

    // Hair color ramp (6 entries, index 0 is outline)
    const rampKeys = getHairRampKeys();
    const rampKey = rampKeys[hairColorIdx] ?? rampKeys[0] ?? 'black';
    const rampHex = getHairColorRamps()[rampKey] ?? [];
    const rampRgb = rampHex.map(hexToRgb);

    for (let i = 0; i < hairData.length; i += 4) {
      if (hairData[i + 3] === 0) continue;
      const grey = hairData[i]!;
      const level = Math.min(Math.round(grey / 40), 5);
      const rgb = rampRgb[level] ?? rampRgb[0] ?? [0, 0, 0];

      // Hair overlays directly onto body
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  canvasCache.set(cacheKey, canvas);
  return canvas;
}

export type AvatarAnim = 'walk_front' | 'walk_back' | 'idle';

/**
 * Render a complete avatar frame for an appearance and animation state.
 */
export function renderAvatarFrame(
  gender: Gender,
  hairStyleId: string,
  skinIdx: number,
  hairColorIdx: number,
  anim: AvatarAnim = 'walk_front',
  frameIdx = 0,
): HTMLCanvasElement {
  if (!manifest) {
    const c = document.createElement('canvas');
    c.width = AVATAR_CELL_W;
    c.height = AVATAR_CELL_H;
    return c;
  }

  // Find style or fallback to gender default
  let style = manifest.styles.find((s) => s.id === hairStyleId);
  if (!style) {
    const defaultId = getDefaultStyleForGender(gender);
    style = manifest.styles.find((s) => s.id === defaultId) ?? manifest.styles[0]!;
  }

  const frames = style.anims[anim] ?? style.anims.walk_front;
  const frame = frames[frameIdx % frames.length]!;

  return compositeAvatar(frame.body, frame.hair, skinIdx, hairColorIdx);
}
