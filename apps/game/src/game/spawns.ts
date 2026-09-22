/** Client side of world spawns: terrain lookup from streamed map data + per-player kill list. */
import { FIGHT_RANGE_M, TILE, haversine, spawnsAround, tileTerrain, type Spawn, type Terrain } from '@pw/shared';
import { store } from '../state/store';
import { isLoaded, tileAt, toTile } from './world';

/** Degrees covering the play radius (+20%); longitude degrees shrink with latitude. */
const viewRadiusDeg = (lat: number) => (FIGHT_RANGE_M * 1.2) / (111320 * Math.cos((lat * Math.PI) / 180));
/** Draw at most this many (nearest first) to keep the screen readable and phones smooth. */
const MAX_VISIBLE = 60;

function terrainAt(lat: number, lng: number): Terrain | null {
  const t = toTile(lat, lng);
  if (!isLoaded(t.x, t.y)) return null;
  const tile = tileAt(t.x, t.y);
  if (tile === TILE.BUILDING) return null; // no monsters on rooftops
  return tileTerrain(tile); // null for temples, schools, hospitals
}

let cache: { key: string; spawns: Spawn[] } | null = null;

/** Live spawns near a position, excluding ones this player already defeated. */
export function visibleSpawns(lat: number, lng: number, now = Date.now()): Spawn[] {
  const s = store.s;
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${Math.floor(now / 5000)},${s.level}`;
  if (!cache || cache.key !== key) cache = { key, spawns: spawnsAround(lat, lng, viewRadiusDeg(lat), now, s.level, terrainAt) };
  const here = { lat, lng };
  return cache.spawns
    .filter((sp) => sp.expiresAt > now && !s.killedSpawns[sp.id])
    .map((sp) => ({ sp, d: haversine(here, sp) }))
    .filter((x) => x.d <= FIGHT_RANGE_M)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_VISIBLE)
    .map((x) => x.sp);
}

export function invalidateSpawns() {
  cache = null;
}

/** Drop expired kill records so the save does not grow forever. */
export function pruneKills(now = Date.now()) {
  store.update((s) => {
    for (const [id, exp] of Object.entries(s.killedSpawns)) if (exp <= now) delete s.killedSpawns[id];
  });
}
