/**
 * Renders a preview sheet of the procedural art (map region, hero, monsters) to preview.png,
 * so art changes can be reviewed without a browser.   npx tsx tools/artpreview/preview.mts [lat lng]
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

(globalThis as any).document = { createElement: () => createCanvas(1, 1) };
const { buildAtlas, drawTile, heroCanvas, monsterCanvas, landmarkIcon, TILE_PX } = await import('../../apps/game/src/game/art');
const { TILE_COLORS, latLngToTile } = await import('@pw/shared');

const HERE = dirname(fileURLToPath(import.meta.url));
const MAPS = join(HERE, '../../apps/game/public/maps');
const meta = JSON.parse(readFileSync(join(MAPS, 'chiangmai.meta.json'), 'utf8'));
const img = await loadImage(readFileSync(join(MAPS, 'chiangmai.png')));
const src = createCanvas(meta.width, meta.height);
const sctx = src.getContext('2d');
sctx.drawImage(img, 0, 0);
const px = sctx.getImageData(0, 0, meta.width, meta.height).data;
const lut = new Map<number, number>();
for (const [id, [r, g, b]] of Object.entries(TILE_COLORS) as any) lut.set((r << 16) | (g << 8) | b, Number(id));
const tile = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= meta.width || y >= meta.height) return 0;
  const i = (y * meta.width + x) * 4;
  return lut.get((px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!) ?? 0;
};

const lat = Number(process.argv[2] ?? 18.7905);
const lng = Number(process.argv[3] ?? 98.9855);
const c = latLngToTile(meta, lat, lng);
const W = 36, H = 24, S = 3;
const atlas = buildAtlas();
const map = createCanvas(W * TILE_PX, H * TILE_PX);
const mctx = map.getContext('2d');
const x0 = Math.floor(c.x - W / 2), y0 = Math.floor(c.y - H / 2);
for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
  const gx = x0 + tx, gy = y0 + ty;
  drawTile(mctx as any, atlas, tile(gx, gy), (gx * 7 + gy * 13) % 4, (dx: number, dy: number) => tile(gx + dx, gy + dy), tx * TILE_PX, ty * TILE_PX);
}
const hero = heroCanvas({ classId: 'KNIGHT', chest: 'chest_cotton_01', weapon: 'weapon_broadsword_01', helmet: 'helm_iron_02', boots: 'boots_runner_01' });
mctx.drawImage(hero as any, (W / 2) * TILE_PX - 9, (H / 2) * TILE_PX - 22);

const mobs = ['mob_slime', 'mob_rat', 'mob_dog', 'mob_carp', 'mob_leaf', 'mob_songthaew', 'mob_bat', 'mob_lizard', 'mob_wraith', 'mob_sapling', 'boss_goblin_king', 'boss_octane', 'boss_treant'];
const out = createCanvas(W * TILE_PX * S, H * TILE_PX * S + 140);
const o = out.getContext('2d');
o.imageSmoothingEnabled = false;
o.fillStyle = '#1b1f2a';
o.fillRect(0, 0, out.width, out.height);
o.drawImage(map, 0, 0, map.width * S, map.height * S);
let x = 8;
const heroes = [
  heroCanvas({ classId: 'NOVICE' }),
  heroCanvas({ classId: 'NOVICE', chest: 'chest_cotton_01', weapon: 'weapon_wood_01' }),
  heroCanvas({ classId: 'SORCERER', chest: 'chest_cotton_01', weapon: 'weapon_staff_star_01', aura: 'aura_pure_int' }),
  hero,
];
for (const h of heroes) { o.drawImage(h as any, x, H * TILE_PX * S + 8, h.width * 4, h.height * 4); x += h.width * 4 + 8; }
for (const m of mobs) { const cv = monsterCanvas(m); o.drawImage(cv as any, x, H * TILE_PX * S + 50, cv.width * 4, cv.height * 4); x += cv.width * 4 + 6; }
for (const k of ['CONVENIENCE', 'FUEL', 'PARK', 'HOME']) { const cv = landmarkIcon(k); o.drawImage(cv as any, x, H * TILE_PX * S + 50, cv.width * 4, cv.height * 4); x += cv.width * 4 + 6; }
writeFileSync(join(HERE, 'preview.png'), out.toBuffer('image/png'));
console.log('wrote preview.png', out.width, out.height);
