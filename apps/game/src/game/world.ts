/**
 * Streaming real-world map. Vector tiles (OpenMapTiles schema) come free from OpenFreeMap and
 * are rasterized in the browser into our 16-bit tile grid, so the game works anywhere on Earth.
 *
 * Grid: one data chunk = one z14 vector tile = CHUNK_TILES² game tiles (~9 m per tile near the
 * equator). Coordinates are local to an origin chunk so Phaser positions stay small
 * (float32 precision).
 */
import { VectorTile, type VectorTileFeature } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { M_PER_DEG_LAT, TILE, haversine, mPerDegLng, type Landmark, type TileId } from '@pw/shared';

export const DATA_Z = 14;
export const CHUNK_TILES = 256;
const WORLD_TILES = 2 ** DATA_Z * CHUNK_TILES;
const TILEJSON = 'https://tiles.openfreemap.org/planet';
const LARGE_PARK_M2 = 15000;

/**
 * Map POIs that become landmarks (docs/STORY.md §4) — generic, brand-free labels that work in any
 * country. Class/subclass values come from the OpenMapTiles `poi` layer that OpenFreeMap serves;
 * `npx tsx tools/osm/probe-pois.mts` counts what exists around a few cities.
 */
type PoiKind = 'CONVENIENCE' | 'MALL' | 'FUEL' | 'STATION' | 'TEMPLE' | 'MUSEUM' | 'HOSPITAL' | 'MARKET' | 'SANCTUARY';
const POI_LABEL: Record<PoiKind, { prefix: string; th: string }> = {
  CONVENIENCE: { prefix: 'cv', th: 'ร้านสะดวกซื้อ' },
  MALL: { prefix: 'ml', th: 'ห้างสรรพสินค้า' },
  FUEL: { prefix: 'fu', th: 'ปั๊มน้ำมัน' },
  STATION: { prefix: 'st', th: 'สถานี' },
  TEMPLE: { prefix: 'tp', th: 'วัด' },
  MUSEUM: { prefix: 'mu', th: 'พิพิธภัณฑ์' },
  HOSPITAL: { prefix: 'hp', th: 'โรงพยาบาล' },
  MARKET: { prefix: 'mk', th: 'ตลาด' },
  SANCTUARY: { prefix: 'sa', th: 'ศาสนสถาน' },
};
/** Place-of-worship labels by faith; only Buddhist temples host the guardian trial (a gate). */
const FAITH_LABEL: Record<string, string> = {
  christian: 'โบสถ์',
  muslim: 'มัสยิด',
  shinto: 'ศาลเจ้า',
  hindu: 'เทวสถาน',
  jewish: 'ธรรมศาลา',
  sikh: 'คุรุทวารา',
  chinese_folk: 'ศาลเจ้าจีน',
  taoist: 'ศาลเจ้าจีน',
};
function poiKind(cls?: string, sub?: string): PoiKind | null {
  if (cls === 'shop' && sub === 'convenience') return 'CONVENIENCE';
  if (sub === 'mall' || sub === 'department_store') return 'MALL';
  if (cls === 'fuel') return 'FUEL';
  if (cls === 'railway' || sub === 'bus_station' || cls === 'ferry_terminal') return 'STATION';
  if (cls === 'place_of_worship') return sub === 'buddhist' ? 'TEMPLE' : 'SANCTUARY';
  if (cls === 'museum' || cls === 'castle' || cls === 'monument') return 'MUSEUM';
  if (cls === 'hospital' && sub === 'hospital') return 'HOSPITAL';
  if (sub === 'marketplace') return 'MARKET';
  return null;
}
function poiLabel(kind: PoiKind, cls?: string, sub?: string): string {
  if (kind === 'SANCTUARY') return FAITH_LABEL[sub ?? ''] ?? POI_LABEL.SANCTUARY.th;
  if (kind === 'STATION') return cls === 'ferry_terminal' ? 'ท่าเรือ' : sub === 'bus_station' ? 'สถานีขนส่ง' : 'สถานีรถไฟ';
  if (kind === 'MUSEUM') return cls === 'castle' ? (sub === 'ruins' ? 'โบราณสถาน' : 'ปราสาท') : cls === 'monument' ? 'อนุสาวรีย์' : 'พิพิธภัณฑ์';
  return POI_LABEL[kind].th;
}
/**
 * Dense cities list the same place many times (entrances, platforms): keep one pin per ~60 m,
 * and one convenience store per ~270 m so megacities don't drown in them.
 */
