/**
 * Equipment layers for the 48×64 avatar pack — pure pixel code (no DOM), shared by the game
 * (`avatar.ts`) and the offline preview (`tools/artpreview/avatar.mts`).
 *
 * Instead of one hand-drawn overlay per animation frame, clothes are painted from the body's own
 * pixels: every body frame is a grey mannequin (outline / shadow / base), so a shirt is "the torso
 * band re-shaded in cloth colours", boots are "the bottom rows of each leg", and so on. The gear
 * therefore follows every walk/idle frame automatically, and keeps working when the placeholder
 * body is replaced with original art of the same layout. Weapons are small procedural sprites
 * placed at the hand found in each frame. Outfits (chest slot) bring their own footwear.
 */

/** Same shape as the DOM's ImageData, so canvas pixels can be passed straight in. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** What the avatar wears: equipment sprite keys (EquipmentDef.sprite) + the shirt dye. */
export interface GearLook {
  helmet?: string;
  chest?: string;
  weapon?: string;
  /** OUTFIT_COLORS index — dyes cloth tops. */
  outfit?: number;
  gender?: 'male' | 'female';
}

type RGB = [number, number, number];
/** [outline, shadow, base, light] */
type Ramp = [RGB, RGB, RGB, RGB];

export const OUTFIT_DYES = ['#ffa726', '#3f7ce0', '#3aa655', '#8e44ad', '#d64545', '#3a3f48'];

// ---------------------------------------------------------------------------------------------
// Colour helpers

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
const BLACK: RGB = [12, 10, 16];
const WHITE: RGB = [255, 255, 255];
/** Four-step ramp from a base colour: dark outline, shadow, base, highlight. */
function ramp(base: string, outline = 0.72, shadow = 0.3, light = 0.32): Ramp {
  const b = hex(base);
  return [mix(b, BLACK, outline), mix(b, BLACK, shadow), b, mix(b, WHITE, light)];
}

// ---------------------------------------------------------------------------------------------
// Body analysis

const EMPTY = 0, LINE = 1, SHADE = 2, BASE = 3, EYE = 4;

/** Pixel classes of the grey mannequin (see avatar HANDOFF.md). */
function classify(body: Pixels): Uint8Array {
  const c = new Uint8Array(body.width * body.height);
  for (let i = 0; i < c.length; i++) {
    const d = body.data;
    if (d[i * 4 + 3]! < 128) continue;
    const r = d[i * 4]!;
    c[i] = r === 0x47 ? SHADE : r === 0x8a ? BASE : r === 0xdb ? EYE : LINE;
  }
  return c;
}

export interface Anatomy {
  top: number;
  bottom: number;
  /** Narrowest row between head and torso. */
  neck: number;
  /** Last torso row (belt line). */
  hip: number;
  /** Torso centre column. */
  cx: number;
  /** Hand on the right of the cell (the side the avatar faces) and on the left. */
  farHand: { x: number; y: number };
  nearHand: { x: number; y: number };
  /** Rightmost head column (keeps tall held items clear of the face). */
  headRight: number;
  /** 1 = torso core, 2 = arm, 3 = hand (skin stays visible). */
  part: Uint8Array;
}

const TORSO_ROWS = 14;

