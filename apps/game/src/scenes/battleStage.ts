/**
 * Battle stage (ROADMAP ⚔️ phase 2): the fight happens on the player's real street.
 *
 * - Floor: the 16-bit tiles around the player (the same vector-tile data the map streams, drawn
 *   with art.ts's tile painter) projected SNES "Mode-7" style — one drawImage per scanline, once
 *   per fight, at 1/3 resolution and scaled up with nearest-neighbour so it stays pixel art.
 * - Sky: by gate layer (field / pixel glitch / myth gold / world boss) and the real time of day.
 * - Backdrop: the landmark you entered stands on the horizon; plain fights get a city skyline.
 * - riftBreak(): the screen "tears" when a boss changes phase (WebGL post-FX when available,
 *   plain overlays otherwise).
 * Presentation only — nothing here feeds the combat engine.
 */
import Phaser from 'phaser';
import type { LandmarkKind } from '@pw/shared';
import { buildAtlas, drawTile, TILE_PX, type TileAtlas } from '../game/art';
import { pixelImage } from '../game/sprites';
import { tileAt, toTile } from '../game/world';

export type StageLayer = 'FIELD' | 'PIXEL' | 'MYTH' | 'WORLD';
export type DayPart = 'day' | 'dusk' | 'night';

/** Pixel size of the stage art on screen (sky + floor are drawn at 1/LOW and scaled up). */
const LOW = 3;
/** Horizon as a fraction of the screen height. */
export const HORIZON = 0.4;

export function dayPart(d = new Date()): DayPart {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 6 && h < 16.5) return 'day';
  if (h >= 16.5 && h < 19) return 'dusk';
  return 'night';
}

let atlas: TileAtlas | null = null;

/** Cheap deterministic hash → [0,1) for procedural details. */
function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

const SKY: Record<StageLayer, Record<DayPart, [string, string]>> = {
  FIELD: { day: ['#5aa8e8', '#c8ecff'], dusk: ['#3a2a6a', '#ff9a5a'], night: ['#070b22', '#23315e'] },
  PIXEL: { day: ['#1a0c38', '#5a2a8a'], dusk: ['#1a0c38', '#8a2a6a'], night: ['#08041a', '#3a1a60'] },
  MYTH: { day: ['#5a2a10', '#f2c230'], dusk: ['#3a1408', '#ff8a3a'], night: ['#1a0c08', '#a0601a'] },
  WORLD: { day: ['#1a4a30', '#e8d070'], dusk: ['#1a2a20', '#ff9a5a'], night: ['#08140e', '#4a6a30'] },
};

