/**
 * World monster spawns (Pokémon GO style). Deterministic from (cell, time slot, level band), so
 * every player at a similar level sees the same monsters in the same places — no server needed
 * and nothing to reroll. Terrain is injected so the rules stay DOM-free.
 */
import { MONSTERS, type Terrain } from '../data/monsters';
import { createRng, pick } from './rng';

/** Spawn cell size in degrees (~110 m of latitude). */
export const SPAWN_CELL_DEG = 0.001;
/** Spawns rotate every 5 minutes (defeated ones come back on the next slot). */
export const SPAWN_SLOT_MS = 5 * 60_000;
/** Spawn rolls per cell. */
export const SPAWNS_PER_CELL = 6;
/** Chance that each roll produces a monster (~3.6 per ~110 m cell). */
export const SPAWN_CHANCE = 0.6;
/** Extra positions tried when a roll lands somewhere blocked (e.g. a rooftop). */
const PLACEMENT_TRIES = 4;
/**
 * Play radius (metres): monsters are shown only inside it and every one of them can be fought
 * straight away, so players do not have to walk up to each monster.
 */
export const FIGHT_RANGE_M = 120;
/** Players are grouped into 5-level bands so friends of similar level share spawns. */
export const LEVEL_BAND = 5;

export interface Spawn {
  id: string;
  monsterId: string;
  lat: number;
  lng: number;
  /** epoch ms when this spawn disappears */
  expiresAt: number;
}

export const spawnSlot = (now: number) => Math.floor(now / SPAWN_SLOT_MS);
export const levelBand = (level: number) => Math.floor((Math.max(1, level) - 1) / LEVEL_BAND);

export function cellOf(lat: number, lng: number): { cx: number; cy: number } {
  return { cx: Math.floor(lng / SPAWN_CELL_DEG), cy: Math.floor(lat / SPAWN_CELL_DEG) };
}

function hashSeed(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h ^= p | 0;
    h = Math.imul(h, 16777619);
    h ^= (p / 4294967296) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Field monsters that fit a terrain and a level band (band covers band*5+1 .. band*5+5). */
export function spawnPool(terrain: Terrain, band: number): string[] {
  const lo = band * LEVEL_BAND + 1;
  const hi = lo + LEVEL_BAND - 1;
  const fits = Object.values(MONSTERS).filter((m) => !m.boss && m.terrain?.includes(terrain));
  // On-band monsters plus weaker ones; never above the band, so new players are not swarmed.
  const pool = fits.filter((m) => m.level <= hi && m.level >= lo - 6);
  return (pool.length ? pool : fits.filter((m) => m.level <= hi + 2)).map((m) => m.id);
}

/**
 * Spawns for one cell. `terrainAt` returns null for places monsters never appear (buildings,
 * temples, schools, hospitals) or where map data is not loaded yet.
 */
export function spawnsForCell(
  cx: number,
  cy: number,
  now: number,
  level: number,
  terrainAt: (lat: number, lng: number) => Terrain | null,
): Spawn[] {
  const slot = spawnSlot(now);
  const band = levelBand(level);
  const rng = createRng(hashSeed(cx, cy, slot, band));
  const out: Spawn[] = [];
  for (let i = 0; i < SPAWNS_PER_CELL; i++) {
    const roll = rng();
    const choice = rng();
    // Always draw the same number of positions so later rolls stay stable across devices.
    const spots = Array.from({ length: PLACEMENT_TRIES }, () => ({
      lat: (cy + rng()) * SPAWN_CELL_DEG,
      lng: (cx + rng()) * SPAWN_CELL_DEG,
    }));
    if (roll >= SPAWN_CHANCE) continue;
    let lat = 0;
    let lng = 0;
    let terrain: Terrain | null = null;
    for (const spot of spots) {
      terrain = terrainAt(spot.lat, spot.lng);
      if (terrain) {
        ({ lat, lng } = spot);
        break;
      }
    }
    if (!terrain) continue;
    const pool = spawnPool(terrain, band);
    if (!pool.length) continue;
    const monsterId = pool[Math.floor(choice * pool.length)] ?? pick(rng, pool);
    out.push({ id: `${cx}_${cy}_${slot}_${band}_${i}`, monsterId, lat, lng, expiresAt: (slot + 1) * SPAWN_SLOT_MS });
  }
  return out;
}

/** All spawns in cells overlapping a square of ±radiusDeg around a point. */
export function spawnsAround(
  lat: number,
  lng: number,
  radiusDeg: number,
  now: number,
  level: number,
  terrainAt: (lat: number, lng: number) => Terrain | null,
): Spawn[] {
  const a = cellOf(lat - radiusDeg, lng - radiusDeg);
  const b = cellOf(lat + radiusDeg, lng + radiusDeg);
  const out: Spawn[] = [];
  for (let cy = a.cy; cy <= b.cy; cy++) for (let cx = a.cx; cx <= b.cx; cx++) out.push(...spawnsForCell(cx, cy, now, level, terrainAt));
  return out;
}
