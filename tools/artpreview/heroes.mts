/** Renders every hero facing × walk frame for a few appearances to heroes.png.  npx tsx tools/artpreview/heroes.mts */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

(globalThis as any).document = { createElement: () => createCanvas(1, 1) };
const { heroCanvas, HAIR_STYLES } = await import('../../apps/game/src/game/art');

const looks = HAIR_STYLES.map((hairStyle, i) => ({ skin: i % 4, hairStyle, hairColor: (i * 2) % 7, outfit: i % 6 }));
const facings = ['down', 'up', 'side'] as const;
const S = 5;
const out = createCanvas(9 * 20 * S + 20, looks.length * 30 * S + 20);
const o = out.getContext('2d');
o.imageSmoothingEnabled = false;
o.fillStyle = '#e8e0cc';
o.fillRect(0, 0, out.width, out.height);
looks.forEach((appearance, row) => {
  let x = 10;
  for (const f of facings) {
    for (let frame = 0; frame < 3; frame++) {
      const c = heroCanvas({ classId: 'NOVICE', appearance, chest: 'chest_leather_01', weapon: 'weapon_wood_01' }, f, frame);
      o.drawImage(c as any, x, 10 + row * 30 * S, c.width * S, c.height * S);
      x += 20 * S;
    }
  }
});
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'heroes.png'), out.toBuffer('image/png'));
console.log('wrote heroes.png');