const DEDUPE_DEG = 0.0006;
const DEDUPE_DEG_BY_KIND: Partial<Record<PoiKind, number>> = { CONVENIENCE: 0.0025 };
const MAX_INFLIGHT = 4;

interface Chunk {
  tiles: Uint8Array;
  landmarks: Landmark[];
}

const chunks = new Map<string, Chunk>();
const pending = new Map<string, Promise<void>>();
const failed = new Map<string, number>();
const listeners = new Set<(cx: number, cy: number) => void>();
const landmarkIndex = new Map<string, Landmark>();
let tileUrl: string | null = null;
let inflight = 0;
const queue: (() => void)[] = [];

/** Global tile coords of the local origin (top-left of the origin chunk). */
let originX = 0;
let originY = 0;
let ready = false;

// ---------------------------------------------------------------------------------------------
// Projection (Web Mercator)

function globalTile(lat: number, lng: number): { x: number; y: number } {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * WORLD_TILES,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD_TILES,
  };
}

function globalToLatLng(x: number, y: number): { lat: number; lng: number } {
  const n = Math.PI - (2 * Math.PI * y) / WORLD_TILES;
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng: (x / WORLD_TILES) * 360 - 180 };
}

/** Sets the local origin at the chunk containing (lat, lng). Call once before rendering. */
export function initWorld(lat: number, lng: number) {
  const g = globalTile(lat, lng);
  originX = Math.floor(g.x / CHUNK_TILES) * CHUNK_TILES;
  originY = Math.floor(g.y / CHUNK_TILES) * CHUNK_TILES;
  ready = true;
}

export const worldReady = () => ready;

export function toTile(lat: number, lng: number): { x: number; y: number } {
  const g = globalTile(lat, lng);
  return { x: g.x - originX, y: g.y - originY };
}

export function toLatLng(x: number, y: number): { lat: number; lng: number } {
  return globalToLatLng(x + originX, y + originY);
}

export function metersPerTile(lat: number): number {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / WORLD_TILES;
}

/** Meters per degree, for moving the simulated walker. */
export const degScale = (lat: number) => ({ lat: M_PER_DEG_LAT, lng: mPerDegLng(lat) });

// ---------------------------------------------------------------------------------------------
// Tile lookup

const chunkKey = (cx: number, cy: number) => `${cx},${cy}`;
const chunkOf = (x: number, y: number) => ({
  cx: Math.floor((x + originX) / CHUNK_TILES),
  cy: Math.floor((y + originY) / CHUNK_TILES),
});

export function tileAt(x: number, y: number): TileId {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const { cx, cy } = chunkOf(ix, iy);
  const c = chunks.get(chunkKey(cx, cy));
  if (!c) return TILE.GROUND;
  const lx = ix + originX - cx * CHUNK_TILES;
  const ly = iy + originY - cy * CHUNK_TILES;
  return c.tiles[ly * CHUNK_TILES + lx] as TileId;
}

export function isLoaded(x: number, y: number): boolean {
  const { cx, cy } = chunkOf(Math.floor(x), Math.floor(y));
  return chunks.has(chunkKey(cx, cy));
}

/** Local tile rect covered by a data chunk (for invalidating render chunks). */
export function chunkRect(cx: number, cy: number) {
  return { x: cx * CHUNK_TILES - originX, y: cy * CHUNK_TILES - originY, size: CHUNK_TILES };
}

export function onChunkLoaded(fn: (cx: number, cy: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Requests every data chunk within `radius` chunks of local tile (x, y). */
export function ensureAround(x: number, y: number, radius = 1) {
  const { cx, cy } = chunkOf(Math.floor(x), Math.floor(y));
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) void loadChunk(cx + dx, cy + dy);
  }
}

export function loadingCount(): number {
  return pending.size;
}

export function landmarksAround(lat: number, lng: number, radiusM: number): Landmark[] {
  const here = { lat, lng };
  const d = radiusM / 100000;
  const out: Landmark[] = [];
  for (const l of landmarkIndex.values()) {
    if (Math.abs(l.lat - lat) > d * 1.2 || Math.abs(l.lng - lng) > d * 1.3) continue;
    if (haversine(here, l) <= radiusM) out.push(l);
  }
  return out.sort((a, b) => haversine(here, a) - haversine(here, b));
}