export function analyzeBody(body: Pixels, cls = classify(body)): Anatomy {
  const { width: w, height: h } = body;
  let top = h, bottom = 0;
  const width = new Array<number>(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!cls[y * w + x]) continue;
      width[y]!++;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  let neck = top + 16;
  for (let y = top + 12, best = Infinity; y <= Math.min(bottom, top + 22); y++) {
    if (width[y]! > 0 && width[y]! < best) {
      best = width[y]!;
      neck = y;
    }
  }
  const hip = Math.min(bottom - 4, neck + TORSO_ROWS);

  // Torso core: flood fill of skin pixels from the chest centre, bounded by the internal outlines.
  const part = new Uint8Array(w * h);
  const seedY = neck + 6;
  const xs: number[] = [];
  for (let x = 0; x < w; x++) if (cls[seedY * w + x]! >= SHADE) xs.push(x);
  const mid = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : w / 2;
  const seedX = xs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0] ?? Math.round(mid);
  const inBand = (y: number) => y > neck && y <= hip;
  const stack = [seedY * w + seedX];
  while (stack.length) {
    const i = stack.pop()!;
    if (part[i] || cls[i]! < SHADE || !inBand(Math.floor(i / w))) continue;
    part[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    stack.push(i - w, i + w);
  }
  let cSum = 0, cN = 0;
  for (let x = 0; x < w; x++) if (part[seedY * w + x] === 1) (cSum += x), cN++;
  const cx = cN ? Math.round(cSum / cN) : Math.round(mid);

  // Everything else in the torso band is an arm; each arm's lowest two rows are its hand.
  for (let y = neck + 1; y <= hip; y++) for (let x = 0; x < w; x++) if (cls[y * w + x]! >= SHADE && !part[y * w + x]) part[y * w + x] = 2;
  const seen = new Uint8Array(w * h);
  for (let i = 0; i < part.length; i++) {
    if (part[i] !== 2 || seen[i]) continue;
    const comp: number[] = [];
    const st = [i];
    while (st.length) {
      const j = st.pop()!;
      if (j < 0 || j >= part.length || seen[j] || part[j] !== 2) continue;
      seen[j] = 1;
      comp.push(j);
      const x = j % w;
      if (x > 0) st.push(j - 1);
      if (x < w - 1) st.push(j + 1);
      st.push(j - w, j + w);
    }
    const maxY = Math.max(...comp.map((j) => Math.floor(j / w)));
    if (comp.length >= 4 && maxY >= neck + 8) for (const j of comp) if (Math.floor(j / w) >= maxY - 1) part[j] = 3;
  }

  // Hands for held items: the outermost silhouette on each side of the torso band, lowest point.
  const hand = (side: 1 | -1) => {
    let edge = side === 1 ? -1 : w;
    for (let y = neck + 3; y <= hip; y++) {
      for (let x = 0; x < w; x++) {
        if (!cls[y * w + x]) continue;
        edge = side === 1 ? Math.max(edge, x) : Math.min(edge, x);
      }
    }
    let hy = neck + 8;
    for (let y = neck + 3; y <= hip; y++) {
      for (let x = 0; x < w; x++) {
        if (cls[y * w + x] && (side === 1 ? x >= edge - 1 : x <= edge + 1)) hy = Math.max(hy, y);
      }
    }
    return { x: edge - side, y: hy - 1 };
  };

  let headRight = 0;
  for (let y = top; y < neck; y++) for (let x = 0; x < w; x++) if (cls[y * w + x]) headRight = Math.max(headRight, x);

  return { top, bottom, neck, hip, cx, farHand: hand(1), nearHand: hand(-1), headRight, part };
}

// ---------------------------------------------------------------------------------------------
// Layer painting

class Painter {
  constructor(
    readonly img: Pixels,
    readonly cls: Uint8Array,
  ) {}
  get w() {
    return this.img.width;
  }
  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.img.width && y < this.img.height;
  }
  set(x: number, y: number, c: RGB) {
    if (!this.inside(x, y)) return;
    const i = (y * this.img.width + x) * 4;
    this.img.data[i] = c[0];
    this.img.data[i + 1] = c[1];
    this.img.data[i + 2] = c[2];
    this.img.data[i + 3] = 255;
  }
  opaque(x: number, y: number) {
    return this.inside(x, y) && this.img.data[(y * this.img.width + x) * 4 + 3]! >= 128;
  }
  /** Re-shade one body pixel with a ramp, keeping the mannequin's own light/shadow structure. */
  shade(x: number, y: number, r: Ramp) {
    const c = this.cls[y * this.w + x]!;
    if (c === LINE) this.set(x, y, r[0]);
    else if (c === SHADE) this.set(x, y, r[1]);
    else if (c === BASE || c === EYE) this.set(x, y, r[2]);
  }
}

/** A small free-standing sprite (weapon/shield) with an automatic 1-px outline. */
class Sprite {
  px = new Map<number, RGB>();
  constructor(readonly w: number, readonly h: number) {}
  dot(x: number, y: number, c: RGB) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px.set(y * this.w + x, c);
  }
  stampOn(p: Painter, outline: RGB) {
    const edge = new Map<number, RGB>();
    for (const i of this.px.keys()) {
      const x = i % this.w, y = Math.floor(i / this.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
        const j = Y * this.w + X;
        if (!this.px.has(j)) edge.set(j, outline);
      }
    }
    for (const [i, c] of [...edge, ...this.px]) p.set(i % this.w, Math.floor(i / this.w), c);
  }
}

// --- Clothes ---------------------------------------------------------------------------------

