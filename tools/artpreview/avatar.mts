/**
 * Renders avatar-pack frames with equipment layers to avatar.png (4× zoom) — review gear pixel art
 * without a browser.   npx tsx tools/artpreview/avatar.mts
 * Rows = outfits, columns = walk_front 0–3 · walk_back 0–3 · idle 0.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeAvatar, type GearLook } from '../../apps/game/src/game/gear';
import { blank, blit, readPng, writePng, type Rgba } from './png';

const here = dirname(fileURLToPath(import.meta.url));
const packDir = join(here, '../../apps/game/public/assets/avatar');
const manifest = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8'));
const ramps = Object.values(manifest.hair_color_ramps) as string[][];
const skins = manifest.body.example_skin_tones as { shadow: string; base: string }[];

const cache = new Map<string, Rgba>();
const png = (rel: string) => cache.get(rel) ?? cache.set(rel, readPng(join(packDir, rel))).get(rel)!;

const looks: { style: string; skin: number; hair: number; gear: GearLook }[] = [
  { style: 'M01_short_messy', skin: 0, hair: 0, gear: { gender: 'male' } },
  { style: 'F01_low_ponytail', skin: 1, hair: 1, gear: { gender: 'female' } },
  { style: 'M03_short_neat', skin: 0, hair: 3, gear: { gender: 'male', chest: 'chest_cotton_01', outfit: 1, weapon: 'weapon_wood_01', boots: 'boots_sandal_01', helmet: 'head_bandana_01' } },
  { style: 'F02_bun', skin: 2, hair: 2, gear: { gender: 'female', chest: 'chest_cotton_01', outfit: 2, weapon: 'weapon_staff_wood_01', boots: 'boots_sandal_01' } },
  { style: 'M02_shaggy_bangs', skin: 1, hair: 4, gear: { gender: 'male', chest: 'plate_fuel_01', helmet: 'helm_iron_02', weapon: 'weapon_broadsword_01', offhand: 'shield_aegis_99', boots: 'boots_runner_01' } },
  { style: 'F03_wavy_shoulder', skin: 0, hair: 3, gear: { gender: 'female', chest: 'chest_cotton_01', outfit: 3, weapon: 'weapon_staff_star_01', helmet: 'helm_iron_02', boots: 'boots_runner_01' } },
  { style: 'M01_short_messy', skin: 2, hair: 0, gear: { gender: 'male', chest: 'chest_cotton_01', outfit: 4, weapon: 'weapon_club_01', boots: 'boots_runner_01' } },
];

const S = 4;
const cols: [string, number][] = [
  ['walk_front', 0], ['walk_front', 1], ['walk_front', 2], ['walk_front', 3],
  ['walk_back', 0], ['walk_back', 1], ['walk_back', 2], ['walk_back', 3],
  ['idle', 0],
];
const CW = 48 * S + 8, CH = 64 * S + 8;
const sheet = blank(cols.length * CW + 8, looks.length * CH + 8, [214, 222, 206]);
looks.forEach((look, row) => {
  const style = manifest.styles.find((s: { id: string }) => s.id === look.style);
  cols.forEach(([anim, f], col) => {
    const frame = style.anims[anim][f % style.anims[anim].length];
    const out = blank(48, 64);
    composeAvatar(png(frame.body), png(frame.hair), out, { skin: skins[look.skin]!, hairRamp: ramps[look.hair]!, gear: look.gear });
    blit(sheet, out, 8 + col * CW, 8 + row * CH, S);
  });
});
writePng(join(here, 'avatar.png'), sheet);
console.log('wrote tools/artpreview/avatar.png');