// ---------------------------------------------------------------------------------------------
// Loading

async function getTileUrl(): Promise<string> {
  if (tileUrl) return tileUrl;
  const tj = (await (await fetch(TILEJSON)).json()) as { tiles: string[] };
  tileUrl = tj.tiles[0]!;
  return tileUrl;
}

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      inflight++;
      fn().then(resolve, reject).finally(() => {
        inflight--;
        queue.shift()?.();
      });
    };
    if (inflight < MAX_INFLIGHT) run();
    else queue.push(run);
  });
}

function loadChunk(cx: number, cy: number): Promise<void> {
  const key = chunkKey(cx, cy);
  if (chunks.has(key)) return Promise.resolve();
  const existing = pending.get(key);
  if (existing) return existing;
  if ((failed.get(key) ?? 0) > Date.now()) return Promise.resolve();
  const n = 2 ** DATA_Z;
  if (cy < 0 || cy >= n) return Promise.resolve();
  const wx = ((cx % n) + n) % n;

  const p = throttle(async () => {
    const url = (await getTileUrl()).replace('{z}', String(DATA_Z)).replace('{x}', String(wx)).replace('{y}', String(cy));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`tile ${res.status}`);
    const tile = new VectorTile(new Protobuf(new Uint8Array(await res.arrayBuffer())));
    const chunk = rasterize(tile, cx, cy);
    chunks.set(key, chunk);
    for (const l of chunk.landmarks) landmarkIndex.set(l.id, l);
  })
    .then(() => {
      for (const fn of listeners) fn(cx, cy);
    })
    .catch((err) => {
      console.warn('map chunk failed', key, err);
      failed.set(key, Date.now() + 15000); // retry later
    })
    .finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

// ---------------------------------------------------------------------------------------------
// Rasterization (same paint order as the offline baker)

type Ring = { x: number; y: number }[];

const MAJOR = new Set(['motorway', 'trunk', 'primary']);
const MID = new Set(['secondary', 'tertiary']);
const MINOR = new Set(['minor', 'service', 'track', 'raceway', 'busway']);
const SAFE_LANDUSE = new Set(['school', 'kindergarten', 'hospital', 'cemetery', 'religious']);
const GREEN_LANDUSE = new Set(['pitch', 'stadium', 'playground', 'garden']);

let raster: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
function rasterCtx() {
  if (!raster) {
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK_TILES;
    canvas.height = CHUNK_TILES;
    raster = { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! };
  }
  return raster.ctx;
}

