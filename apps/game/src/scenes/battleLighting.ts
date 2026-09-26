/**
 * Battle lighting pass (ROADMAP 🎨 SoC look, phase 1): the "HD-2D" feel of Sword of Convallaria-style
 * scenes comes less from the sprites than from light — a cool ambient over everything, warm pools
 * under lamps, glowing halos, dark screen edges and dust drifting in the air.
 *
 * - Ambient: a colour every fighter sprite is tinted with (sprites are lit by the scene, not flat).
 * - Lamps: street lamps standing on the floor; lit at dusk/night with an additive halo + light pool.
 * - Vignette: a baked radial darkening above the fighters, below the UI text.
 * - Motes: a few slow additive particles (dust, fireflies, rift pixels, embers) per world layer.
 *
 * Everything is baked once per fight into canvases or uses plain blend modes — no per-frame
 * post-processing, so it stays cheap on phones and works on the Canvas renderer too.
 * Presentation only — nothing here feeds the combat engine.
 */
import Phaser from 'phaser';
import type { DayPart, StageLayer } from './battleStage';

/** Light colour multiplied into every fighter sprite. */
const AMBIENT: Record<StageLayer, Record<DayPart, number>> = {
  FIELD: { day: 0xfff8ee, dusk: 0xf2cdb8, night: 0xaab6e6 },
  PIXEL: { day: 0xeadcff, dusk: 0xe2c4f0, night: 0xbcaeea },
  MYTH: { day: 0xfff2d6, dusk: 0xffd9b4, night: 0xdcc2a2 },
  WORLD: { day: 0xf2f8e2, dusk: 0xf2d2b2, night: 0xbad2b4 },
};

/** Lamp light colour per world layer (the pixel layer's lamps glitch cyan). */
const LAMP: Record<StageLayer, number> = { FIELD: 0xffc46a, PIXEL: 0x7ff0ff, MYTH: 0xffd26a, WORLD: 0xe8f08a };

/** Floating motes per layer: colours, drift direction, how many. */
const MOTES: Record<StageLayer, { colors: number[]; rise: number; count: number }> = {
  FIELD: { colors: [0xfff0c8, 0xffd98a], rise: -8, count: 14 },
  PIXEL: { colors: [0x7ff0ff, 0xff7ae0], rise: -22, count: 18 },
  MYTH: { colors: [0xffd26a, 0xfff6c8], rise: -16, count: 16 },
  WORLD: { colors: [0xe8f08a, 0xa8f0a0], rise: -12, count: 16 },
};

export interface LightingOpts {
  layer: StageLayer;
  part: DayPart;
  horizonY: number;
  /** 0 = the player turned effects off (no drifting motes). */
  fx: number;
}

export interface Lighting {
  /** Tint for fighter sprites (0xffffff = untinted). */
  ambient: number;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}

function rgba(color: number, a: number): string {
  return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${a})`;
}

/** Channel-wise multiply of two 0xRRGGBB colours (light × surface). */
export function mulColor(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A soft radial light (bright core → transparent), drawn with ADD blending. */
function glowTexture(scene: Phaser.Scene, key: string, color: number, size: number, squash = 1) {
  if (scene.textures.exists(key)) return;
  const [c, ctx] = canvas(size, size * squash);
  ctx.scale(1, squash);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgba(color, 0.85));
  g.addColorStop(0.25, rgba(color, 0.42));
  g.addColorStop(0.6, rgba(color, 0.12));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, c);
}

/**
 * A street lamp as pixel art at the stage's pixel size (px): dark iron pole with a lit rim,
 * a hooded head and a glass that glows when `lit`. Faces right like everything else.
 */
function lampTexture(scene: Phaser.Scene, key: string, lit: boolean, glass: number) {
  if (scene.textures.exists(key)) return;
  const W = 9, H = 34;
  const [c, ctx] = canvas(W, H);
  const put = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  const OUT = '#0b0a10', IRON = ['#1c1d2a', '#2c2f44', '#474c6a', '#6a7294'];
  // pole: outline + 2 px shaft with a lit left rim, darker toward the base
  put(3, 8, 3, 25, OUT);
  put(4, 9, 1, 23, IRON[2]!);
  put(4, 20, 1, 12, IRON[1]!);
  put(2, 30, 5, 4, OUT); // foot
  put(3, 31, 3, 2, IRON[1]!);
  // hooded head
  put(1, 2, 7, 7, OUT);
  put(2, 1, 5, 1, OUT);
  put(2, 3, 5, 1, IRON[3]!); // hood lit edge (light from above)
  put(2, 4, 5, 1, IRON[1]!);
  const g = (glass >> 16) & 255, gg = (glass >> 8) & 255, gb = glass & 255;
  const glassLit = `rgb(${g},${gg},${gb})`;
  const glassCore = `rgb(${Math.min(255, g + 60)},${Math.min(255, gg + 60)},${Math.min(255, gb + 60)})`;
  put(2, 5, 5, 3, lit ? glassLit : IRON[0]!);
  if (lit) put(3, 5, 3, 2, glassCore);
  scene.textures.addCanvas(key, c);
}

/** Dark screen edges, baked once (sits above fighters and effects, below the UI text). */
function vignetteTexture(scene: Phaser.Scene, key: string, w: number, h: number, strength: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const [c, ctx] = canvas(w, h);
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h * 0.52, r * 0.35, w / 2, h * 0.52, r);
  g.addColorStop(0, 'rgba(4,4,16,0)');
  g.addColorStop(0.7, `rgba(4,4,16,${strength * 0.45})`);
  g.addColorStop(1, `rgba(4,4,16,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas(key, c);
}