interface ClothDef {
  ramp: (look: GearLook) => Ramp;
  sleeves: 'long' | 'short';
  /** Extra rows below the belt line (tunic hem). */
  hem: number;
  collar?: 'v' | 'round';
  belt?: string;
  trim?: string;
  rivets?: string;
  emblem?: 'drop';
  pauldrons?: boolean;
  /** Footwear that comes with the outfit (BOOTS key). */
  feet?: string;
}

const CHEST: Record<string, ClothDef> = {
  chest_cotton_01: {
    ramp: (l) => ramp(OUTFIT_DYES[l.outfit ?? 0] ?? OUTFIT_DYES[0]!),
    sleeves: 'short',
    hem: 2,
    collar: 'v',
    belt: '#7a5a34',
    feet: 'boots_sandal_01',
  },
  plate_fuel_01: {
    ramp: () => ramp('#c63a2e', 0.7, 0.32, 0.35),
    sleeves: 'long',
    hem: 1,
    collar: 'round',
    belt: '#3a3f48',
    trim: '#f2c230',
    rivets: '#f7e27a',
    emblem: 'drop',
    pauldrons: true,
    feet: 'boots_greave_01',
  },
};

const UNDERWEAR = ramp('#dde6f2', 0.74, 0.3, 0.4);

function paintLegwear(p: Painter, a: Anatomy, look: GearLook) {
  // Plain undershorts — the "8-bit underwear" of a naked start, and the base under every outfit.
  for (let y = a.hip + 1; y <= Math.min(a.bottom - 5, a.hip + 3); y++) {
    for (let x = 0; x < p.w; x++) if (p.cls[y * p.w + x]) p.shade(x, y, UNDERWEAR);
  }
  if (look.gender === 'female' && !look.chest) {
    for (let y = a.neck + 3; y <= a.neck + 6; y++) {
      for (let x = 0; x < p.w; x++) if (a.part[y * p.w + x] === 1 || (p.cls[y * p.w + x] === LINE && a.part[y * p.w + x + 1] === 1)) p.shade(x, y, UNDERWEAR);
    }
  }
}

function paintChest(p: Painter, a: Anatomy, look: GearLook) {
  const def = look.chest ? CHEST[look.chest] : undefined;
  if (!def) return;
  const r = def.ramp(look);
  const shortEnd = a.neck + 6;
  const last = Math.min(a.bottom - 5, a.hip + def.hem);
  for (let y = a.neck + 1; y <= last; y++) {
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x;
      if (!p.cls[i]) continue;
      const part = a.part[i]!;
      if (part === 3) continue; // hands stay skin
      if (part === 2 && def.sleeves === 'short' && y > shortEnd) continue;
      p.shade(x, y, r);
    }
  }
  // Shoulder highlight on the first two rows.
  for (let y = a.neck + 1; y <= a.neck + 2; y++) for (let x = 0; x < p.w; x++) if (p.cls[y * p.w + x] === BASE) p.set(x, y, r[3]);
  if (def.pauldrons) {
    for (let y = a.neck + 1; y <= a.neck + 3; y++) {
      for (let x = 0; x < p.w; x++) if (a.part[y * p.w + x] === 2) p.set(x, y, y === a.neck + 1 ? r[3] : hex(def.trim ?? '#ffffff'));
    }
  }
  // Collar at the neck line.
  const cx = a.cx;
  if (def.collar === 'v') {
    p.set(cx, a.neck + 1, r[0]);
    p.set(cx + 1, a.neck + 1, r[0]);
    p.set(cx, a.neck + 2, r[1]);
  } else if (def.collar === 'round') {
    for (let x = cx - 2; x <= cx + 2; x++) if (p.cls[(a.neck + 1) * p.w + x]) p.set(x, a.neck + 1, hex(def.trim ?? '#dddddd'));
  }
  if (def.belt) {
    const b = hex(def.belt);
    for (let x = 0; x < p.w; x++) {
      const i = a.hip * p.w + x;
      if (a.part[i] === 1 || (p.cls[i] === BASE || p.cls[i] === SHADE)) if (a.part[i] !== 3) p.set(x, a.hip, b);
    }
    p.set(cx, a.hip, hex(def.trim ?? '#e0b030'));
  }
  if (def.trim) {
    const t = hex(def.trim);
    for (let x = 0; x < p.w; x++) if (p.cls[last * p.w + x] === BASE || p.cls[last * p.w + x] === SHADE) p.set(x, last, t);
  }
  if (def.rivets) {
    const c = hex(def.rivets);
    for (const [dx, dy] of [[-3, 3], [3, 3], [-3, 8], [3, 8]] as const) if (a.part[(a.neck + dy) * p.w + cx + dx] === 1) p.set(cx + dx, a.neck + dy, c);
  }
  if (def.emblem === 'drop') {
    const y0 = a.neck + 4;
    const c = hex('#f7d64a'), d = hex('#b07a12');
    p.set(cx, y0, c);
    p.set(cx - 1, y0 + 1, c);
    p.set(cx, y0 + 1, c);
    p.set(cx + 1, y0 + 1, d);
    p.set(cx - 1, y0 + 2, c);
    p.set(cx, y0 + 2, d);
    p.set(cx + 1, y0 + 2, d);
  }
}

