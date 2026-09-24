/**
 * Avatar pack loader & renderer.
 * Loads base body + hairstyles from apps/game/public/assets/avatar/manifest.json.
 * Stacks body, equipment and hair layers (pixel work in `gear.ts`), recolors skin and hair tones
 * according to HANDOFF.md, and caches rendered frames as offscreen canvases.
 */
import { composeAvatar, gearKey, packOutfitId, type GearLook } from './gear';

export const USE_AVATAR_PACK = true;

export type Gender = 'male' | 'female';

export interface AvatarAnimFrame {
  body: string;
  hair: string;
  /** Slash frames only: the fist over the grip (grey, recoloured like the body). */
  hand?: string;
  /** Slash frames only: the pack sword, which replaces the procedural weapon. */
  weapon?: string;
  /** Slash frames only: the trail, drawn behind the body. */
  fx?: string;
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
    slash?: AvatarAnimFrame[];
  };
}

/** manifest.actions.<name>: how a one-shot action plays. */
export interface AvatarAction {
  frames: number;
  frame_ms: number[];
  hit_frame: number;
  labels?: string[];
  weapon?: string;
  note?: string;
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
  /** Hand-drawn outfit layers: one PNG per body frame under outfit/<id>/. */
  outfits?: { id: string; label_th: string; label_en: string; gender: string; recolor: boolean; frames: string[] }[];
  outfit_rule?: string;
  actions?: Record<string, AvatarAction>;
}

export const AVATAR_CELL_W = 48;
export const AVATAR_CELL_H = 64;
export const AVATAR_ANCHOR_X = 24;
export const AVATAR_ANCHOR_Y = 58;
export const AVATAR_ORIGIN_X = AVATAR_ANCHOR_X / AVATAR_CELL_W; // 0.5
export const AVATAR_ORIGIN_Y = AVATAR_ANCHOR_Y / AVATAR_CELL_H; // 0.90625
export const AVATAR_WORLD_SCALE = 1.6;
/** Standing animation: starts after this long without a step, then one frame every IDLE_MS. */
export const IDLE_DELAY_MS = 300;
export const IDLE_MS = 350;


let manifest: AvatarManifest | null = null;
const imageCache = new Map<string, HTMLImageElement>();
const canvasCache = new Map<string, HTMLCanvasElement>();


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
    for (const o of data.outfits ?? []) urls.add(`${baseUrl}/outfit/${o.id}/${b}`);
  }
  for (const style of data.styles) {
    for (const anim of Object.values(style.anims)) {
      for (const f of anim ?? []) {
        for (const layer of [f.body, f.hair, f.hand, f.weapon, f.fx]) if (layer) urls.add(`${baseUrl}/${layer}`);
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

/**
 * How many frames the standing animation of a hairstyle has (0 = pack not loaded / no idle art).
 * Each style has its own list because the idle poses reuse different body frames.
 */
export function idleFrameCount(gender: Gender, hairStyleId: string): number {
  return animFrameCount(gender, hairStyleId, 'idle');
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

/** Raw pixels of a loaded pack image (read once, reused for every recolour). */
const rawCache = new Map<string, ImageData>();
function rawPixels(src: string): ImageData | null {
  const hit = rawCache.get(src);
  if (hit) return hit;
  const img = imageCache.get(src);
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = AVATAR_CELL_W;
  c.height = AVATAR_CELL_H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, AVATAR_CELL_W, AVATAR_CELL_H);
  rawCache.set(src, data);
  return data;
}

/**
 * Composite one frame into a 48×64 canvas: recoloured body, equipment layers, hair.
 * Results are cached per (frame, skin, hair colour, gear).
 */
export function compositeAvatar(
  bodyPath: string,
  hairPath: string,
  skinIdx: number,
  hairColorIdx: number,
  gear: GearLook = {},
  baseUrl = '/assets/avatar',
  action?: { hand?: string; weapon?: string; fx?: string },
): HTMLCanvasElement {
  const cacheKey = `${bodyPath}|${hairPath}|${skinIdx}|${hairColorIdx}|${gearKey(gear)}|${action?.weapon ?? ''}`;
  const existing = canvasCache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_CELL_W;
  canvas.height = AVATAR_CELL_H;
  const ctx = canvas.getContext('2d');
  const body = rawPixels(`${baseUrl}/${bodyPath}`);
  if (!ctx || !body) return canvas;

  const skinTones = getSkinTones();
  const rampKeys = getHairRampKeys();
  const hairRamp = getHairColorRamps()[rampKeys[hairColorIdx] ?? rampKeys[0] ?? 'black'] ?? ['#000000'];
  // Outfit frames are named after the body frame they cover (HANDOFF.md), never after the anim index.
  const outfitId = packOutfitId(gear.chest);
  const outfit = outfitId ? rawPixels(`${baseUrl}/outfit/${outfitId}/${bodyPath.split('/').pop()}`) : null;
  const out = ctx.createImageData(AVATAR_CELL_W, AVATAR_CELL_H);
  composeAvatar(body, rawPixels(`${baseUrl}/${hairPath}`), out, {
    skin: skinTones[skinIdx] ?? skinTones[0]!,
    hairRamp,
    gear,
    outfit,
    hand: action?.hand ? rawPixels(`${baseUrl}/${action.hand}`) : null,
    packWeapon: action?.weapon ? rawPixels(`${baseUrl}/${action.weapon}`) : null,
    fx: action?.fx ? rawPixels(`${baseUrl}/${action.fx}`) : null,
  });
  ctx.putImageData(out, 0, 0);
  canvasCache.set(cacheKey, canvas);
  return canvas;
}

export type AvatarAnim = 'walk_front' | 'walk_back' | 'idle' | 'slash';

/** Timing of a one-shot action from the manifest (slash: wind-up / strike / follow-through). */
export function avatarAction(name: string): AvatarAction | null {
  return manifest?.actions?.[name] ?? null;
}

/** How many frames a style has for an animation (0 = pack not loaded / style has no such anim). */
export function animFrameCount(gender: Gender, hairStyleId: string, anim: AvatarAnim): number {
  if (!manifest) return 0;
  const style = manifest.styles.find((s) => s.id === hairStyleId)
    ?? manifest.styles.find((s) => s.id === getDefaultStyleForGender(gender));
  return style?.anims[anim]?.length ?? 0;
}

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
  gear: GearLook = {},
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
  // Slash frames carry their own sword, fist and trail layers.
  const action = frame.weapon || frame.hand || frame.fx ? { hand: frame.hand, weapon: frame.weapon, fx: frame.fx } : undefined;

  return compositeAvatar(frame.body, frame.hair, skinIdx, hairColorIdx, { ...gear, gender }, '/assets/avatar', action);
}
