/**
 * Battle "game feel" helpers (ROADMAP ⚔️ phase 1): damage numbers that pop and fall, pixel
 * shatter on death, coin bursts, the combo counter. Presentation only — nothing here touches the
 * shared engine, so Math.random() is fine. Every effect caps its object count for phones.
 */
import Phaser from 'phaser';
import type { Element } from '@pw/shared';
import { PIXEL_FONT } from '../ui/pixel';

export const ELEMENT_COLOR: Record<Element, string> = {
  NEUTRAL: '#ffffff',
  FIRE: '#ff9a4a',
  WATER: '#6ad0ff',
  LIGHTNING: '#ffe45a',
  EARTH: '#d8b070',
  HOLY: '#fff2a8',
  SHADOW: '#c890ff',
};

/**
 * A number that pops (overshoot), arcs sideways and falls with gravity, then fades.
 * `lane` spreads simultaneous numbers on one unit so they never sit on top of each other.
 */
export function damageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  o: { color: string; crit?: boolean; lane?: number; small?: boolean; speed?: number },
) {
  const speed = o.speed ?? 1;
  const size = o.crit ? 30 : o.small ? 15 : 22;
  const lane = o.lane ?? 0;
  const dir = lane % 2 ? -1 : 1;
  const x0 = x + dir * Math.ceil(lane / 2) * 18;
  const y0 = y - lane * 6;
  const t = scene.add
    .text(x0, y0, text, { fontFamily: PIXEL_FONT, fontSize: `${size}px`, color: o.color, stroke: o.crit ? '#7a1010' : '#000000', strokeThickness: o.crit ? 6 : 5 })
    .setOrigin(0.5, 1)
    .setDepth(40)
    .setScale(o.crit ? 2 : 1.6);
  if (o.crit) {
    const tag = scene.add
      .text(x0, y0 - size - 2, 'CRITICAL!', { fontFamily: PIXEL_FONT, fontSize: '13px', color: '#ffe45a', stroke: '#7a1010', strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setDepth(41)
      .setAlpha(0);
    scene.tweens.add({ targets: tag, alpha: 1, y: tag.y - 8, duration: 120 / speed, hold: 520 / speed, yoyo: true, onComplete: () => tag.destroy() });
  }
  scene.tweens.add({ targets: t, scale: 1, duration: 160 / speed, ease: 'Back.easeOut' });
  // Arc: drift sideways the whole time, rise then fall.
  const drift = (12 + Math.random() * 10) * dir;
  const arc = { p: 0 };
  scene.tweens.add({
    targets: arc,
    p: 1,
    delay: 120 / speed,
    duration: (o.crit ? 820 : 640) / speed,
    onUpdate: () => {
      const p = arc.p;
      t.setPosition(x0 + drift * p, y0 - 26 * p + 44 * p * p);
      t.setAlpha(p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35);
    },
    onComplete: () => t.destroy(),
  });
}

/** Opaque pixel colours sampled from a texture (to colour the death shards like the unit). */
function sampleColors(scene: Phaser.Scene, key: string, n: number): number[] {
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const out: number[] = [];
  for (let i = 0; i < n * 6 && out.length < n; i++) {
    const c = scene.textures.getPixel(Math.floor(Math.random() * w), Math.floor(Math.random() * h), key);
    if (c && c.alpha > 200) out.push(c.color);
  }
  return out.length ? out : [0xffffff];
}

/** Blink three times, then burst into square pixels that fly up and fall (max 24 shards). */
export function shatter(scene: Phaser.Scene, sprite: Phaser.GameObjects.Image, px: number, speed = 1, onGone?: () => void) {
  const blink = { n: 0 };
  scene.tweens.add({
    targets: blink,
    n: 6,
    duration: 360 / speed,
    onUpdate: () => sprite.setAlpha(Math.floor(blink.n) % 2 ? 0.25 : 1),
    onComplete: () => {
      const colors = sampleColors(scene, sprite.texture.key, 10);
      const cx = sprite.x;
      const top = sprite.y - sprite.displayHeight;
      const size = Math.max(3, Math.round(px * 1.2));
      for (let i = 0; i < 24; i++) {
        const sx = cx + (Math.random() - 0.5) * sprite.displayWidth * 0.8;
        const sy = top + Math.random() * sprite.displayHeight;
        const r = scene.add.rectangle(sx, sy, size, size, colors[i % colors.length]!).setDepth(24);
        const vx = (sx - cx) * 2.2 + (Math.random() - 0.5) * 40;
        const vy = -60 - Math.random() * 90;
        const k = { t: 0 };
        scene.tweens.add({
          targets: k,
          t: 1,
          duration: (520 + Math.random() * 260) / speed,
          onUpdate: () => {
            const tt = k.t * 0.8;
            r.setPosition(sx + vx * tt, sy + vy * tt + 260 * tt * tt);
            r.setAlpha(1 - k.t);
          },
          onComplete: () => r.destroy(),
        });
      }
      sprite.setAlpha(0);
      onGone?.();
    },
  });
}

/** Gold coins that bounce out of a defeated monster, then zip off towards the top of the screen. */
export function coinBurst(scene: Phaser.Scene, x: number, y: number, count: number, px: number, speed = 1, onCollect?: () => void) {
  const size = Math.max(4, Math.round(px * 1.4));
  const n = Math.min(6, count);
  for (let i = 0; i < n; i++) {
    const coin = scene.add.container(x, y - 10, [
      scene.add.rectangle(0, 0, size, size, 0xf2c230).setStrokeStyle(2, 0x7a4a10),
      scene.add.rectangle(-size / 4, -size / 4, Math.max(1, size / 3), Math.max(1, size / 3), 0xfff6c8),
    ]).setDepth(35);
    const vx = (Math.random() - 0.5) * 120;
    const k = { t: 0 };
    const floor = y + 4;
    scene.tweens.add({
      targets: k,
      t: 1,
      duration: 480 / speed,
      delay: (i * 40) / speed,
      onUpdate: () => {
        const tt = k.t;
        const bounce = Math.abs(Math.sin(tt * Math.PI * 1.6)) * (1 - tt) * 60;
        coin.setPosition(x + vx * tt, Math.min(floor, y - 10 - bounce));
      },
      onComplete: () => {
        scene.tweens.add({
          targets: coin,
          x: scene.scale.width - 40,
          y: 20,
          scale: 0.4,
          duration: 380 / speed,
          delay: (120 + i * 30) / speed,
          ease: 'Quad.easeIn',
          onComplete: () => {
            coin.destroy();
            if (i === 0) onCollect?.();
          },
        });
      },
    });
  }
}

/** Party combo counter, top-left: shows from 2 hits, punches on every new hit, fades when broken. */
export class ComboCounter {
  private text: Phaser.GameObjects.Text;
  private count = 0;

  constructor(private scene: Phaser.Scene) {
    this.text = scene.add
      .text(16, scene.scale.height * 0.2, '', { fontFamily: PIXEL_FONT, fontSize: '26px', color: '#ffd54f', stroke: '#3a1a00', strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setDepth(55)
      .setAlpha(0);
  }

  hit() {
    this.count++;
    if (this.count < 2) return;
    this.text.setText(`${this.count} COMBO`).setAlpha(1).setScale(1.5);
    this.scene.tweens.killTweensOf(this.text);
    this.scene.tweens.add({ targets: this.text, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.text, alpha: 0, delay: 1800, duration: 400 });
  }

  break() {
    if (this.count >= 2) {
      this.scene.tweens.killTweensOf(this.text);
      this.scene.tweens.add({ targets: this.text, alpha: 0, y: this.text.y + 10, duration: 250, onComplete: () => this.text.setY(this.scene.scale.height * 0.2) });
    }
    this.count = 0;
  }
}