// --- Boots -----------------------------------------------------------------------------------

interface BootDef {
  height: number;
  ramp: Ramp;
  stripe?: string;
  sole: string;
  /** Sandals: only straps, the foot's skin shows through. */
  straps?: boolean;
}

const BOOTS: Record<string, BootDef> = {
  boots_greave_01: { height: 4, ramp: ramp('#9aa4b0', 0.7, 0.3, 0.4), stripe: '#f2c230', sole: '#3a3f48' },
  boots_sandal_01: { height: 3, ramp: ramp('#8d5a2b'), sole: '#5a3a1c', straps: true },
};

function paintBoots(p: Painter, a: Anatomy, look: GearLook) {
  const feet = look.chest ? CHEST[look.chest]?.feet : undefined;
  const def = feet ? BOOTS[feet] : undefined;
  if (!def) return;
  const from = a.hip + 4;
  for (let x = 0; x < p.w; x++) {
    let foot = -1;
    for (let y = p.img.height - 1; y >= from; y--) {
      if (p.cls[y * p.w + x]) {
        foot = y;
        break;
      }
    }
    if (foot < 0) continue;
    for (let y = Math.max(from, foot - def.height); y <= foot; y++) {
      const c = p.cls[y * p.w + x]!;
      if (!c) continue;
      const k = foot - y; // 0 = sole row
      if (def.straps) {
        if (k === 0) p.set(x, y, hex(def.sole));
        else if (k === 2 || c === LINE) p.shade(x, y, def.ramp);
        continue;
      }
      if (c === LINE) p.set(x, y, def.ramp[0]);
      else if (k === 0) p.set(x, y, hex(def.sole));
      else if (k === 1 && def.stripe) p.set(x, y, hex(def.stripe));
      else p.shade(x, y, def.ramp);
    }
  }
}

// --- Headgear --------------------------------------------------------------------------------

interface HelmDef {
  kind: 'cap' | 'band';
  ramp: Ramp;
  rivets?: string;
}

const HELMS: Record<string, HelmDef> = {
  helm_iron_02: { kind: 'cap', ramp: ramp('#9aa4ae', 0.7, 0.3, 0.4), rivets: '#e8edf2' },
  head_bandana_01: { kind: 'band', ramp: ramp('#d23b3b') },
};

