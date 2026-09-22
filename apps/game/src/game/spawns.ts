/** Client side of world spawns: terrain lookup from streamed map data + per-player kill list. */
import { TILE, spawnsAround, tileTerrain, type Spawn, type Terrain } from '@pw/shared';
import { store } from '../state/store';
import { isLoaded, tileAt, toTile } from './world';

/** ~440 m around the player. */
const VIEW_RADIUS_DEG = 0.004;

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
  if (!cache || cache.key !== key) cache = { key, spawns: spawnsAround(lat, lng, VIEW_RADIUS_DEG, now, s.level, terrainAt) };
  return cache.spawns.filter((sp) => sp.expiresAt > now && !s.killedSpawns[sp.id]);
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
