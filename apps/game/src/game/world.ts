import { TILE_COLORS, latLngToTile, type Landmark, type MapMeta, type TileId } from '@pw/shared';

export interface WorldData {
  meta: MapMeta;
  tiles: Uint8Array;
  landmarks: Landmark[];
}

let world: WorldData | null = null;

export function getWorld(): WorldData {
  if (!world) throw new Error('World not loaded');
  return world;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/** Loads the baked city map and decodes PNG colors back into TileIds. */
export async function loadWorld(city: string): Promise<WorldData> {
  const [meta, landmarks, img] = await Promise.all([
    fetch(`/maps/${city}.meta.json`).then((r) => r.json() as Promise<MapMeta>),
    fetch(`/maps/${city}.landmarks.json`).then((r) => r.json() as Promise<Landmark[]>),
    loadImage(`/maps/${city}.png`),
  ]);
  const c = document.createElement('canvas');
  c.width = meta.width;
  c.height = meta.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, meta.width, meta.height).data;

  const lookup = new Map<number, number>();
  for (const [id, [r, g, b]] of Object.entries(TILE_COLORS)) lookup.set((r << 16) | (g << 8) | b, Number(id));
  const tiles = new Uint8Array(meta.width * meta.height);
  for (let i = 0; i < tiles.length; i++) {
    tiles[i] = lookup.get((px[i * 4]! << 16) | (px[i * 4 + 1]! << 8) | px[i * 4 + 2]!) ?? 0;
  }
  world = { meta, tiles, landmarks };
  return world;
}

export function tileAt(x: number, y: number): TileId {
  const w = getWorld();
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= w.meta.width || iy >= w.meta.height) return 0;
  return w.tiles[iy * w.meta.width + ix] as TileId;
}

export function inBounds(lat: number, lng: number): boolean {
  const [s, w, n, e] = getWorld().meta.bbox;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

export function toTile(lat: number, lng: number) {
  return latLngToTile(getWorld().meta, lat, lng);
}