/** Painted after the hair so it covers the crown. `hair` = hair layer alpha (same cell). */
function paintHelmet(p: Painter, a: Anatomy, look: GearLook, hairTop: number) {
  const def = look.helmet ? HELMS[look.helmet] : undefined;
  if (!def) return;
  const r = def.ramp;
  const W = p.w;
  const rowSpan = (y: number): [number, number] | null => {
    let lo = W, hi = -1;
    for (let x = 0; x < W; x++) if (p.opaque(x, y)) (lo = Math.min(lo, x)), (hi = Math.max(hi, x));
    return hi < 0 ? null : [lo, hi];
  };
  if (def.kind === 'cap') {
    const brim = a.top + 7;
    const y0 = Math.min(hairTop, a.top) - 1;
    const span = rowSpan(brim) ?? [a.cx - 6, a.cx + 6];
    for (let y = y0; y <= brim; y++) {
      const s = rowSpan(y);
      if (!s) continue;
      const lo = Math.max(s[0], span[0]) - (y === brim ? 1 : 0);
      const hi = Math.min(s[1], span[1]) + (y === brim ? 1 : 0);
      for (let x = lo; x <= hi; x++) {
        const edge = x === lo || x === hi || y === y0;
        const c = edge ? r[0] : y === brim ? r[1] : y <= y0 + 2 ? r[3] : x > a.cx + 3 ? r[1] : r[2];
        p.set(x, y, c);
      }
      if (y === brim) {
        p.set(lo - 1, y, r[0]);
        p.set(hi + 1, y, r[0]);
      }
    }
    // Brim underside outline
    for (let x = span[0] - 1; x <= span[1] + 1; x++) if (p.opaque(x, brim + 1)) p.set(x, brim + 1, r[0]);
    if (def.rivets) {
      const c = hex(def.rivets);
      p.set(a.cx - 4, brim, c);
      p.set(a.cx, brim, c);
      p.set(a.cx + 4, brim, c);
    }
    // Crest ridge
    for (let y = y0 + 1; y < brim - 1; y++) p.set(a.cx - 1, y, r[3]);
  } else {
    const rows = [a.top + 5, a.top + 6, a.top + 7];
    let back = W;
    rows.forEach((y, k) => {
      const s = rowSpan(y);
      if (!s) return;
      back = Math.min(back, s[0]);
      for (let x = s[0]; x <= s[1]; x++) p.set(x, y, x === s[0] || x === s[1] ? r[0] : k === 0 ? r[3] : k === 1 ? r[2] : r[1]);
    });
    // Knot and tails at the back of the head (the avatar faces right).
    const kx = back - 1, ky = a.top + 6;
    for (const [x, y, c] of [
      [kx, ky - 1, r[2]], [kx, ky, r[1]], [kx - 1, ky + 1, r[2]], [kx - 2, ky + 2, r[1]], [kx - 1, ky + 2, r[2]], [kx - 2, ky + 3, r[1]],
    ] as [number, number, RGB][]) p.set(x, y, c);
    for (const [x, y] of [[kx, ky - 2], [kx - 1, ky - 1], [kx - 1, ky], [kx - 2, ky + 1], [kx - 3, ky + 2], [kx - 3, ky + 3], [kx - 2, ky + 4], [kx, ky + 1], [kx, ky + 2]] as const) {
      if (!p.opaque(x, y)) p.set(x, y, r[0]);
    }
  }
}

// --- Held items ------------------------------------------------------------------------------

interface WeaponDef {
  kind: 'blade' | 'club' | 'staff';
  len: number;
  width: 2 | 3;
  ramp: Ramp;
  guard?: string;
  guardHalf?: number;
  handle: string;
  head?: 'star' | 'knob';
  headColor?: string;
}

const WEAPONS: Record<string, WeaponDef> = {
  weapon_wood_01: { kind: 'blade', len: 10, width: 2, ramp: ramp('#c28a4a'), guard: '#7a4e24', guardHalf: 1, handle: '#5a3a1c' },
  weapon_broadsword_01: { kind: 'blade', len: 13, width: 3, ramp: ramp('#c9d2dc', 0.72, 0.3, 0.45), guard: '#e0b030', guardHalf: 2, handle: '#6b3f22' },
  weapon_club_01: { kind: 'club', len: 8, width: 3, ramp: ramp('#e58ea0', 0.7, 0.25, 0.35), handle: '#8a5a2e' },
  weapon_staff_wood_01: { kind: 'staff', len: 22, width: 2, ramp: ramp('#a8743e'), handle: '#a8743e', head: 'knob', headColor: '#6e4424' },
  weapon_staff_star_01: { kind: 'staff', len: 25, width: 2, ramp: ramp('#5b6fd6', 0.7, 0.3, 0.4), handle: '#3a3f7a', head: 'star', headColor: '#ffe066' },
};

