/**
 * Battle read-outs (ROADMAP ⚔️ 2.5–2.6): the turn-order bar under the header and the status
 * icons under each unit's bars. Presentation only; reads the engine state, never changes it.
 */
import Phaser from 'phaser';
import type { CombatUnit } from '@pw/shared';

/** Frame order of assets/ui/status.png (pixel-art/status-icons/build.py). */
export const STATUS_ICONS = ['STUN', 'FREEZE', 'POISON', 'BURN', 'BLEED', 'SLOW', 'TAUNTING', 'ROOT', 'SHIELD'] as const;
export const STATUS_PX = 12;

export function preloadOverlay(scene: Phaser.Scene) {
  if (!scene.textures.exists('status_icons')) {
    scene.load.spritesheet('status_icons', '/assets/ui/status.png', { frameWidth: STATUS_PX, frameHeight: STATUS_PX });
  }
}

/** Portraits of this round's turn order; the acting unit is raised and framed in gold. */
export class TurnBar {
  private items: Phaser.GameObjects.GameObject[] = [];
  private last = '';

  constructor(private scene: Phaser.Scene, private y: number) {}

  render(queue: string[], queueIndex: number, active: string | null, units: CombatUnit[], textureOf: (id: string) => string | null) {
    const alive = queue.filter((id) => (units.find((u) => u.id === id)?.hp ?? 0) > 0 && !units.find((u) => u.id === id)?.passive);
    const key = `${alive.join(',')}|${active}|${queueIndex}`;
    if (key === this.last) return;
    this.last = key;
    for (const o of this.items) o.destroy();
    this.items = [];
    const size = 30;
    const gap = 4;
    const total = alive.length * (size + gap) - gap;
    let x = this.scene.scale.width / 2 - total / 2 + size / 2;
    const activeAt = alive.indexOf(active ?? '');
    alive.forEach((id, i) => {
      const u = units.find((q) => q.id === id)!;
      const isActive = id === active;
      const done = activeAt >= 0 && i < activeAt;
      const cy = this.y + (isActive ? 4 : 0);
      const frame = this.scene.add
        .rectangle(x, cy, size, size, 0x1c1a28, 0.85)
        .setStrokeStyle(2, isActive ? 0xffd54f : u.side === 'A' ? 0x4fa8ff : 0xff5a5a)
        .setScrollFactor(0)
        .setDepth(52);
      this.items.push(frame);
      const tex = textureOf(id);
      if (tex && this.scene.textures.exists(tex)) {
        // Animation strips (monsters) show their first frame; single images use the whole texture.
        const first = this.scene.textures.get(tex).frameTotal > 1 ? 0 : undefined;
        const img = this.scene.add.image(x, cy + size / 2 - 2, tex, first).setOrigin(0.5, 1).setScrollFactor(0).setDepth(53);
        img.setScale((size - 6) / Math.max(img.height, img.width));
        if (u.side === 'B') img.setFlipX(true);
        if (done) img.setAlpha(0.4);
        this.items.push(img);
      }
      if (isActive) {
        const tri = this.scene.add.triangle(x, cy - size / 2 - 5, 0, 0, 10, 0, 5, 6, 0xffd54f).setScrollFactor(0).setDepth(53);
        this.items.push(tri);
      }
      x += size + gap;
    });
  }

  destroy() {
    for (const o of this.items) o.destroy();
    this.items = [];
  }
}

/** Status badges in a row below a unit's bars (statuses + shield), redrawn when they change. */
export class StatusRow {
  private icons: Phaser.GameObjects.Image[] = [];
  private last = '';

  constructor(private scene: Phaser.Scene) {}

  render(u: CombatUnit, x: number, y: number) {
    const ids: string[] = u.hp > 0 ? u.statuses.map((s) => s.id) : [];
    if (u.hp > 0 && u.shield) ids.push('SHIELD');
    const key = `${ids.join(',')}@${Math.round(x)},${Math.round(y)}`;
    if (key === this.last) return;
    this.last = key;
    for (const i of this.icons) i.destroy();
    this.icons = [];
    const scale = 2;
    const step = STATUS_PX * scale + 2;
    let ix = x - ((ids.length - 1) * step) / 2;
    for (const id of ids) {
      const frame = STATUS_ICONS.indexOf(id as (typeof STATUS_ICONS)[number]);
      if (frame < 0 || !this.scene.textures.exists('status_icons')) continue;
      this.icons.push(this.scene.add.image(ix, y, 'status_icons', frame).setScale(scale).setOrigin(0.5, 0).setDepth(12));
      ix += step;
    }
  }

  destroy() {
    for (const i of this.icons) i.destroy();
    this.icons = [];
  }
}
