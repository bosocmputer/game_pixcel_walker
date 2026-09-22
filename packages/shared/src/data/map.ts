import type { LandmarkKind } from '../types';
import type { Terrain } from './monsters';

/** Tile type stored per map cell. Values are the palette index in the baked map PNG. */
export const TILE = {
  GROUND: 0,
  GREEN: 1,
  FOREST: 2,
  FARMLAND: 3,
  WATER: 4,
  BUILDING: 5,
  SAFE: 6,
  PATH: 7,
  ROAD_MINOR: 8,
  ROAD_MAJOR: 9,
} as const;
export type TileId = (typeof TILE)[keyof typeof TILE];

/** Exact RGB written to the baked PNG; the client maps colors back to TileId. */
export const TILE_COLORS: Record<TileId, [number, number, number]> = {
  0: [200, 196, 176],
  1: [120, 196, 96],
  2: [48, 128, 64],
  3: [196, 208, 112],
  4: [64, 144, 224],
  5: [168, 112, 96],
  6: [236, 212, 140],
  7: [228, 220, 200],
  8: [244, 244, 236],
  9: [255, 196, 96],
};

/** Terrain used by the encounter table. SAFE tiles (temples, schools, hospitals) never spawn. */
export function tileTerrain(tile: number): Terrain | null {
  switch (tile) {
    case TILE.GREEN:
    case TILE.FOREST:
    case TILE.FARMLAND:
      return 'GREEN';
    case TILE.WATER:
      return 'WATER';
    case TILE.PATH:
    case TILE.ROAD_MINOR:
    case TILE.ROAD_MAJOR:
      return 'ROAD';
    case TILE.SAFE:
      return null;
    default:
      return 'URBAN';
  }
}

export interface CityConfig {
  id: string;
  nameTh: string;
  /** [south, west, north, east] */
  bbox: [number, number, number, number];
  tileMeters: number;
  /** Default spawn point when GPS is unavailable. */
  center: { lat: number; lng: number };
}

export const CITIES: Record<string, CityConfig> = {
  chiangmai: {
    id: 'chiangmai',
    nameTh: 'เชียงใหม่',
    bbox: [18.745, 98.935, 18.83, 99.035],
    tileMeters: 8,
    center: { lat: 18.7877, lng: 98.9931 },
  },
};

/** Baked map metadata written by tools/osm next to the PNG. */
export interface MapMeta {
  city: string;
  bbox: [number, number, number, number];
  tileMeters: number;
  width: number;
  height: number;
  /** meters per degree of longitude at the map's reference latitude */
  mPerDegLng: number;
  mPerDegLat: number;
  generatedAt: string;
}

export interface Landmark {
  id: string;
  kind: LandmarkKind;
  /** Generic, brand-free label shown to players. */
  label: string;
  lat: number;
  lng: number;
  /** Park area in m² (parks only). */
  area?: number;
}

export const M_PER_DEG_LAT = 110574;

export function mPerDegLng(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

/** GPS → fractional tile coordinates on the baked map. */
export function latLngToTile(meta: MapMeta, lat: number, lng: number): { x: number; y: number } {
  const [, west, north] = meta.bbox;
  return {
    x: ((lng - west) * meta.mPerDegLng) / meta.tileMeters,
    y: ((north - lat) * meta.mPerDegLat) / meta.tileMeters,
  };
}

export function tileToLatLng(meta: MapMeta, x: number, y: number): { lat: number; lng: number } {
  const [, west, north] = meta.bbox;
  return {
    lat: north - (y * meta.tileMeters) / meta.mPerDegLat,
    lng: west + (x * meta.tileMeters) / meta.mPerDegLng,
  };
}
