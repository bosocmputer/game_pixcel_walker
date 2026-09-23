/**
 * Procedural 16-bit art. Everything is generated at boot — the game ships with zero image
 * assets. Tiles use 5-step color ramps, dithering and neighbour-aware overlays (3/4-view
 * building facades, cast shadows, shorelines, curbs). Sprites are authored as flat region
 * masks and get automatic bevel shading + selective outlines, the classic 16-bit look.
 */
import { TILE, type TileId } from '@pw/shared';
import { isAvatarPackLoaded, renderAvatarFrame, USE_AVATAR_PACK, type Gender, type AvatarAnim } from './avatar';
import { OUTFIT_DYES } from './gear';
import { pixelSprite } from './sprites';
export { USE_AVATAR_PACK, type Gender } from './avatar';

export const TILE_PX = 16;
export const TILE_VARIANTS = 4;

type RGB = [number, number, number];
type Ramp = [RGB, RGB, RGB, RGB, RGB]; // darkest → lightest

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const css = ([r, g, b]: RGB, a = 1) => (a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`);
const mul = ([r, g, b]: RGB, k: number): RGB => [clamp(r * k), clamp(g * k), clamp(b * k)];
const hexRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const ramp = (hex: string): Ramp => {
  const c = hexRgb(hex);
  return [mul(c, 0.55), mul(c, 0.75), c, mul(c, 1.15), mul(c, 1.3)];
};

/** Deterministic hash noise so tiles look identical on every device. */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** 4×4 Bayer matrix for ordered dithering. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
const dither = (x: number, y: number) => BAYER[(y % 4) * 4 + (x % 4)]!;

function canvas(w = TILE_PX, h = TILE_PX): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function paint(fn: (x: number, y: number) => RGB | null, w = TILE_PX, h = TILE_PX): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = fn(x, y);
      if (!col) continue;
      const i = (y * w + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------------------------------------
// Palette (warm Lanna tones: terracotta roofs, teak, jungle greens)

const P = {
  ground: ramp('#c9bf9f'),
  grass: ramp('#6fbf4a'),
  forest: ramp('#2f8a3e'),
  farm: ramp('#b9c95a'),
  water: ramp('#3f8fdc'),
  roof: ramp('#c8663e'),
  roofAlt: ramp('#9a5a3c'),
  wall: ramp('#efe0c0'),
  safe: ramp('#e8cf8a'),
  path: ramp('#d9cfb4'),
  road: ramp('#8e8f99'),
  roadMajor: ramp('#6f7080'),
  curb: ramp('#d8d8d0'),
};

// ---------------------------------------------------------------------------------------------
// Tiles

export interface TileAtlas {
  base: Record<number, HTMLCanvasElement[]>;
  roof: HTMLCanvasElement[];
  facade: HTMLCanvasElement[];
  ridge: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  shore: HTMLCanvasElement[]; // N E S W
  curb: HTMLCanvasElement[]; // N E S W
  lane: HTMLCanvasElement;
}

function baseTile(id: TileId, v: number): HTMLCanvasElement {
  return paint((x, y) => {
    const n = noise(x, y, id * 97 + v * 13);
    const d = dither(x, y);
    switch (id) {
      case TILE.GREEN: {
        const r = P.grass;
        if (n > 0.94) return r[4];
        if ((x + v * 3) % 7 === 0 && y % 5 === (v % 5) && n > 0.4) return r[3]; // grass tufts
        return n + d * 0.3 < 0.25 ? r[1] : r[2];
      }
      case TILE.FOREST: {
        // Overlapping round canopies lit from the top-left
        const r = P.forest;
        const cx = ((x + v * 5) % 8) - 3.5, cy = ((y + (v >> 1) * 3) % 8) - 3.5;
        const dist = Math.hypot(cx + 0.8, cy + 0.8);
        if (dist > 4.2) return r[0];
        const lit = -(cx + cy) / 7 + n * 0.3 + d * 0.2;
        return lit > 0.55 ? r[4] : lit > 0.2 ? r[3] : lit > -0.3 ? r[2] : r[1];
      }
      case TILE.FARMLAND: {
        const r = P.farm;
        const row = (y + v) % 4;
        return row === 0 ? r[1] : row === 1 && n > 0.5 ? r[3] : r[2];
      }
      case TILE.WATER: {
        const r = P.water;
        const wave = (x + y * 2 + v * 4) % 11 === 0 && n > 0.3;
        if (wave) return r[4];
        return (y + (n > 0.5 ? 1 : 0)) % 6 === 0 && d > 0.5 ? r[3] : r[2];
      }
      case TILE.SAFE: {
        // Temple paving slabs
        const r = P.safe;
        if (x % 8 === 0 || y % 8 === 0) return r[1];
        if (x % 8 === 1 || y % 8 === 1) return r[3];
        return n > 0.9 ? r[4] : r[2];
      }
      case TILE.PATH: {
        const r = P.path;
        return n > 0.92 ? r[1] : n < 0.08 ? r[3] : r[2];
      }
      case TILE.ROAD_MINOR: {
        const r = P.road;
        return n > 0.93 ? r[1] : n < 0.05 ? r[3] : r[2];
      }
      case TILE.ROAD_MAJOR: {
        const r = P.roadMajor;
        return n > 0.93 ? r[1] : n < 0.05 ? r[3] : r[2];
      }
      case TILE.BUILDING:
        return P.roof[2];
      default: {
        // Packed-earth town ground: near-flat with sparse pebbles and dry-grass flecks.
        const r = P.ground;
        if (n > 0.985) return r[1];
        if (n < 0.012) return P.grass[1];
        if (n > 0.9 && d > 0.6) return mul(r[2], 0.95);
        return r[2];
      }
    }
  });
}

function roofTile(v: number): HTMLCanvasElement {
  const r = v % 2 ? P.roofAlt : P.roof;
  return paint((x, y) => {
    const n = noise(x, y, 500 + v);
    if (y % 4 === 3) return r[1]; // tile rows
    if (y % 4 === 0) return r[3];
    const shift = Math.floor(y / 4) % 2 ? 2 : 0;
    if ((x + shift) % 4 === 0) return r[1];
    return n > 0.92 ? r[4] : r[2];
  });
}

function facadeTile(v: number): HTMLCanvasElement {
  // Top 7px: roof eave; bottom 9px: wall with windows / door
  const r = v % 2 ? P.roofAlt : P.roof;
  const w = P.wall;
  const door = v === 3;
  return paint((x, y) => {
    if (y < 6) return y === 5 ? r[0] : y % 3 === 2 ? r[1] : r[2];
    if (y === 6) return w[0];
    if (y === 15) return w[0];
    if (door && x >= 6 && x <= 9 && y >= 9) return y === 9 ? mul(w[0], 0.8) : x === 6 ? [90, 55, 35] : [120, 75, 45];
    const win = (x % 8 >= 2 && x % 8 <= 5) && y >= 8 && y <= 12;
    if (win) {
      if (y === 8 || x % 8 === 2) return [40, 70, 110];
      return (x % 8 === 3 && y === 9) ? [210, 240, 255] : [90, 150, 210];
    }
    return x === 0 ? w[1] : noise(x, y, 700 + v) > 0.93 ? w[3] : w[2];
  });
}

function strip(dir: 0 | 1 | 2 | 3, width: number, color: (x: number, y: number, depth: number) => RGB | null) {
  return paint((x, y) => {
    const depth = dir === 0 ? y : dir === 1 ? TILE_PX - 1 - x : dir === 2 ? TILE_PX - 1 - y : x;
    return depth < width ? color(x, y, depth) : null;
  });
}

export function buildAtlas(): TileAtlas {
  const base: TileAtlas['base'] = {};
  for (const id of Object.values(TILE) as TileId[]) {
    base[id] = Array.from({ length: TILE_VARIANTS }, (_, v) => baseTile(id, v));
  }
  const [shadow, sctx] = canvas();
  sctx.fillStyle = 'rgba(20,25,40,0.35)';
  sctx.fillRect(0, 0, TILE_PX, 5);
  sctx.fillStyle = 'rgba(20,25,40,0.18)';
  sctx.fillRect(0, 5, TILE_PX, 2);

  const [ridge, rctx] = canvas();
  rctx.fillStyle = css(P.roof[4]);
  rctx.fillRect(0, 0, TILE_PX, 1);
  rctx.fillStyle = css(P.roof[0]);
  rctx.fillRect(0, 1, TILE_PX, 1);

  const [lane, lctx] = canvas();
  lctx.fillStyle = 'rgba(255,230,120,0.9)';
  lctx.fillRect(6, 7, 4, 2);

  const dirs = [0, 1, 2, 3] as const;
  return {
    base,
    roof: Array.from({ length: TILE_VARIANTS }, (_, v) => roofTile(v)),
    facade: Array.from({ length: TILE_VARIANTS }, (_, v) => facadeTile(v)),
    ridge,
    shadow,
    lane,
    shore: dirs.map((d) =>
      strip(d, 3, (x, y, depth) => (depth === 0 ? P.water[4] : depth === 1 ? (noise(x, y, 900 + d) > 0.4 ? P.water[3] : null) : dither(x, y) > 0.75 ? P.water[3] : null)),
    ),
    curb: dirs.map((d) => strip(d, 2, (_x, _y, depth) => (depth === 0 ? P.curb[3] : P.curb[1]))),
  };
}

const isRoad = (t: number) => t === TILE.ROAD_MAJOR || t === TILE.ROAD_MINOR;

/** Draws one map tile with neighbour-aware overlays. `at(dx, dy)` reads neighbouring tiles. */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  id: number,
  variant: number,
  at: (dx: number, dy: number) => number,
  px: number,
  py: number,
) {
  if (id === TILE.BUILDING) {
    const below = at(0, 1);
    ctx.drawImage(below === TILE.BUILDING ? atlas.roof[variant]! : atlas.facade[variant]!, px, py);
    if (at(0, -1) !== TILE.BUILDING) ctx.drawImage(atlas.ridge, px, py);
    return;
  }
  ctx.drawImage(atlas.base[id]![variant]!, px, py);
  if (at(0, -1) === TILE.BUILDING) ctx.drawImage(atlas.shadow, px, py);

  const nb = [at(0, -1), at(1, 0), at(0, 1), at(-1, 0)];
  if (id === TILE.WATER) {
    nb.forEach((t, d) => t !== TILE.WATER && t !== TILE.BUILDING && ctx.drawImage(atlas.shore[d]!, px, py));
  } else if (isRoad(id)) {
    nb.forEach((t, d) => !isRoad(t) && t !== TILE.PATH && ctx.drawImage(atlas.curb[d]!, px, py));
  }
}

// ---------------------------------------------------------------------------------------------
// Sprites: flat region masks → auto bevel shading + selective outline

type Palette = Record<string, string>;

/**
 * Renders a template where every char is a region key. Pixels on a region's top/left edge are
 * lit, bottom/right edges are shaded, a soft vertical gradient adds volume, and transparent
 * pixels next to the sprite get a darkened-neighbour outline.
 */
export function shadeSprite(tpl: string[], pal: Palette): HTMLCanvasElement {
  const h = tpl.length;
  const w = Math.max(...tpl.map((r) => r.length));
  const pw = w + 2;
  const ph = h + 2; // 1px border for the outline
  const key = (x: number, y: number) => {
    const ch = tpl[y]?.[x];
    return ch && ch !== '.' && pal[ch] && pal[ch] !== 'transparent' ? ch : null;
  };
  const colorAt = (x: number, y: number): RGB | null => {
    const k = key(x, y);
    if (!k) return null;
    let c = hexRgb(pal[k]!);
    const edgeLit = key(x, y - 1) !== k || key(x - 1, y) !== k;
    const edgeDark = key(x, y + 1) !== k || key(x + 1, y) !== k;
    if (edgeLit && !edgeDark) c = mul(c, 1.22);
    else if (edgeDark && !edgeLit) c = mul(c, 0.74);
    return mul(c, 1.08 - (0.16 * y) / h);
  };
  return paint((X, Y) => {
    const x = X - 1;
    const y = Y - 1;
    const c = colorAt(x, y);
    if (c) return c;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const n = colorAt(x + dx, y + dy);
      if (n) return mul(n, 0.3);
    }
    return null;
  }, pw, ph);
}

/**
 * 16×24 hero, drawn as regions: h hair/helm, s skin, e eyes, c chest, a sleeves, p pants,
 * b boots, w weapon, g belt. Three facings (side = right; left is a horizontal flip) and three
 * walk frames (0 = stand, 1/2 = alternate legs).
 */
export type Facing = 'down' | 'up' | 'side';

const HEAD: Record<Facing, string[]> = {
  down: [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhssssssh....',
    '...hsseesees....',
    '....ssssssss....',
    '.....ssssss.....',
    '......ssss......',
  ],
  up: [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '....hhhhhhhh....',
    '.....ssssss.....',
    '......ssss......',
  ],
  side: [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhh....',
    '...hhhhhhhhs....',
    '...hhhhsssss....',
    '...hhhsssses....',
    '....hssssss.....',
    '.....sssss......',
    '......sss.......',
  ],
};

const TORSO: Record<Facing, string[]> = {
  down: [
    '....cccccccc..w.',
    '...acccccccca.w.',
    '..sacccccccas.w.',
    '..sacccccccas.w.',
    '..s.cccccccc.sw.',
    '....gggggggg..w.',
  ],
  up: [
    '.w..cccccccc....',
    '.w.acccccccca...',
    '.wsacccccccas...',
    '.wsacccccccas...',
    '.ws.cccccccc.s..',
    '.w..gggggggg....',
  ],
  side: [
    '.....ccccc......',
    '.....cccccw.....',
    '....acccccw.....',
    '....acccccw.....',
    '....scccccw.....',
    '.....gggggw.....',
  ],
};

const LEGS: Record<Facing, string[][]> = {
  down: [
    ['....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....bbb..bbb....', '...bbbb..bbbb...', '................'],
    ['....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....bbb..ppp....', '...bbbb..ppp....', '.........ppp....', '.........bbb....', '........bbbb....'],
    ['....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..bbb....', '....ppp..bbbb...', '....ppp.........', '....bbb.........', '...bbbb.........'],
  ],
  up: [
    ['....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....bbb..bbb....', '...bbbb..bbbb...', '................'],
    ['....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..bbb....', '....ppp..bbbb...', '....ppp.........', '....bbb.........', '...bbbb.........'],
    ['....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....bbb..ppp....', '...bbbb..ppp....', '.........ppp....', '.........bbb....', '........bbbb....'],
  ],
  side: [
    ['.....ppppp......', '.....ppppp......', '.....pp.pp......', '.....pp.pp......', '.....pp.pp......', '.....bb.bb......', '.....bbb.bbb....', '................'],
    ['.....ppppp......', '....pppppp......', '....pp..ppp.....', '...pp....pp.....', '...pp.....pp....', '...bb.....bb....', '..bbb.....bbb...', '................'],
    ['.....ppppp......', '.....pppp.......', '.....ppp........', '.....ppp........', '.....pp.........', '.....bb.........', '.....bbbb.......', '................'],
  ],
};

export type HairStyle = 'short' | 'spiky' | 'long' | 'bun' | string;
export const HAIR_STYLES: HairStyle[] = ['short', 'spiky', 'long', 'bun'];
export const SKIN_TONES = ['#f2c79b', '#e0ac7e', '#c68a5a', '#8d5a3a'];
export const HAIR_COLORS = ['#2a1e1a', '#5a3a22', '#e8c46a', '#b8422e', '#3a5ec8', '#e87aa8', '#c8ccd8'];
/** Shirt dyes — shared with the avatar-pack gear painter so both renderers agree. */
export const OUTFIT_COLORS = OUTFIT_DYES;

function setCh(rows: string[], y: number, x: number, ch: string, onlyIfEmpty = true) {
  const r = rows[y];
  if (!r || x < 0 || x >= r.length) return;
  if (onlyIfEmpty && r[x] !== '.') return;
  rows[y] = r.slice(0, x) + ch + r.slice(x + 1);
}

function heroTemplate(facing: Facing, frame: number, hair: HairStyle, helmet: boolean): string[] {
  const rows = [...HEAD[facing], ...TORSO[facing], ...LEGS[facing][frame % 3]!];
  if (!helmet) {
    if (hair === 'spiky') {
      rows[0] = facing === 'side' ? '....h.hh.h......' : '....h.hh.hh.h...';
    } else if (hair === 'long') {
      const cols = facing === 'side' ? [3, 4] : [2, 3, 12, 13];
      for (let y = 5; y <= 12; y++) for (const x of cols) setCh(rows, y, x, 'h');
      if (facing === 'up') for (let y = 8; y <= 12; y++) for (let x = 4; x <= 11; x++) setCh(rows, y, x, 'h', false);
    } else if (hair === 'bun') {
      if (facing === 'side') {
        setCh(rows, 1, 3, 'h');
        setCh(rows, 2, 2, 'h');
        setCh(rows, 2, 3, 'h');
      } else {
        rows[0] = '......hhhh......';
      }
    }
  }
  return rows;
}

/** Monster region templates (16×16). */
const MOB: Record<string, string[]> = {
  slime: [
    '................', '................', '................', '................',
    '.......gg.......', '.....gggggg.....', '....gllggggg....', '...glllgggggg...',
    '...ggggggggggg..', '..gggeggggegggg.', '..gggeggggegggg.', '..ggggggggggggg.',
    '..ggggmmmmggggg.', '...ggggggggggg..', '....ggggggggg...', '................',
  ],
  rat: [
    '................', '................', '................', '................',
    '..ee........ee..', '..eie......eie..', '...gggggggggg...', '..ggkggggggkggg.',
    '..ggggggggggggg.', '...gggggnngggg..', '....gggggggggg.t', '....gggggggggtt.',
    '....gg.gg.gg.gt.', '...............t', '................', '................',
  ],
  dog: [
    '................', '..g..........g..', '..gg........gg..', '..gggggggggggg..',
    '..ggkggggggkgg..', '..gggggggggggg..', '...gggnnnnggg...', '....gwwggwwg....',
    '...lgggggggggl..', '..lggggggggggl..', '..lggggggggggl..', '..lgg.gggg.ggl..',
    '..gg..gg..gg.gg.', '................', '................', '................',
  ],
  fish: [
    '................', '................', '................', '................',
    '.....gggggg.....', '...gglllllggg.tt', '..ggllllllggggtt', '.gkgglllllgggtt.',
    '.ggggggggggggtt.', '..gggggggggggtt.', '...gggggggggg.tt', '.....gggggg.....',
    '................', '................', '................', '................',
  ],
  sprite: [
    '................', '.......gg.......', '......gllg......', '.....gllllg.....',
    '....gllkklllg...', '...gllllllllg...', '..gglllllllgg...', '.g.glllllllg.g..',
    'g...glllllg...g.', '.....glllg......', '......ggg.......', '.......g........',
    '.......g........', '................', '................', '................',
  ],
  car: [
    '................', '................', '................', '...gggggggggg...',
    '..gllllllllllg..', '..gllwwllwwllg..', '..gllwwllwwllg..', '.gggggggggggggg.',
    '.gkkggggggggkkg.', '.gggggggggggggg.', '.gggggggggggggg.', '..nn........nn..',
    '..nn........nn..', '................', '................', '................',
  ],
  bat: [
    '................', '................', '................', 'g..............g',
    'gg....g..g....gg', 'ggg...gggg...ggg', 'gggg.gkggkg.gggg', 'gggggggggggggggg',
    '.gggggllllggggg.', '..ggg.llll.ggg..', '...g...ll...g...', '................',
    '................', '................', '................', '................',
  ],
  lizard: [
    '................', '................', '................', '................',
    '...........gg...', '..........gkggg.', '.t.......ggggggn', 'ttt..gggggggggg.',
    '.tggggllllllgg..', '..ggglllllllgg..', '...gggggggggg...', '...g.g....g.g...',
    '..gg.gg..gg.gg..', '................', '................', '................',
  ],
  ghost: [
    '................', '.....gggggg.....', '....gllllllg....', '...gllllllllg...',
    '...glklllklllg..', '...gllllllllg...', '...glllnnlllg...', '...gllllllllg...',
    '..gllllllllllg..', '..gllllllllllg..', '..gllllllllllg..', '..glgllglllglg..',
    '..g.g..g.g..g.g.', '................', '................', '................',
  ],
  sapling: [
    '................', '.....g.gg.g.....', '....gggggggg....', '...gglggggllgg..',
    '...gggggggggg...', '....gkgggkgg....', '.....gggggg.....', '......tttt......',
    '.....tttttt.....', '....tt.tt.tt....', '....t..tt..t....', '.....t.tt.t.....',
    '....tt.tt.tt....', '................', '................', '................',
  ],
  goblinKing: [
    '....y.y..y.y....', '....yyyyyyyy....', '....yryyyyry....', '...gggggggggg...',
    '..ggkkggggkkgg..', '.lgggggggggggl..', '..ggggnnnnggg...', '...gggwwwwggg...',
    '..ccccccccccccw.', '.gccccccccccccgw', '.gcccyyyyccccgw.', '.gccccccccccccg.',
    '..cccccccccccc..', '...gg......gg...', '..ggg......ggg..', '................',
  ],
  robot: [
    '.....llllll.....', '....lwwwwwwl....', '....lwrrrrwl....', '....lwwwwwwl....',
    '..gggggggggggg..', '.gg.llllllll.gg.', 'g.g.lyyyyyyl.g.g', 'g.g.lynnnnyl.g.g',
    'o.g.lyyyyyyl.g.o', 'oo.gggggggggg.oo', '...gg......gg...', '...gg......gg...',
    '..ggg......ggg..', '..nnn......nnn..', '................', '................',
  ],
  dummy: [
    '................',
    '.....rwwwwr.....',
    '....rwwrrwwr....',
    '....wwrwwrww....',
    '....rwwrrwwr....',
    '.....rwwwwr.....',
    '.......tt.......',
    '.tttttttttttttt.',
    '.tt....tt....tt.',
    '.......tt.......',
    '.....ssttss.....',
    '.....ssttss.....',
    '.......tt.......',
    '.......tt.......',
    '.....bbbbbb.....',
    '....bbbbbbbb....',
  ],
  treant: [
    '...g.gggggg.g...', '..ggglllllgggg..', '.gglllggglllggg.', 'gglllgggggllllgg',
    '.gggggggggggggg.', '....tttttttt....', '...ttkttttkttt..', '...tttttttttt...',
    '..ttttnnnntttt..', '.t.tttttttttt.t.', 't..tttttttttt..t', '...tttttttttt...',
    '..ttt.tttt.ttt..', '.tt..tt..tt..tt.', 'tt..tt....tt..tt', '................',
  ],
};

const MOB_PALETTES: Record<string, { tpl: string; pal: Palette }> = {
  mob_slime: { tpl: 'slime', pal: { g: '#48a8f0', l: '#c8ecff', e: '#102030', m: '#1f6fb8' } },
  mob_rat: { tpl: 'rat', pal: { g: '#9a8f86', e: '#c08a8a', i: '#f0b0b0', k: '#ff3030', n: '#402020', t: '#d08080' } },
  mob_dog: { tpl: 'dog', pal: { g: '#4a3c68', l: '#7a5cb8', k: '#ff50ff', n: '#20182c', w: '#ffffff' } },
  mob_carp: { tpl: 'fish', pal: { g: '#f07828', l: '#fff4e8', k: '#000000', t: '#f0a848' } },
  mob_leaf: { tpl: 'sprite', pal: { g: '#2a8a3a', l: '#8ce868', k: '#ffff90' } },
  mob_songthaew: { tpl: 'car', pal: { g: '#d42828', l: '#ff7070', w: '#a8e4ff', k: '#ffe060', n: '#282828' } },
  mob_bat: { tpl: 'bat', pal: { g: '#3a1860', l: '#ff48c8', k: '#48ffff' } },
  mob_lizard: { tpl: 'lizard', pal: { g: '#c83818', l: '#ffa838', k: '#ffff00', n: '#ff6800', t: '#881800' } },
  mob_wraith: { tpl: 'ghost', pal: { g: '#687090', l: '#dce4f0', k: '#28ffa8', n: '#303048' } },
  mob_sapling: { tpl: 'sapling', pal: { g: '#389848', l: '#88d868', k: '#ff4848', t: '#6e4424' } },
  mob_dummy: { tpl: 'dummy', pal: { r: '#e53935', w: '#fafafa', t: '#a0703a', s: '#d9b77a', b: '#6d4c41' } },
  mob_dummy_armored: { tpl: 'dummy', pal: { r: '#1e88e5', w: '#e0e6ee', t: '#8d9aa8', s: '#b0bec5', b: '#546e7a' } },
  boss_goblin_king: { tpl: 'goblinKing', pal: { y: '#ffd448', r: '#ff2848', g: '#58a848', k: '#ffff00', n: '#302010', w: '#ffffff', c: '#7838a8', l: '#58a848' } },
  boss_octane: { tpl: 'robot', pal: { l: '#b8b8c0', w: '#303038', r: '#ff3828', g: '#f0c828', y: '#28c8f0', n: '#202028', o: '#ff8828' } },
  boss_treant: { tpl: 'treant', pal: { g: '#247438', l: '#58b858', t: '#6e4e2e', k: '#ffe448', n: '#301808' } },
};

export function monsterCanvas(sprite: string): HTMLCanvasElement {
  const px = pixelSprite('monsters', sprite);
  if (px) return px;
  const m = MOB_PALETTES[sprite] ?? MOB_PALETTES.mob_slime!;
  return shadeSprite(MOB[m.tpl]!, m.pal);
}

/** Paperdoll colors per equipped item sprite key. */
const GEAR_COLORS: Record<string, string> = {
  chest_cotton_01: '#e8dcc0',
  plate_fuel_01: '#f0c028',
  plate_dragon_01: '#c83030',
  helm_iron_02: '#a0a8b4',
  weapon_wood_01: '#a8743c',
  weapon_broadsword_01: '#d8e0ec',
  weapon_club_01: '#e07858',
  weapon_staff_star_01: '#88c8ff',
  shield_aegis_99: '#ffd448',
  boots_runner_01: '#26c6da',
};

const CLASS_COLORS: Record<string, string> = {
  NOVICE: '#ffa726',
  KNIGHT: '#5c7cfa',
  SORCERER: '#9c36b5',
  ASSASSIN: '#3a3f48',
  CLERIC: '#f4f4fa',
  RANGER: '#2f9e44',
};

export interface Appearance {
  gender?: Gender;
  skin: number;
  hairStyle: HairStyle;
  hairColor: number;
  outfit: number;
}

export const DEFAULT_APPEARANCE: Appearance = {
  gender: 'male',
  skin: 0,
  hairStyle: 'M01_short_messy',
  hairColor: 0,
  outfit: 0,
};

export interface Paperdoll {
  classId: string;
  appearance?: Appearance;
  helmet?: string;
  chest?: string;
  weapon?: string;
  /** Accessories are not drawn on the body; kept for completeness of the look. */
  accessory?: string;
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

export function heroCanvas(p: Paperdoll, facing: Facing = 'down', frame = 0): HTMLCanvasElement {
  const ap = p.appearance ?? DEFAULT_APPEARANCE;

  if (USE_AVATAR_PACK && isAvatarPackLoaded()) {
    const gender = ap.gender ?? 'male';
    const anim: AvatarAnim = facing === 'up' ? 'walk_back' : 'walk_front';
    const gear = { helmet: p.helmet, chest: p.chest, weapon: p.weapon, outfit: ap.outfit };
    const body = renderAvatarFrame(gender, ap.hairStyle, ap.skin, ap.hairColor, anim, frame, gear);
    if (!p.aura) return body;
    const [c, ctx] = canvas(body.width + 8, body.height + 6);
    const grad = ctx.createRadialGradient(c.width / 2, c.height * 0.55, 2, c.width / 2, c.height * 0.55, c.width / 2);
    grad.addColorStop(0, css(hexRgb(AURA_COLORS[p.aura] ?? '#ffffff'), 0.65));
    grad.addColorStop(1, css(hexRgb(AURA_COLORS[p.aura] ?? '#ffffff'), 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(body, 4, 4);
    return c;
  }

  const skin = SKIN_TONES[ap.skin] ?? SKIN_TONES[0]!;
  const outfit = OUTFIT_COLORS[ap.outfit] ?? OUTFIT_COLORS[0]!;
  const naked = !p.chest;
  const pal: Palette = {
    h: p.helmet ? GEAR_COLORS[p.helmet] ?? '#a0a8b4' : HAIR_COLORS[ap.hairColor] ?? HAIR_COLORS[0]!,
    s: skin,
    e: '#1c1c28',
    // The starter cotton shirt is dyed in the player's chosen outfit colour.
    c: naked ? skin : p.chest === 'chest_cotton_01' ? outfit : GEAR_COLORS[p.chest!] ?? outfit,
    a: naked ? skin : p.chest === 'chest_cotton_01' ? mul(hexRgb(outfit), 0.8).map((v) => v.toString(16).padStart(2, '0')).reduce((a, v) => a + v, '#') : outfit,
    g: naked ? skin : '#5a3a22',
    p: naked ? '#ffffff' : '#2b3a67',
    b: '#6a4424',
    w: p.weapon ? GEAR_COLORS[p.weapon] ?? '#d8e0ec' : 'transparent',
  };
  const body = shadeSprite(heroTemplate(facing, frame, ap.hairStyle, !!p.helmet), pal);
  if (!p.aura) return body;
  const [c, ctx] = canvas(body.width + 8, body.height + 6);
  const grad = ctx.createRadialGradient(c.width / 2, c.height * 0.55, 2, c.width / 2, c.height * 0.55, c.width / 2);
  grad.addColorStop(0, css(hexRgb(AURA_COLORS[p.aura] ?? '#ffffff'), 0.65));
  grad.addColorStop(1, css(hexRgb(AURA_COLORS[p.aura] ?? '#ffffff'), 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(body, 4, 4);
  return c;
}

const ICONS: Record<string, { tpl: string[]; pal: Palette }> = {
  CONVENIENCE: {
    tpl: ['..rrrrrrrrrr..', '.rrrrrrrrrrrr.', 'rrrrrrrrrrrrrr', 'yyyyyyyyyyyyyy', 'wwwwwwwwwwwwww', 'wggwwggwwggwww', 'wggwwggwwggwww', 'wwwwwwwwwwwwww', 'wwdddwwwggggww', 'wwdddwwwggggww', 'wwdddwwwwwwwww', 'wwdddwwwwwwwww', 'kkkkkkkkkkkkkk'],
    pal: { r: '#ff7043', y: '#ffca28', w: '#fafafa', g: '#80deea', d: '#6d4c41', k: '#555555' },
  },
  FUEL: {
    tpl: ['.ggggggg......', '.gwwwwwg......', '.gwwwwwg...k..', '.ggggggg...k..', '.ggggggg..kk..', '.ggggggg..k...', '.ggyyygg..k...', '.ggyyygg.kk...', '.ggggggg......', '.ggggggg......', 'kkkkkkkkk.....', 'kkkkkkkkk.....'],
    pal: { g: '#e53935', w: '#fafafa', y: '#ffd54f', k: '#555555' },
  },
  PARK: {
    tpl: ['.....gggg.....', '...gggggggg...', '..gglgggggggg.', '.gglllgggggggg', '.gggggggglggg.', '..gggggggggg..', '...gggggggg...', '......tt......', '......tt......', '......tt......', '.....tttt.....'],
    pal: { g: '#2e7d32', l: '#66bb6a', t: '#6d4c41' },
  },
  HOME: {
    tpl: ['......rr......', '.....rrrr.....', '....rrrrrr....', '...rrrrrrrr...', '..rrrrrrrrrr..', '.rrrrrrrrrrrr.', '..wwwwwwwwww..', '..wbbwwwwddw..', '..wbbwwwwddw..', '..wwwwwwwddw..', '..wwwwwwwddw..', '..kkkkkkkkkk..'],
    pal: { r: '#ffa726', w: '#fff3e0', b: '#80deea', d: '#6d4c41', k: '#555555' },
  },
};

export function landmarkIcon(kind: string): HTMLCanvasElement {
  const px = pixelSprite('landmarks', kind);
  if (px) return px;
  const i = ICONS[kind] ?? ICONS.PARK!;
  return shadeSprite(i.tpl, i.pal);
}