/** Paints the sky (gradient + layer details) into a low-res canvas. */
function paintSky(w: number, h: number, layer: StageLayer, part: DayPart): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h);
  const [top, bottom] = SKY[layer][part];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Posterise the gradient into bands so it reads as 16-bit.
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(img.data[i + k]! / 24) * 24;
  ctx.putImageData(img, 0, 0);

  if (part === 'night' || layer === 'PIXEL') {
    for (let i = 0; i < w * h * 0.004; i++) {
      const x = Math.floor(hash(i, 1) * w);
      const y = Math.floor(hash(i, 2) * h * 0.8);
      ctx.fillStyle = hash(i, 3) > 0.8 ? '#fff6c8' : '#c8d4ff';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  if (part === 'day' && layer === 'FIELD') {
    for (let k = 0; k < 4; k++) {
      const cx = hash(k, 7) * w;
      const cy = h * (0.15 + hash(k, 8) * 0.4);
      ctx.fillStyle = '#ffffff';
      for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(cx + j * 5 - 10), Math.round(cy - (j % 2) * 2), 9, 4);
    }
  }
  if (layer === 'PIXEL') {
    // The tear this gate opened: a jagged glitch crack across the sky, data squares drifting.
    ctx.fillStyle = '#0a0620';
    let y = h * 0.3;
    for (let x = 0; x < w; x += 2) {
      y += (hash(x, 11) - 0.5) * 3;
      const t = 1 + Math.round(hash(x, 12) * 2);
      ctx.fillStyle = '#ff7ae0';
      ctx.fillRect(x, Math.round(y) - t - 1, 2, 1);
      ctx.fillStyle = '#0a0620';
      ctx.fillRect(x, Math.round(y) - t, 2, t * 2);
      ctx.fillStyle = '#7ff0ff';
      ctx.fillRect(x, Math.round(y) + t, 2, 1);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 ? '#7ff0ff' : '#ff7ae0';
      ctx.fillRect(Math.floor(hash(i, 21) * w), Math.floor(hash(i, 22) * h), 2, 2);
    }
  }
  if (layer === 'MYTH' || layer === 'WORLD') {
    // God rays fanning down from the top.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff6c8';
    for (let k = 0; k < 6; k++) {
      const x = w * (0.1 + k * 0.16);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 6, 0);
      ctx.lineTo(x + 26, h);
      ctx.lineTo(x + 14, h);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  return c;
}

/** A city skyline silhouette along the horizon (lit windows at dusk/night). */
function paintSkyline(ctx: CanvasRenderingContext2D, w: number, base: number, part: DayPart, seed: number) {
  const body = part === 'day' ? '#6a7aa0' : part === 'dusk' ? '#3a2a4a' : '#141a30';
  const lit = part === 'day' ? '#8a9ac0' : '#ffd97a';
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 6 + Math.floor(hash(i, seed) * 14);
    const bh = 6 + Math.floor(hash(i, seed + 1) ** 2 * 26);
    ctx.fillStyle = body;
    ctx.fillRect(x, base - bh, bw, bh);
    for (let wy = base - bh + 2; wy < base - 2; wy += 3) {
      for (let wx = x + 1; wx < x + bw - 1; wx += 3) {
        if (hash(wx, wy, seed) > (part === 'day' ? 0.8 : 0.55)) {
          ctx.fillStyle = lit;
          ctx.fillRect(wx, wy, 1, 1);
        }
      }
    }
    x += bw + (hash(i, seed + 2) > 0.7 ? 2 : 0);
    i++;
  }
}

/** The real street around the player, as a flat 16-bit tile map (the Mode-7 source). */
function paintStreet(lat: number, lng: number, cols: number, rows: number, nearRows: number): HTMLCanvasElement {
  atlas ??= buildAtlas();
  const [c, ctx] = canvas(cols * TILE_PX, rows * TILE_PX);
  const t = toTile(lat, lng);
  const x0 = Math.floor(t.x - cols / 2);
  const y0 = Math.floor(t.y - (rows - nearRows));
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const gx = x0 + tx;
      const gy = y0 + ty;
      drawTile(ctx, atlas, tileAt(gx, gy), Math.abs(gx * 7 + gy * 13) % 4, (dx, dy) => tileAt(gx + dx, gy + dy), tx * TILE_PX, ty * TILE_PX);
    }
  }
  return c;
}

/** SNES Mode-7: projects the flat street onto the floor, one scanline at a time. */
function mode7(src: HTMLCanvasElement, w: number, h: number, nearRows: number, haze: string): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
  const camX = src.width / 2;
  const camY = src.height - (nearRows * TILE_PX) / 2; // camera stands a little behind the fighters
  const zNear = 20;
  const k = zNear * h;
  const fov = 1.35;
  for (let r = 0; r < h; r++) {
    const d = r + 1;
    const z = k / d; // distance ahead of the camera (source px) for this scanline
    const sy = Math.floor(camY - z);
    if (sy < 0) continue; // beyond the loaded street → haze
    const vw = Math.max(4, z * fov * (w / h) * 0.9);
    ctx.drawImage(src, camX - vw / 2, sy, vw, 1, 0, r, w, 1);
  }
  // Atmospheric haze towards the horizon + a darker rim at the bottom edge.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, haze);
  g.addColorStop(0.28, `${haze}00`);
  g.addColorStop(0.85, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return c;
}