function features(tile: VectorTile, layer: string): VectorTileFeature[] {
  const l = tile.layers[layer];
  if (!l) return [];
  const out: VectorTileFeature[] = [];
  for (let i = 0; i < l.length; i++) out.push(l.feature(i));
  return out;
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

function rasterize(tile: VectorTile, cx: number, cy: number): Chunk {
  const tiles = new Uint8Array(CHUNK_TILES * CHUNK_TILES).fill(TILE.GROUND);
  const ctx = rasterCtx();
  const extent = tile.layers.water?.extent ?? tile.layers.transportation?.extent ?? 4096;
  const k = CHUNK_TILES / extent;

  const stamp = (id: TileId, draw: () => void) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CHUNK_TILES, CHUNK_TILES);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    draw();
    const data = ctx.getImageData(0, 0, CHUNK_TILES, CHUNK_TILES).data;
    for (let i = 0; i < tiles.length; i++) if (data[i * 4]! >= 128) tiles[i] = id;
  };
  const fill = (id: TileId, fs: VectorTileFeature[]) => {
    if (!fs.length) return;
    stamp(id, () => {
      for (const f of fs) {
        if (f.type !== 3) continue;
        ctx.beginPath();
        for (const ring of f.loadGeometry()) {
          ring.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)));
          ctx.closePath();
        }
        ctx.fill('evenodd');
      }
    });
  };
  const stroke = (id: TileId, fs: { f: VectorTileFeature; w: number }[]) => {
    if (!fs.length) return;
    stamp(id, () => {
      for (const { f, w } of fs) {
        if (f.type !== 2) continue;
        ctx.lineWidth = w;
        for (const line of f.loadGeometry()) {
          ctx.beginPath();
          line.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)));
          ctx.stroke();
        }
      }
    });
  };

  const prop = (f: VectorTileFeature, key: string) => f.properties[key] as string | undefined;
  const landcover = features(tile, 'landcover');
  const landuse = features(tile, 'landuse');
  const pois = features(tile, 'poi');

  fill(TILE.FARMLAND, landcover.filter((f) => prop(f, 'class') === 'farmland'));
  fill(TILE.GREEN, [
    ...landcover.filter((f) => ['grass', 'wetland'].includes(prop(f, 'class') ?? '')),
    ...landuse.filter((f) => GREEN_LANDUSE.has(prop(f, 'class') ?? '')),
    ...features(tile, 'park'),
  ]);
  fill(TILE.FOREST, landcover.filter((f) => prop(f, 'class') === 'wood'));
  fill(TILE.WATER, features(tile, 'water'));
  stroke(
    TILE.WATER,
    features(tile, 'waterway')
      .filter((f) => prop(f, 'brunnel') !== 'tunnel')
      .map((f) => ({ f, w: prop(f, 'class') === 'river' ? 3 : prop(f, 'class') === 'canal' ? 2 : 1 })),
  );
  fill(TILE.BUILDING, features(tile, 'building'));
  fill(TILE.SAFE, landuse.filter((f) => SAFE_LANDUSE.has(prop(f, 'class') ?? '')));
  // Temples are often mapped only as points: protect a small disc around them.
  const worship = pois.filter((f) => prop(f, 'class') === 'place_of_worship');
  if (worship.length) {
    stamp(TILE.SAFE, () => {
      for (const f of worship) {
        const p = f.loadGeometry()[0]?.[0];
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x * k, p.y * k, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  const roads = features(tile, 'transportation').filter((f) => prop(f, 'brunnel') !== 'tunnel');
  const byClass = (set: Set<string> | string, w: number) =>
    roads.filter((f) => (typeof set === 'string' ? prop(f, 'class') === set : set.has(prop(f, 'class') ?? ''))).map((f) => ({ f, w }));
  stroke(TILE.PATH, byClass('path', 1));
  stroke(TILE.ROAD_MINOR, byClass(MINOR, 1.2));
  stroke(TILE.ROAD_MAJOR, [...byClass(MID, 2), ...byClass(MAJOR, 3)]);

  // Landmarks — generic, brand-free labels.
  const landmarks: Landmark[] = [];
  const toLL = (px: number, py: number) => globalToLatLng(cx * CHUNK_TILES + px * k, cy * CHUNK_TILES + py * k);
  const seen = new Set<string>();
  for (const f of pois) {
    const cls = prop(f, 'class');
    const sub = prop(f, 'subclass');
    const kind = poiKind(cls, sub);
    if (!kind) continue;
    const p = f.loadGeometry()[0]?.[0];
    if (!p || p.x < 0 || p.y < 0 || p.x >= extent || p.y >= extent) continue;
    const ll = toLL(p.x, p.y);
    const step = DEDUPE_DEG_BY_KIND[kind] ?? DEDUPE_DEG;
    const cell = `${kind}:${Math.round(ll.lat / step)}:${Math.round(ll.lng / step)}`;
    if (seen.has(cell)) continue;
    seen.add(cell);
    const id = `${POI_LABEL[kind].prefix}_${f.id ?? `${ll.lat.toFixed(5)}_${ll.lng.toFixed(5)}`}`;
    landmarks.push({ id, kind, label: poiLabel(kind, cls, sub), lat: ll.lat, lng: ll.lng });
  }
  const mPerUnit = metersPerTile(toLL(extent / 2, extent / 2).lat) * k;
  for (const f of landcover) {
    if (prop(f, 'subclass') !== 'park' || f.type !== 3) continue;
    const outer = f.loadGeometry().sort((a, b) => ringArea(b) - ringArea(a))[0];
    if (!outer) continue;
    const area = ringArea(outer) * mPerUnit * mPerUnit;
    if (area < LARGE_PARK_M2) continue;
    const c = outer.reduce((s, p) => ({ x: s.x + p.x / outer.length, y: s.y + p.y / outer.length }), { x: 0, y: 0 });
    if (c.x < 0 || c.y < 0 || c.x >= extent || c.y >= extent) continue;
    const ll = toLL(c.x, c.y);
    landmarks.push({ id: `pk_${f.id ?? `${ll.lat.toFixed(4)}_${ll.lng.toFixed(4)}`}`, kind: 'PARK', label: 'สวนสาธารณะ', lat: ll.lat, lng: ll.lng, area: Math.round(area) });
  }
  return { tiles, landmarks };
}
