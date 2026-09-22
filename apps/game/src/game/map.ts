/**
 * Real-world background map (Pokémon GO style): MapLibre GL + OpenFreeMap "liberty" style,
 * tilted with 3D buildings and recoloured into a game palette. The camera is locked to the
 * player; sprites are drawn by Phaser on a transparent canvas above it using `project()`.
 */
import maplibregl, { type Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const MIN_ZOOM = 13;
export const MAX_ZOOM = 20;
const MIN_PITCH = 0;
const MAX_PITCH = 75;
/** Zoomed out enough to see the whole 120 m play radius on a phone. */
const DEFAULT_ZOOM = 16.6;
const ZOOM_KEY = 'pw.mapZoom.v2';
const PITCH = 55;

let map: MLMap | null = null;

/** Game palette: green land, bright water, pale roads — readable at a glance while walking. */
function applyGameStyle(m: MLMap) {
  const set = (id: string, prop: string, value: unknown) => {
    if (m.getLayer(id)) m.setPaintProperty(id, prop, value);
  };
  for (const layer of m.getStyle().layers ?? []) {
    const id = layer.id;
    // No brand names in-game (MASTER_SPEC §10): hide POI labels and shields.
    if (layer.type === 'symbol' && (id.startsWith('poi') || id.includes('shield') || id === 'airport')) {
      m.setLayoutProperty(id, 'visibility', 'none');
      continue;
    }
    if (id === 'natural_earth') m.setLayoutProperty(id, 'visibility', 'none');
    if (layer.type === 'fill') {
      if (id === 'water') set(id, 'fill-color', '#4fb3f2');
      else if (id.includes('wood')) set(id, 'fill-color', '#5fb95a');
      else if (id.includes('grass') || id === 'park' || id.includes('pitch')) set(id, 'fill-color', '#86d174');
      else if (id === 'landuse_residential') set(id, 'fill-color', '#b5dfa0');
      else if (id.includes('school') || id.includes('hospital') || id.includes('cemetery')) set(id, 'fill-color', '#f1dfa0');
      else if (id === 'building') set(id, 'fill-color', '#e8ded0');
    }
    if (layer.type === 'line') {
      if (id.startsWith('waterway')) set(id, 'line-color', '#4fb3f2');
      else if (id.includes('casing')) set(id, 'line-color', '#8fae8a');
      else if (id.includes('motorway') || id.includes('trunk_primary')) set(id, 'line-color', '#ffe28a');
      else if (id.includes('secondary') || id.includes('minor') || id.includes('link') || id.includes('street') || id.includes('service')) set(id, 'line-color', '#ffffff');
      else if (id.includes('path')) set(id, 'line-color', '#f4ecd6');
    }
  }
  set('background', 'background-color', '#c3e6aa');
  set('building-3d', 'fill-extrusion-color', '#efe7da');
  set('building-3d', 'fill-extrusion-opacity', 0.85);
}

export function createMap(container: HTMLElement, lat: number, lng: number): Promise<MLMap> {
  map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: [lng, lat],
    zoom: Number(localStorage.getItem(ZOOM_KEY) ?? DEFAULT_ZOOM),
    pitch: PITCH,
    bearing: 0,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    // The camera follows the player: no free panning, but pinch-zoom and two-finger rotate.
    dragPan: false,
    keyboard: false,
    doubleClickZoom: false,
    boxZoom: false,
    dragRotate: true,
    pitchWithRotate: true,
    touchPitch: true,
    maxPitch: MAX_PITCH,
    attributionControl: { compact: true },
  });
  map.touchZoomRotate.enable({ around: 'center' });
  map.scrollZoom.enable({ around: 'center' });
  map.scrollZoom.setWheelZoomRate(1 / 120);
  map.scrollZoom.setZoomRate(1 / 50);
  enableOrbitDrag(container);
  map.on('zoomend', () => {
    try {
      localStorage.setItem(ZOOM_KEY, String(map!.getZoom()));
    } catch {
      /* ignore */
    }
  });
  return new Promise((resolve) => {
    map!.once('style.load', () => {
      applyGameStyle(map!);
      resolve(map!);
    });
  });
}

export function getMap(): MLMap | null {
  return map;
}

let follow: [number, number] | null = null;

/**
 * Keep the camera on the player. Skipped while a camera animation runs (wheel zoom, zoom
 * buttons, compass) — jumping every frame would cancel it; those animations target the
 * player position themselves.
 */
export function centerOn(lat: number, lng: number) {
  follow = [lng, lat];
  if (!map || map.isEasing()) return;
  map.jumpTo({ center: follow });
}

/** Screen position (CSS px) of a lat/lng on the map canvas. */
export function project(lat: number, lng: number): { x: number; y: number } {
  if (!map) return { x: 0, y: 0 };
  const p = map.project([lng, lat]);
  return { x: p.x, y: p.y };
}

/** Approximate on-screen pixels per metre at the map centre (ignores tilt). */
export function pixelsPerMeter(lat: number): number {
  if (!map) return 1;
  return (512 * 2 ** map.getZoom()) / (40075016.686 * Math.cos((lat * Math.PI) / 180));
}

export function zoomBy(delta: number) {
  if (!map) return;
  map.easeTo({ center: follow ?? map.getCenter(), zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, map.getZoom() + delta)), duration: 250 });
}

export function resetNorth() {
  map?.easeTo({ center: follow ?? map.getCenter(), bearing: 0, pitch: PITCH, duration: 300 });
}

/**
 * Pokémon GO style camera: one-finger / left-mouse drag orbits around the player —
 * horizontal = rotate (bearing), vertical = tilt (pitch). Two-finger gestures stay with
 * MapLibre (pinch zoom + rotate). Short taps still reach MapLibre's click (fight).
 */
function enableOrbitDrag(container: HTMLElement) {
  const pointers = new Set<number>();
  let last: { x: number; y: number } | null = null;
  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointers.add(e.pointerId);
    last = pointers.size === 1 ? { x: e.clientX, y: e.clientY } : null;
  });
  container.addEventListener('pointermove', (e) => {
    if (!map || !last || pointers.size !== 1 || !pointers.has(e.pointerId)) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    map.jumpTo({
      bearing: map.getBearing() - dx * 0.35,
      pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, map.getPitch() - dy * 0.25)),
    });
  });
  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    last = null;
  };
  container.addEventListener('pointerup', end);
  container.addEventListener('pointercancel', end);
  container.addEventListener('pointerleave', end);
}

/** Perspective size factor for a screen y (sprites far up the tilted map look smaller). */
export function depthScale(y: number, height: number): number {
  return 0.65 + 0.35 * Math.max(0, Math.min(1, y / height));
}

/** Sprite size factor for the current zoom so overlays shrink with the map (1 at zoom 17.5). */
export function zoomScale(): number {
  if (!map) return 1;
  return Math.max(0.5, Math.min(1.25, 2 ** ((map.getZoom() - 17.5) * 0.75)));
}