const HAZE: Record<StageLayer, Record<DayPart, string>> = {
  FIELD: { day: '#c8ecff', dusk: '#ff9a5a', night: '#23315e' },
  PIXEL: { day: '#5a2a8a', dusk: '#8a2a6a', night: '#3a1a60' },
  MYTH: { day: '#f2c230', dusk: '#ff8a3a', night: '#a0601a' },
  WORLD: { day: '#e8d070', dusk: '#ff9a5a', night: '#4a6a30' },
};
const NIGHT_TINT: Record<DayPart, [number, number]> = { day: [0x000000, 0], dusk: [0x3a1030, 0.2], night: [0x05082a, 0.45] };

export interface StageOpts {
  lat: number;
  lng: number;
  layer: StageLayer;
  /** Landmark kind whose gate we are in (its building stands on the horizon). */
  kind?: LandmarkKind;
  part?: DayPart;
}

/** Builds the whole backdrop; everything is fixed to the screen (scroll factor 0). */
export function buildStage(scene: Phaser.Scene, o: StageOpts): { horizonY: number; part: DayPart } {
  const { width, height } = scene.scale;
  const part = o.part ?? dayPart();
  const horizonY = Math.round(height * HORIZON);
  const lw = Math.ceil(width / LOW);
  const skyH = Math.ceil(horizonY / LOW);
  const floorH = Math.ceil((height - horizonY) / LOW);
  const stamp = Date.now().toString(36);

  // Sky + horizon backdrop
  const sky = paintSky(lw, skyH, o.layer, part);
  const sctx = sky.getContext('2d')!;
  sctx.imageSmoothingEnabled = false;
  paintSkyline(sctx, lw, skyH, part, Math.floor(Math.abs(o.lat * 1000 + o.lng * 1000)) % 997);
  const skyKey = `stage_sky_${stamp}`;
  scene.textures.addCanvas(skyKey, sky);
  scene.add.image(0, 0, skyKey).setOrigin(0).setScale(LOW).setDepth(0).setScrollFactor(0);

  // Floor: Mode-7 of the real street
  const cols = 72;
  const rows = 64;
  const nearRows = 6;
  let floor: HTMLCanvasElement;
  try {
    floor = mode7(paintStreet(o.lat, o.lng, cols, rows, nearRows), lw, floorH, nearRows, HAZE[o.layer][part]);
  } catch {
    [floor] = canvas(lw, floorH);
    const fctx = floor.getContext('2d')!;
    fctx.fillStyle = '#3d5a3a';
    fctx.fillRect(0, 0, lw, floorH);
  }
  const floorKey = `stage_floor_${stamp}`;
  scene.textures.addCanvas(floorKey, floor);
  scene.add.image(0, horizonY, floorKey).setOrigin(0).setScale(LOW).setDepth(1).setScrollFactor(0);

  // The gate's building on the horizon (open-rift frame), behind the monsters.
  if (o.kind) {
    const img = pixelImage('landmarks', `gate_${o.kind}`);
    if (img) {
      const key = `stage_gate_${o.kind}`;
      if (!scene.textures.exists(key)) {
        const fw = img.width / 4;
        const [c, ctx] = canvas(fw, img.height);
        ctx.drawImage(img, 0, 0, fw, img.height, 0, 0, fw, img.height);
        scene.textures.addCanvas(key, c);
      }
      scene.add.image(width * 0.72, horizonY + 6, key).setOrigin(0.5, 1).setScale(LOW + 1).setDepth(2).setScrollFactor(0).setAlpha(0.95);
    }
  }

  // Time of day over everything behind the fighters.
  const [tint, alpha] = NIGHT_TINT[part];
  if (alpha > 0) scene.add.rectangle(0, 0, width, height, tint, alpha).setOrigin(0).setDepth(3).setScrollFactor(0);

  scene.events.once('shutdown', () => {
    for (const k of [skyKey, floorKey]) if (scene.textures.exists(k)) scene.textures.remove(k);
  });
  return { horizonY, part };
}

