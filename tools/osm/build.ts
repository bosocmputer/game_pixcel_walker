/**
 * Bakes an OpenStreetMap city extract into an 8-bit tile map for the game.
 *
 *   npx tsx build.ts chiangmai [--refresh]
 *
 * Output (apps/game/public/maps/):
 *   <city>.png            one pixel per tile, colors = TILE_COLORS
 *   <city>.meta.json      MapMeta (projection info)
 *   <city>.landmarks.json Landmark[] (brand-free labels)
 *
 * Overpass responses are cached in ./cache; pass --refresh to download again.
 */
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CITIES,
  M_PER_DEG_LAT,
  TILE,
  TILE_COLORS,
  mPerDegLng,
  type Landmark,
  type MapMeta,
  type TileId,
} from '@pw/shared';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '../../apps/game/public/maps');
const CACHE_DIR = join(HERE, 'cache');
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const LARGE_PARK_M2 = 15000;

type LatLng = { lat: number; lon: number };
interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: LatLng;
  tags?: Record<string, string>;
  geometry?: LatLng[];
  members?: { type: string; role: string; geometry?: LatLng[] }[];
}

// ---------------------------------------------------------------------------------------------
// Download

async function overpass(name: string, body: string, refresh: boolean): Promise<OsmElement[]> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = join(CACHE_DIR, `${name}.json`);
  if (!refresh && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).elements;
  console.log(`  downloading ${name}…`);
  for (let attempt = 1; attempt <= OVERPASS_MIRRORS.length * 2; attempt++) {
    const url = OVERPASS_MIRRORS[(attempt - 1) % OVERPASS_MIRRORS.length]!;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'pixel-walker-map-baker/0.1' },
      body: 'data=' + encodeURIComponent(body),
    }).catch((e: Error) => ({ ok: false, status: e.message, text: async () => '' }) as const);
    if (res.ok) {
      const text = await res.text();
      writeFileSync(file, text);
      return JSON.parse(text).elements;
    }
    console.warn(`  ${new URL(url).host} → ${res.status}, trying next mirror`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Overpass failed for ${name}`);
}

function queries(bbox: string) {
  const q = (inner: string) => `[out:json][timeout:240];(${inner});out geom;`;
  return {
    roads: q(`way["highway"](${bbox});`),
    areas: q(`
      way["natural"~"water|wood|scrub|grassland"](${bbox});
      relation["natural"~"water|wood"](${bbox});
      way["waterway"~"river|canal|stream|drain|riverbank"](${bbox});
      relation["waterway"="riverbank"](${bbox});
      way["landuse"~"grass|forest|meadow|recreation_ground|village_green|farmland|orchard|religious|cemetery|reservoir|basin"](${bbox});
      relation["landuse"~"forest|farmland|religious|reservoir"](${bbox});
      way["leisure"~"park|garden|pitch|golf_course|nature_reserve"](${bbox});
      relation["leisure"~"park|nature_reserve"](${bbox});
      way["amenity"~"place_of_worship|school|hospital|kindergarten|townhall|university|college|monastery|grave_yard"](${bbox});
      relation["amenity"~"place_of_worship|school|hospital|university"](${bbox});
    `),
    buildings: q(`way["building"](${bbox});`),
    pois: `[out:json][timeout:120];(
      node["shop"="convenience"](${bbox});way["shop"="convenience"](${bbox});
      node["amenity"="fuel"](${bbox});way["amenity"="fuel"](${bbox});
    );out center tags;`,
  };
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers

/** Joins open way segments into closed rings (multipolygon members are often split). */
function assembleRings(segments: LatLng[][]): LatLng[][] {
  const key = (p: LatLng) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
  const rings: LatLng[][] = [];
  const open = segments.filter((s) => s.length > 1).map((s) => [...s]);
  while (open.length) {
    let ring = open.shift()!;
    let grew = true;
    while (key(ring[0]!) !== key(ring[ring.length - 1]!) && grew) {
      grew = false;
      const tail = key(ring[ring.length - 1]!);
      for (let i = 0; i < open.length; i++) {
        const s = open[i]!;
        if (key(s[0]!) === tail) ring = ring.concat(s.slice(1));
        else if (key(s[s.length - 1]!) === tail) ring = ring.concat([...s].reverse().slice(1));
        else continue;
        open.splice(i, 1);
        grew = true;
        break;
      }
    }
    rings.push(ring);
  }
  return rings;
}

function polygonsOf(el: OsmElement): LatLng[][] {
  if (el.type === 'way' && el.geometry) return [el.geometry];
  if (el.type === 'relation' && el.members) {
    return assembleRings(el.members.filter((m) => m.type === 'way' && m.geometry).map((m) => m.geometry!));
  }
  return [];
}

function ringAreaM2(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const lat0 = ring[0]!.lat;
  const kx = mPerDegLng(lat0);
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    a += p.lon * kx * (q.lat * M_PER_DEG_LAT) - q.lon * kx * (p.lat * M_PER_DEG_LAT);
  }
  return Math.abs(a / 2);
}

function centroid(ring: LatLng[]): LatLng {
  const n = ring.length;
  return {
    lat: ring.reduce((s, p) => s + p.lat, 0) / n,
    lon: ring.reduce((s, p) => s + p.lon, 0) / n,
  };
}

// ---------------------------------------------------------------------------------------------
// Rasterize

class Raster {
  readonly tiles: Uint8Array;
  private readonly ctx: SKRSContext2D;
  private readonly canvas;

  constructor(
    readonly meta: MapMeta,
  ) {
    this.tiles = new Uint8Array(meta.width * meta.height).fill(TILE.GROUND);
    this.canvas = createCanvas(meta.width, meta.height);
    this.ctx = this.canvas.getContext('2d');
  }

  private px(p: LatLng): [number, number] {
    const [, west, north] = this.meta.bbox;
    return [
      ((p.lon - west) * this.meta.mPerDegLng) / this.meta.tileMeters,
      ((north - p.lat) * this.meta.mPerDegLat) / this.meta.tileMeters,
    ];
  }

  /** Draws one layer as a white mask, then stamps `tile` wherever the mask is >= 50%. */
  layer(tile: TileId, draw: (ctx: SKRSContext2D, px: (p: LatLng) => [number, number]) => void) {
    const { ctx } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.meta.width, this.meta.height);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    draw(ctx, (p) => this.px(p));
    const data = ctx.getImageData(0, 0, this.meta.width, this.meta.height).data;
    for (let i = 0; i < this.tiles.length; i++) if (data[i * 4]! >= 128) this.tiles[i] = tile;
  }

  fillPolygons(tile: TileId, polys: LatLng[][][]) {
    this.layer(tile, (ctx, px) => {
      for (const rings of polys) {
        ctx.beginPath();
        for (const ring of rings) {
          ring.forEach((p, i) => {
            const [x, y] = px(p);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
        ctx.fill('evenodd');
      }
    });
  }

  strokeLines(tile: TileId, lines: { geom: LatLng[]; width: number }[]) {
    this.layer(tile, (ctx, px) => {
      for (const { geom, width } of lines) {
        ctx.lineWidth = width;
        ctx.beginPath();
        geom.forEach((p, i) => {
          const [x, y] = px(p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    });
  }

  toPng(): Buffer {
    const { width, height } = this.meta;
    const img = this.ctx.createImageData(width, height);
    for (let i = 0; i < this.tiles.length; i++) {
      const [r, g, b] = TILE_COLORS[this.tiles[i] as TileId];
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    this.ctx.putImageData(img, 0, 0);
    return this.canvas.toBuffer('image/png');
  }
}

// ---------------------------------------------------------------------------------------------
// Classification

const tag = (el: OsmElement, k: string) => el.tags?.[k];

const MAJOR_ROADS = /^(motorway|trunk|primary)(_link)?$/;
const MID_ROADS = /^(secondary|tertiary)(_link)?$/;
const MINOR_ROADS = /^(residential|unclassified|service|living_street|road)$/;
const PATHS = /^(footway|path|pedestrian|cycleway|steps|track|bridleway)$/;

function roadWidth(el: OsmElement): { tile: TileId; width: number } | null {
  const h = tag(el, 'highway') ?? '';
  if (MAJOR_ROADS.test(h)) return { tile: TILE.ROAD_MAJOR, width: 3 };
  if (MID_ROADS.test(h)) return { tile: TILE.ROAD_MAJOR, width: 2 };
  if (MINOR_ROADS.test(h)) return { tile: TILE.ROAD_MINOR, width: 1.2 };
  if (PATHS.test(h)) return { tile: TILE.PATH, width: 1 };
  return null;
}

function areaTile(el: OsmElement): TileId | null {
  const natural = tag(el, 'natural');
  const landuse = tag(el, 'landuse');
  const leisure = tag(el, 'leisure');
  const amenity = tag(el, 'amenity');
  const waterway = tag(el, 'waterway');
  if (
    amenity && /^(place_of_worship|school|hospital|kindergarten|townhall|monastery|grave_yard)$/.test(amenity)
  ) return TILE.SAFE;
  if (landuse === 'religious' || landuse === 'cemetery') return TILE.SAFE;
  if (natural === 'water' || waterway === 'riverbank' || landuse === 'reservoir' || landuse === 'basin') return TILE.WATER;
  if (natural === 'wood' || landuse === 'forest' || leisure === 'nature_reserve') return TILE.FOREST;
  if (landuse === 'farmland' || landuse === 'orchard') return TILE.FARMLAND;
  if (
    natural === 'scrub' || natural === 'grassland' ||
    (landuse && /^(grass|meadow|recreation_ground|village_green)$/.test(landuse)) ||
    (leisure && /^(park|garden|pitch|golf_course)$/.test(leisure))
  ) return TILE.GREEN;
  return null;
}

function isClosed(el: OsmElement): boolean {
  if (el.type === 'relation') return true;
  const g = el.geometry;
  return !!g && g.length > 3 && g[0]!.lat === g[g.length - 1]!.lat && g[0]!.lon === g[g.length - 1]!.lon;
}

// ---------------------------------------------------------------------------------------------
// Main

async function main() {
  const cityId = process.argv[2] ?? 'chiangmai';
  const refresh = process.argv.includes('--refresh');
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const [south, west, north, east] = city.bbox;
  const bboxStr = `${south},${west},${north},${east}`;
  const refLat = (south + north) / 2;

  const meta: MapMeta = {
    city: city.id,
    bbox: city.bbox,
    tileMeters: city.tileMeters,
    mPerDegLng: mPerDegLng(refLat),
    mPerDegLat: M_PER_DEG_LAT,
    width: Math.ceil(((east - west) * mPerDegLng(refLat)) / city.tileMeters),
    height: Math.ceil(((north - south) * M_PER_DEG_LAT) / city.tileMeters),
    generatedAt: new Date().toISOString(),
  };
  console.log(`Baking ${city.nameTh}: ${meta.width}×${meta.height} tiles @ ${city.tileMeters} m`);

  const q = queries(bboxStr);
  const roads = await overpass(`${cityId}-roads`, q.roads, refresh);
  const areas = await overpass(`${cityId}-areas`, q.areas, refresh);
  const buildings = await overpass(`${cityId}-buildings`, q.buildings, refresh);
  const pois = await overpass(`${cityId}-pois`, q.pois, refresh);
  console.log(`  roads ${roads.length}, areas ${areas.length}, buildings ${buildings.length}, pois ${pois.length}`);

  const raster = new Raster(meta);
  const byTile = new Map<TileId, LatLng[][][]>();
  const waterLines: { geom: LatLng[]; width: number }[] = [];
  for (const el of areas) {
    const ww = tag(el, 'waterway');
    if (ww && ww !== 'riverbank' && el.geometry) {
      waterLines.push({ geom: el.geometry, width: ww === 'river' ? 4 : ww === 'canal' ? 2 : 1 });
      continue;
    }
    const tile = areaTile(el);
    if (tile === null || !isClosed(el)) continue;
    const list = byTile.get(tile) ?? [];
    list.push(polygonsOf(el));
    byTile.set(tile, list);
  }
  const fill = (t: TileId) => raster.fillPolygons(t, byTile.get(t) ?? []);

  // Paint order matters: later layers win.
  fill(TILE.FARMLAND);
  fill(TILE.GREEN);
  fill(TILE.FOREST);
  fill(TILE.WATER);
  raster.strokeLines(TILE.WATER, waterLines);
  raster.fillPolygons(
    TILE.BUILDING,
    buildings.filter((b) => b.geometry && b.geometry.length > 3).map((b) => [b.geometry!]),
  );
  fill(TILE.SAFE);
  const lines = (t: TileId) =>
    roads
      .map((r) => ({ r, w: roadWidth(r) }))
      .filter((x) => x.w?.tile === t && x.r.geometry && tag(x.r, 'area') !== 'yes')
      .map((x) => ({ geom: x.r.geometry!, width: x.w!.width }));
  raster.strokeLines(TILE.PATH, lines(TILE.PATH));
  raster.strokeLines(TILE.ROAD_MINOR, lines(TILE.ROAD_MINOR));
  raster.strokeLines(TILE.ROAD_MAJOR, lines(TILE.ROAD_MAJOR));

  // Landmarks — generic labels only (no brand names in player-facing text).
  const landmarks: Landmark[] = [];
  let n = { CONVENIENCE: 0, FUEL: 0, PARK: 0 };
  for (const el of pois) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    const street = tag(el, 'addr:street');
    if (tag(el, 'shop') === 'convenience') {
      n.CONVENIENCE++;
      landmarks.push({ id: `cv_${el.type[0]}${el.id}`, kind: 'CONVENIENCE', label: `ร้านสะดวกซื้อ${street ? ` (${street})` : ` #${n.CONVENIENCE}`}`, lat, lng: lon });
    } else if (tag(el, 'amenity') === 'fuel') {
      n.FUEL++;
      landmarks.push({ id: `fu_${el.type[0]}${el.id}`, kind: 'FUEL', label: `ปั๊มน้ำมัน${street ? ` (${street})` : ` #${n.FUEL}`}`, lat, lng: lon });
    }
  }
  for (const el of areas) {
    if (tag(el, 'leisure') !== 'park' || !isClosed(el)) continue;
    const outer = polygonsOf(el).sort((a, b) => ringAreaM2(b) - ringAreaM2(a))[0];
    if (!outer) continue;
    const area = ringAreaM2(outer);
    if (area < LARGE_PARK_M2) continue;
    const c = centroid(outer);
    n.PARK++;
    landmarks.push({ id: `pk_${el.type[0]}${el.id}`, kind: 'PARK', label: tag(el, 'name:th') ?? tag(el, 'name') ?? `สวนสาธารณะ #${n.PARK}`, lat: c.lat, lng: c.lon, area: Math.round(area) });
  }
  console.log(`  landmarks: ${n.CONVENIENCE} convenience, ${n.FUEL} fuel, ${n.PARK} large parks`);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${cityId}.png`), raster.toPng());
  writeFileSync(join(OUT_DIR, `${cityId}.meta.json`), JSON.stringify(meta, null, 2));
  writeFileSync(join(OUT_DIR, `${cityId}.landmarks.json`), JSON.stringify(landmarks));

  const counts = new Array(10).fill(0);
  for (const t of raster.tiles) counts[t]++;
  const pct = (i: number) => ((counts[i] / raster.tiles.length) * 100).toFixed(1) + '%';
  console.log(`  tiles: ground ${pct(0)} green ${pct(1)} forest ${pct(2)} farm ${pct(3)} water ${pct(4)} building ${pct(5)} safe ${pct(6)} path ${pct(7)} road ${pct(8)}/${pct(9)}`);
  console.log(`Done → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