/** Lights the stage built by battleStage.buildStage. Returns the ambient tint for fighters. */
export function applyLighting(scene: Phaser.Scene, o: LightingOpts): Lighting {
  const { width, height } = scene.scale;
  const lit = o.part !== 'day' || o.layer === 'PIXEL';
  const lampColor = LAMP[o.layer];
  const floorH = height - o.horizonY;
  const PX = 3; // the stage's pixel size on screen (battleStage LOW)

  // Street lamps on the far/mid floor, left and right of the fighters (depth: behind the fighters,
  // under the time-of-day tint so the iron darkens with the scene, glow above it).
  const lampKey = `stage_lamp_${lit ? 'on' : 'off'}_${lampColor.toString(16)}`;
  lampTexture(scene, lampKey, lit, lampColor);
  glowTexture(scene, `stage_halo_${lampColor.toString(16)}`, lampColor, 96);
  glowTexture(scene, `stage_pool_${lampColor.toString(16)}`, lampColor, 160, 0.34);
  // Two lamps far behind the fighters and one close to the camera (depth: a foreground prop
  // frames the scene the way SoC's barrels and posts do).
  const lamps = [
    { x: width * 0.1, y: o.horizonY + floorH * 0.22, s: 0.8, front: false },
    { x: width * 0.88, y: o.horizonY + floorH * 0.3, s: 0.95, front: false },
    { x: width * 0.03, y: o.horizonY + floorH * 0.66, s: 1.7, front: true },
  ];
  const night = o.part === 'night';
  for (const l of lamps) {
    const scale = PX * l.s;
    scene.add.image(l.x, l.y, lampKey).setOrigin(0.5, 1).setScale(scale).setDepth(l.front ? 23 : 2.6).setScrollFactor(0);
    if (!lit) continue;
    const headY = l.y - 29 * scale;
    scene.add
      .image(l.x, l.y + 2, `stage_pool_${lampColor.toString(16)}`)
      .setScale(2.6 * l.s)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(night ? 0.85 : 0.6)
      .setDepth(3.5)
      .setScrollFactor(0);
    const halo = scene.add
      .image(l.x, headY, `stage_halo_${lampColor.toString(16)}`)
      .setScale(1.8 * l.s)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(night ? 1 : 0.75)
      .setDepth(l.front ? 23.5 : 8.5)
      .setScrollFactor(0);
    // A slow flicker so the light feels alive (gentle; skipped with effects off).
    if (o.fx > 0) scene.tweens.add({ targets: halo, alpha: halo.alpha * 0.82, duration: 900 + l.x % 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Vignette above fighters/effects (depth 44) and below the header, marker and banners (45+).
  vignetteTexture(scene, 'stage_vignette', Math.ceil(width), Math.ceil(height), o.part === 'day' ? 0.35 : 0.55);
  scene.add.image(0, 0, 'stage_vignette').setOrigin(0).setDepth(44).setScrollFactor(0);

  // Drifting motes (dust by day, fireflies by night, rift pixels, embers).
  if (o.fx > 0) {
    const m = MOTES[o.layer];
    if (!scene.textures.exists('stage_mote')) {
      const [c, ctx] = canvas(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 2, 2);
      scene.textures.addCanvas('stage_mote', c);
    }
    const emitter = scene.add.particles(0, 0, 'stage_mote', {
      x: { min: 0, max: width },
      y: { min: o.horizonY, max: height * 0.92 },
      lifespan: 5200,
      speedX: { min: -6, max: 6 },
      speedY: { min: m.rise - 6, max: m.rise + 4 },
      scale: { start: PX / 2, end: PX / 2 },
      // Fade in and out over the lifetime (t = 0..1).
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * (lit ? 0.85 : 0.45) },
      tint: m.colors,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 5200 / m.count,
      quantity: 1,
    });
    emitter.setDepth(22).setScrollFactor(0);
    // Start with the air already full instead of an empty first few seconds.
    emitter.fastForward(5200);
  }

  return { ambient: AMBIENT[o.layer][o.part] };
}