/** `only` splits a staff: its shaft goes behind the body, its head in front of everything. */
function paintWeapon(p: Painter, a: Anatomy, key?: string, only?: 'shaft' | 'head') {
  const def = key ? WEAPONS[key] : undefined;
  if (!def) return;
  const s = new Sprite(p.w, p.img.height);
  const { x: gx, y: gy } = a.farHand;
  const r = def.ramp;
  if (def.kind === 'staff') {
    const x = Math.max(gx, a.headRight + 2);
    for (let y = gy + 3; y >= gy - def.len && only !== 'head'; y--) {
      s.dot(x, y, r[2]);
      if (def.width > 1) s.dot(x + 1, y, r[1]);
      if ((gy - y) % 5 === 0) s.dot(x, y, r[3]);
    }
    const hy = gy - def.len - 2;
    const hc = hex(def.headColor ?? '#ffffff');
    if (only === 'shaft') {
      s.stampOn(p, r[0]);
      return;
    }
    if (def.head === 'star') {
      for (const [dx, dy] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [1, 1], [0, 1]] as const) s.dot(x + dx, hy + dy, hc);
      s.dot(x, hy, WHITE);
    } else {
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1]] as const) s.dot(x + dx, hy + dy, hc);
      s.dot(x - 1, hy - 1, mix(hc, WHITE, 0.35));
    }
    s.stampOn(p, r[0]);
    return;
  }
  // Blades and clubs point up and forward (45°) from the grip.
  const h = hex(def.handle);
  for (let k = 0; k < 3; k++) s.dot(gx - k, gy + k, h);
  if (def.guard) {
    const g = hex(def.guard);
    for (let j = -(def.guardHalf ?? 1); j <= (def.guardHalf ?? 1); j++) s.dot(gx + 1 + j, gy - 1 + j, g);
  }
  for (let t = 0; t < def.len; t++) {
    const x = gx + 2 + t, y = gy - 2 - t;
    const tip = t === def.len - 1;
    if (def.kind === 'club') {
      const thick = Math.min(def.width, 1 + Math.floor(t / 2));
      s.dot(x, y, r[2]);
      if (thick > 1) s.dot(x, y - 1, r[3]);
      if (thick > 2) s.dot(x + 1, y, r[1]);
      if (t % 3 === 2) s.dot(x, y, mix(r[2], WHITE, 0.5)); // bologna slices
      continue;
    }
    s.dot(x, y, tip ? r[3] : r[2]);
    if (!tip) s.dot(x, y - 1, r[3]);
    if (def.width === 3 && !tip) s.dot(x + 1, y, r[1]);
  }
  s.stampOn(p, r[0]);
}

// ---------------------------------------------------------------------------------------------
// Public entry points

/** Keys this module knows how to draw (for tests / data validation). */
export const GEAR_SPRITES = new Set([...Object.keys(CHEST), ...Object.keys(HELMS), ...Object.keys(WEAPONS)]);

/** Stable cache key for a gear look. */
export function gearKey(g: GearLook): string {
  return [g.gender ?? '', g.helmet ?? '', g.chest ?? '', g.chest === 'chest_cotton_01' ? (g.outfit ?? 0) : '', g.weapon ?? ''].join('|');
}

/**
 * Composite one avatar frame.
 * @param body raw grey mannequin frame; @param hair raw hair tone map (same cell)
 * @param out  destination (same size) — receives skin → clothes → hair → helmet → held items
 */
export function composeAvatar(
  body: Pixels,
  hair: Pixels | null,
  out: Pixels,
  opts: { skin: { shadow: string; base: string }; hairRamp: string[]; gear: GearLook },
) {
  const cls = classify(body);
  const a = analyzeBody(body, cls);
  const p = new Painter(out, cls);
  out.data.fill(0);
  // 0. Staffs are carried beside the body — draw them first so the body stays in front.
  const behind = WEAPONS[opts.gear.weapon ?? '']?.kind === 'staff';
  if (behind) paintWeapon(p, a, opts.gear.weapon, 'shaft');
  // 1. Skin
  const sh = hex(opts.skin.shadow), ba = hex(opts.skin.base);
  for (let i = 0; i < cls.length; i++) {
    const c = cls[i]!;
    if (!c) continue;
    const x = i % body.width, y = Math.floor(i / body.width);
    if (c === SHADE) p.set(x, y, sh);
    else if (c === BASE) p.set(x, y, ba);
    else p.set(x, y, [body.data[i * 4]!, body.data[i * 4 + 1]!, body.data[i * 4 + 2]!]);
  }
  // 2. Clothes under the hair
  paintLegwear(p, a, opts.gear);
  paintBoots(p, a, opts.gear);
  paintChest(p, a, opts.gear);
  // 3. Hair (tone map: level = round(grey / 40), ramp[min(level, 5)])
  let hairTop = a.top;
  if (hair) {
    const ramp6 = opts.hairRamp.map(hex);
    for (let i = 0; i < hair.width * hair.height; i++) {
      if (hair.data[i * 4 + 3]! < 128) continue;
      const level = Math.min(Math.round(hair.data[i * 4]! / 40), 5);
      const y = Math.floor(i / hair.width);
      hairTop = Math.min(hairTop, y);
      p.set(i % hair.width, y, ramp6[level] ?? ramp6[0] ?? [0, 0, 0]);
    }
  }
  // 4. Headgear over the hair, then held items on top.
  paintHelmet(p, a, opts.gear, hairTop);
  paintWeapon(p, a, opts.gear.weapon, behind ? 'head' : undefined);
}