/**
 * The world tears when a boss changes phase. Pixel layer: horizontal glitch slices + colour shift
 * + pixelate pulse. Myth/world layer: golden flame border + glow. `webgl` post-FX only when the
 * renderer supports it (plain overlays always run).
 */
export function riftBreak(scene: Phaser.Scene, layer: StageLayer, strength = 1) {
  // strength: the player's shake/flash setting × a speed damper (0 = only the banner, no effects).
  if (strength <= 0) return;
  const { width, height } = scene.scale;
  const cam = scene.cameras.main;
  const webgl = scene.game.renderer.type === Phaser.WEBGL;
  if (layer === 'MYTH' || layer === 'WORLD') {
    const glow = scene.add.rectangle(0, 0, width, height, 0xffd26a, 0.4 * strength).setOrigin(0).setDepth(69).setScrollFactor(0);
    scene.tweens.add({ targets: glow, alpha: 0, duration: 320, onComplete: () => glow.destroy() });
    const g = scene.add.graphics().setDepth(70).setScrollFactor(0);
    let n = 0;
    const draw = () => {
      g.clear();
      const flame = (x: number, y: number, dx: number, dy: number, len: number) => {
        g.fillStyle(n % 2 ? 0xf2c230 : 0xff8a3a, 0.9);
        g.fillTriangle(x, y, x + dx * 10 + dy * 6, y + dy * 10 + dx * 6, x + dx * len, y + dy * len);
      };
      for (let x = 0; x < width; x += 22) {
        flame(x, 0, 0, 1, 18 + ((x + n * 7) % 17));
        flame(x + 11, height, 0, -1, 18 + ((x + n * 5) % 17));
      }
      for (let y = 0; y < height; y += 22) {
        flame(0, y, 1, 0, 14 + ((y + n * 3) % 13));
        flame(width, y + 11, -1, 0, 14 + ((y + n * 9) % 13));
      }
      n++;
    };
    draw();
    const timer = scene.time.addEvent({ delay: 70, repeat: 14, callback: draw });
    scene.time.delayedCall(1100, () => {
      timer.remove();
      scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    });
    if (webgl) {
      const vignette = cam.postFX?.addVignette(0.5, 0.5, 0.9, 0.35);
      scene.time.delayedCall(1300, () => vignette && cam.postFX.clear());
    }
    return;
  }
  // Pixel layer / field: glitch tear
  cam.shake(420, 0.008 * strength);
  const slices = scene.add.graphics().setDepth(70).setScrollFactor(0);
  let n = 0;
  const glitch = () => {
    slices.clear();
    for (let i = 0; i < 9; i++) {
      const y = Math.random() * height;
      const h = 2 + Math.random() * 10;
      slices.fillStyle(i % 2 ? 0x7ff0ff : 0xff7ae0, (0.35 + Math.random() * 0.3) * strength);
      slices.fillRect(Math.random() * width * 0.3 - 20, y, width * (0.5 + Math.random() * 0.7), h);
    }
    n++;
  };
  glitch();
  const timer = scene.time.addEvent({ delay: 50, repeat: 14, callback: glitch });
  scene.time.delayedCall(800, () => {
    timer.remove();
    slices.destroy();
  });
  // Colour cycling + pixelate only at full strength (they are the most tiring part).
  if (webgl && cam.postFX && strength >= 0.9) {
    const cm = cam.postFX.addColorMatrix();
    const px = cam.postFX.addPixelate(6);
    let t = 0;
    const tick = scene.time.addEvent({
      delay: 50,
      repeat: 15,
      callback: () => {
        t++;
        cm.reset();
        cm.hue((t * 47) % 360);
        px.amount = Math.max(0, 6 - t * 0.4);
      },
    });
    scene.time.delayedCall(850, () => {
      tick.remove();
      cam.postFX.clear();
    });
  }
}
