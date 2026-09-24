/**
 * Counts OpenFreeMap POI classes/subclasses around a few cities, to decide which map places
 * become game landmarks. Usage: npx tsx tools/osm/probe-pois.mts [lat lng ...]
 */
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const Z = 14;
const CITIES: [string, number, number][] = [
  ['Chiang Mai', 18.7877, 98.9931],
  ['Bangkok', 13.7466, 100.5393],
  ['Tokyo', 35.6595, 139.7005],
  ['London', 51.5007, -0.1246],
  ['Paris', 48.8606, 2.3376],
  ['New York', 40.758, -73.9855],
  ['Nairobi', -1.2864, 36.8172],
  ['Rural TH', 18.55, 98.85],
];

function tileOf(lat: number, lng: number) {
  const n = 2 ** Z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const s = Math.sin((lat * Math.PI) / 180);
  const y = Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n);
  return { x, y };
}

const tj = (await (await fetch('https://tiles.openfreemap.org/planet')).json()) as { tiles: string[] };
const url = tj.tiles[0]!;
const total = new Map<string, number>();
const layersSeen = new Map<string, number>();
for (const [name, lat, lng] of CITIES) {
  const t = tileOf(lat, lng);
  const counts = new Map<string, number>();
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const u = url.replace('{z}', String(Z)).replace('{x}', String(t.x + dx)).replace('{y}', String(t.y + dy));
    const res = await fetch(u);
    if (!res.ok) continue;
    const vt = new VectorTile(new Protobuf(new Uint8Array(await res.arrayBuffer())));
    for (const l of Object.keys(vt.layers)) layersSeen.set(l, (layersSeen.get(l) ?? 0) + 1);
    const poi = vt.layers.poi;
    if (!poi) continue;
    for (let i = 0; i < poi.length; i++) {
      const p = poi.feature(i).properties;
      const key = `${p.class}/${p.subclass}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total.set(key, (total.get(key) ?? 0) + 1);
    }
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${k}:${n}`);
  console.log(`\n== ${name} (${counts.size} kinds)\n${top.join('  ')}`);
}
console.log('\n== ALL', [...total].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join('  '));
console.log('\n== layers', [...layersSeen].map(([k, n]) => `${k}:${n}`).join('  '));
