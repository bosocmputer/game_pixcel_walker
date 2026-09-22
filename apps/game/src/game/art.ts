/**
 * Procedural 8-bit art: map tileset and character/monster sprites are generated at boot from
 * tiny pixel templates, so the game ships with zero image assets.
 */
import { TILE, TILE_COLORS, type TileId } from '@pw/shared';

export const TILE_PX = 16;

type RGB = [number, number, number];
const hex = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`;
const shade = ([r, g, b]: RGB, k: number): RGB => [
  Math.max(0, Math.min(255, Math.round(r * k))),
  Math.max(0, Math.min(255, Math.round(g * k))),
  Math.max(0, Math.min(255, Math.round(b * k))),
];

/** Deterministic hash noise so every tile variant looks the same on every device. */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const TILE_VARIANTS = 4;

/** Canvas with one row per TileId and TILE_VARIANTS columns. */
export function buildTileset(): HTMLCanvasElement {
  const ids = Object.values(TILE) as TileId[];
  const c = document.createElement('canvas');
  c.width = TILE_PX * TILE_VARIANTS;
  c.height = TILE_PX * ids.length;
  const ctx = c.getContext('2d')!;

  for (const id of ids) {
    for (let v = 0; v < TILE_VARIANTS; v++) {
      const ox = v * TILE_PX;
      const oy = id * TILE_PX;
      const base = TILE_COLORS[id] as RGB;
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          const n = noise(x, y, id * 31 + v);
          let col = base;
          switch (id) {
            case TILE.GREEN:
              if (n > 0.93) col = shade(base, 1.2);
              else if (n < 0.08) col = shade(base, 0.82);
              break;
            case TILE.FOREST: {
              // Round tree canopies
              const cx = (x % 8) - 3.5, cy = (y % 8) - 3.5;
              const r = Math.hypot(cx, cy);
              col = r < 3 ? shade(base, 1.15 - r * 0.05) : shade(base, 0.7);
              if (n > 0.9) col = shade(base, 1.35);
              break;
            }
            case TILE.FARMLAND:
              col = (y + v) % 4 === 0 ? shade(base, 0.85) : base;
              break;
            case TILE.WATER:
              col = (y % 6 === (x + v * 2) % 6 && n > 0.4) ? shade(base, 1.25) : base;
              break;
            case TILE.BUILDING:
              if (x === 0 || y === 0) col = shade(base, 1.2);
              else if (x === TILE_PX - 1 || y === TILE_PX - 1) col = shade(base, 0.7);
              else if (y % 4 === 0) col = shade(base, 0.9);
              break;
            case TILE.SAFE:
              if (n > 0.95) col = [255, 240, 180];
              break;
            case TILE.ROAD_MAJOR:
            case TILE.ROAD_MINOR:
            case TILE.PATH:
              if (n > 0.92) col = shade(base, 0.92);
              break;
            default:
              if (n > 0.9) col = shade(base, 0.93);
              else if (n < 0.05) col = shade(base, 1.06);
          }
          ctx.fillStyle = hex(col);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    }
  }
  return c;
}

// ---------------------------------------------------------------------------------------------
// Sprites

/**
 * Templates: each char is a palette key, '.' is transparent. 16×16 unless noted.
 * Palette letters are resolved per sprite so the same shape can be recolored.
 */
const T = {
  hero: [
    '................',
    '......hhhh......',
    '.....hhhhhh.....',
    '.....hssssh.....',
    '.....sesses.....',
    '.....ssssss.....',
    '......ssss......',
    '....ccccccccw...',
    '...scccccccsw...',
    '...scccccccsw...',
    '...s.cccccc.w...',
    '.....cccccc.....',
    '.....pp..pp.....',
    '.....pp..pp.....',
    '.....bb..bb.....',
    '....bbb..bbb....',
  ],
  slime: [
    '................', '................', '................', '................',
    '................', '.......oo.......', '.....oggggo.....', '....ogglggggo...',
    '...oglllggggo...', '...ogggeggeggo..', '..ogggggggggggo.', '..ogggggggggggo.',
    '..oggggddgggggo.', '...ogggggggggo..', '....ooooooooo...', '................',
  ],
  rat: [
    '................', '................', '................', '................',
    '................', '..gg........gg..', '..glg......glg..', '...gggggggggg...',
    '..gggeggggegggg.', '..ggggggggggggg.', '...ggggnnggggg..', '....gggggggggg.t',
    '....gg.gg.gg.gttt', '................', '................', '................',
  ],
  dog: [
    '................', '..g..........g..', '..gg........gg..', '..gggggggggggg..',
    '..ggeggggggegg..', '..gggggggggggg..', '...gggnnnnggg...', '....gggggggg....',
    '...lgggggggggl..', '..lggggggggggl..', '..lggggggggggl..', '..lgg.gggg.ggl..',
    '..gg..gg..gg.gg.', '................', '................', '................',
  ],
  fish: [
    '................', '................', '................', '................',
    '.....gggggg.....', '...gglllllggg.tt', '..ggllllllggggtt', '.gegglllllgggtt.',
    '.ggggggggggggtt.', '..gggggggggggtt.', '...gggggggggg.tt', '.....gggggg.....',
    '................', '................', '................', '................',
  ],
  sprite: [
    '................', '.......gg.......', '......gllg......', '.....gllllg.....',
    '....glleelllg...', '...gllllllllg...', '..gglllllllgg...', '.g.glllllllg.g..',
    'g...glllllg...g.', '.....glllg......', '......ggg.......', '.......g........',
    '.......g........', '................', '................', '................',
  ],
  car: [
    '................', '................', '................', '...gggggggggg...',
    '..gllllllllllg..', '..gllwwllwwllg..', '..gllwwllwwllg..', '.gggggggggggggg.',
    '.geeggggggggeeg.', '.gggggggggggggg.', '.gggggggggggggg.', '..nn........nn..',
    '..nn........nn..', '................', '................', '................',
  ],
  bat: [
    '................', '................', '................', 'g..............g',
    'gg....g..g....gg', 'ggg...gggg...ggg', 'gggg.geggeg.gggg', 'gggggggggggggggg',
    '.gggggllllggggg.', '..ggg.llll.ggg..', '...g...ll...g...', '................',
    '................', '................', '................', '................',
  ],
  lizard: [
    '................', '................', '................', '................',
    '...........gg...', '..........geggg.', '.t.......ggggggn', 'ttt..gggggggggg.',
    '.tggggllllllgg..', '..ggglllllllgg..', '...gggggggggg...', '...g.g....g.g...',
    '..gg.gg..gg.gg..', '................', '................', '................',
  ],
  ghost: [
    '................', '.....gggggg.....', '....gllllllg....', '...gllllllllg...',
    '...glelllelllg..', '...gllllllllg...', '...glllnnlllg...', '...gllllllllg...',
    '..gllllllllllg..', '..gllllllllllg..', '..gllllllllllg..', '..glgllglllglg..',
    '..g.g..g.g..g.g.', '................', '................', '................',
  ],
  sapling: [
    '................', '.....g.gg.g.....', '....gggggggg....', '...gglggggllgg..',
    '...gggggggggg...', '....gegggegg....', '.....gggggg.....', '......tttt......',
    '.....tttttt.....', '....tt.tt.tt....', '....t..tt..t....', '.....t.tt.t.....',
    '....tt.tt.tt....', '................', '................', '................',
  ],
  goblinKing: [
    '....y.y..y.y....', '....yyyyyyyy....', '....yryyyyry....', '...gggggggggg...',
    '..ggeeggggeegg..', '.lgggggggggggl..', '..ggggnnnnggg...', '...gggwwwwggg...',
    '..ccccccccccccw.', '.gccccccccccccgw', '.gcccyyyyccccgw.', '.gccccccccccccg.',
    '..cccccccccccc..', '...gg......gg...', '..ggg......ggg..', '................',
  ],
  robot: [
    '.....llllll.....', '....lwwwwwwl....', '....lwrrrrwl....', '....lwwwwwwl....',
    '..gggggggggggg..', '.gg.llllllll.gg.', 'g.g.lyyyyyyl.g.g', 'g.g.lynnnnyl.g.g',
    'o.g.lyyyyyyl.g.o', 'oo.gggggggggg.oo', '...gg......gg...', '...gg......gg...',
    '..ggg......ggg..', '..nnn......nnn..', '................', '................',
  ],
  treant: [
    '...g.gggggg.g...', '..ggglllllgggg..', '.gglllggglllggg.', 'gglllgggggllllgg',
    '.gggggggggggggg.', '....tttttttt....', '...ttettttettt..', '...tttttttttt...',
    '..ttttnnnntttt..', '.t.tttttttttt.t.', 't..tttttttttt..t', '...tttttttttt...',
    '..ttt.tttt.ttt..', '.tt..tt..tt..tt.', 'tt..tt....tt..tt', '................',
  ],
} satisfies Record<string, string[]>;

type Palette = Record<string, string>;

const MOB_PALETTES: Record<string, { tpl: keyof typeof T; pal: Palette }> = {
  mob_slime: { tpl: 'slime', pal: { o: '#1a4d80', g: '#40a0f0', l: '#b0e0ff', e: '#102030', d: '#2070c0' } },
  mob_rat: { tpl: 'rat', pal: { g: '#8a7f78', l: '#f0a0a0', e: '#ff3030', n: '#402020', t: '#d08080' } },
  mob_dog: { tpl: 'dog', pal: { g: '#3a3050', l: '#6a50a0', e: '#ff50ff', n: '#ffffff' } },
  mob_carp: { tpl: 'fish', pal: { g: '#f07020', l: '#ffffff', e: '#000000', t: '#f0a040' } },
  mob_leaf: { tpl: 'sprite', pal: { g: '#207030', l: '#80e060', e: '#ffff80' } },
  mob_songthaew: { tpl: 'car', pal: { g: '#d02020', l: '#ff6060', w: '#a0e0ff', e: '#ffe060', n: '#202020' } },
  mob_bat: { tpl: 'bat', pal: { g: '#301050', l: '#ff40c0', e: '#40ffff' } },
  mob_lizard: { tpl: 'lizard', pal: { g: '#c03010', l: '#ffa030', e: '#ffff00', n: '#ff6000', t: '#801000' } },
  mob_wraith: { tpl: 'ghost', pal: { g: '#606880', l: '#d0d8e8', e: '#20ffa0', n: '#303040' } },
  mob_sapling: { tpl: 'sapling', pal: { g: '#309040', l: '#80d060', e: '#ff4040', t: '#6a4020' } },
  boss_goblin_king: { tpl: 'goblinKing', pal: { y: '#ffd040', r: '#ff2040', g: '#50a040', e: '#ffff00', n: '#302010', w: '#ffffff', c: '#7030a0', l: '#50a040' } },
  boss_octane: { tpl: 'robot', pal: { l: '#b0b0b0', w: '#303030', r: '#ff3020', g: '#f0c020', y: '#20c0f0', n: '#202020', o: '#ff8020' } },
  boss_treant: { tpl: 'treant', pal: { g: '#206a30', l: '#50b050', t: '#6a4a2a', e: '#ffe040', n: '#301808' } },
};

function drawTemplate(tpl: string[], pal: Palette, scale = 1): HTMLCanvasElement {
  const w = Math.max(...tpl.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = tpl.length * scale;
  const ctx = c.getContext('2d')!;
  tpl.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return c;
}

export function monsterCanvas(sprite: string): HTMLCanvasElement {
  const m = MOB_PALETTES[sprite] ?? MOB_PALETTES.mob_slime!;
  return drawTemplate(T[m.tpl], m.pal);
}

/** Paperdoll colors per equipped item sprite key. */
const GEAR_COLORS: Record<string, string> = {
  chest_cotton_01: '#e8e0c8',
  plate_fuel_01: '#f0c020',
  plate_dragon_01: '#c03030',
  helm_iron_02: '#9aa0a8',
  weapon_wood_01: '#a0703a',
  weapon_broadsword_01: '#d0d8e0',
  weapon_club_01: '#e07050',
  weapon_staff_star_01: '#80c0ff',
  shield_aegis_99: '#ffd040',
  boots_runner_01: '#26C6DA',
};

const CLASS_COLORS: Record<string, string> = {
  NOVICE: '#FFA726',
  KNIGHT: '#5c7cfa',
  SORCERER: '#9c36b5',
  ASSASSIN: '#343a40',
  CLERIC: '#f8f9fa',
  RANGER: '#2f9e44',
};

export interface Paperdoll {
  classId: string;
  helmet?: string;
  chest?: string;
  weapon?: string;
  boots?: string;
  aura?: string | null;
}

export const AURA_COLORS: Record<string, string> = {
  aura_pure_vit: '#4dabf7',
  aura_pure_agi: '#adb5bd',
  aura_pure_int: '#da77f2',
  aura_pure_str: '#ff6b6b',
  aura_pure_luk: '#ffd43b',
  aura_pure_dex: '#69db7c',
};

export function heroCanvas(p: Paperdoll): HTMLCanvasElement {
  const naked = !p.chest;
  const pal: Palette = {
    h: p.helmet ? GEAR_COLORS[p.helmet] ?? '#9aa0a8' : '#3a2a20',
    s: '#f2c79b',
    e: '#202020',
    c: naked ? '#f2c79b' : GEAR_COLORS[p.chest!] ?? CLASS_COLORS[p.classId] ?? '#FFA726',
    p: naked ? '#ffffff' : '#2b3a67',
    b: p.boots ? GEAR_COLORS[p.boots] ?? '#26C6DA' : '#5a3a20',
    w: p.weapon ? GEAR_COLORS[p.weapon] ?? '#d0d8e0' : 'transparent',
  };
  const body = drawTemplate(T.hero, pal);
  if (!p.aura) return body;
  const c = document.createElement('canvas');
  c.width = 20;
  c.height = 20;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = AURA_COLORS[p.aura] ?? '#ffffff';
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(10, 11, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.drawImage(body, 2, 2);
  return c;
}

export function landmarkIcon(kind: string): HTMLCanvasElement {
  const icons: Record<string, { tpl: string[]; pal: Palette }> = {
    CONVENIENCE: {
      tpl: ['..rrrrrrrr..', '.rrrrrrrrrr.', 'rrrrrrrrrrrr', 'wwwwwwwwwwww', 'wggwwggwwggw', 'wggwwggwwggw', 'wwwwwwwwwwww', 'wwdddwwggggw', 'wwdddwwggggw', 'wwdddwwwwwww', 'wwdddwwwwwww', 'kkkkkkkkkkkk'],
      pal: { r: '#ff7043', w: '#fafafa', g: '#80deea', d: '#6d4c41', k: '#424242' },
    },
    FUEL: {
      tpl: ['.gggggg.....', '.gwwwwg.....', '.gwwwwg..k..', '.gggggg..k..', '.gggggg.kk..', '.gggggg.k...', '.ggyygg.k...', '.ggyyggkk...', '.gggggg.....', '.gggggg.....', 'kkkkkkkk....', 'kkkkkkkk....'],
      pal: { g: '#e53935', w: '#fafafa', y: '#ffd54f', k: '#424242' },
    },
    PARK: {
      tpl: ['....gggg....', '..gggggggg..', '.gglgggggggg', 'gglllgggggg.', 'gggggggglgg.', '.gggggggggg.', '..gggggggg..', '.....tt.....', '.....tt.....', '.....tt.....', '....tttt....', '..........'],
      pal: { g: '#2e7d32', l: '#66bb6a', t: '#6d4c41' },
    },
    HOME: {
      tpl: ['.....rr.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '.rrrrrrrrrr.', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.wbbwwwwddw.', '.wbbwwwwddw.', '.wwwwwwwddw.', '.wwwwwwwddw.', '.kkkkkkkkkk.'],
      pal: { r: '#FFA726', w: '#fff3e0', b: '#80deea', d: '#6d4c41', k: '#424242' },
    },
  };
  const i = icons[kind] ?? icons.PARK!;
  return drawTemplate(i.tpl, i.pal);
}
