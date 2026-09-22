/**
 * Draws other online players on the map: paperdoll sprite with facing + walk animation, name and
 * level label, and a ⚔️ marker while they are in battle. Positions are smoothed between the
 * once-per-second server updates.
 */
import Phaser from 'phaser';
import type { PlayerPresence } from '@pw/shared';
import { heroCanvas, type Facing, type HairStyle, type Paperdoll } from '../game/art';
import { depthScale, project, zoomScale } from '../game/map';
import { net } from '../game/net';

const WALK_FRAMES = [1, 0, 2, 0];

interface Remote {
  data: PlayerPresence;
  current: { lat: number; lng: number };
  target: { lat: number; lng: number };
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  busy: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  base: string;
  facing: Facing;
  flip: boolean;
  walkTime: number;
}

export class RemotePlayers {
  private remotes = new Map<string, Remote>();

  constructor(private scene: Phaser.Scene) {}

  sync(players: PlayerPresence[]) {
    const seen = new Set<string>();
    for (const p of players) {
      seen.add(p.id);
      let r = this.remotes.get(p.id);
      if (!r) {
        const shadow = this.scene.add.ellipse(0, 0, 40, 14, 0x000000, 0.25).setDepth(9);
        const sprite = this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 0.92).setDepth(9.5);
        const label = this.scene.add
          .text(0, 0, '', { fontFamily: 'Mali', fontSize: '12px', color: '#ffffff', stroke: '#1b1f2a', strokeThickness: 4 })
          .setOrigin(0.5, 1)
          .setDepth(9.6);
        const busy = this.scene.add.text(0, 0, '⚔️', { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(9.7).setVisible(false);
        r = { data: p, current: { lat: p.lat, lng: p.lng }, target: { lat: p.lat, lng: p.lng }, sprite, label, busy, shadow, base: '', facing: 'down', flip: false, walkTime: 0 };
        this.remotes.set(p.id, r);
      }
      r.data = p;
      r.target = { lat: p.lat, lng: p.lng };
      const ally = !!net.party?.members.some((m) => m.id === p.id);
      r.label.setText(`${ally ? '👥 ' : ''}${p.name} Lv.${p.level}`).setColor(ally ? '#9cff9c' : '#ffffff');
      r.busy.setVisible(p.busy);
      this.ensureTextures(r);
    }
    for (const [id, r] of this.remotes) {
      if (seen.has(id)) continue;
      r.sprite.destroy();
      r.label.destroy();
      r.busy.destroy();
      r.shadow.destroy();
      this.remotes.delete(id);
    }
  }

  get count(): number {
    return this.remotes.size;
  }

  private ensureTextures(r: Remote) {
    const l = r.data.look;
    const doll: Paperdoll = {
      classId: l.classId,
      appearance: { ...l.appearance, hairStyle: l.appearance.hairStyle as HairStyle },
      helmet: l.helmet,
      chest: l.chest,
      weapon: l.weapon,
      boots: l.boots,
      aura: l.aura,
    };
    const base = `hero_${JSON.stringify(doll)}`;
    if (base === r.base) return;
    r.base = base;
    for (const f of ['down', 'up', 'side'] as Facing[]) {
      for (let i = 0; i < 3; i++) {
        const key = `${base}_${f}_${i}`;
        if (!this.scene.textures.exists(key)) this.scene.textures.addCanvas(key, heroCanvas(doll, f, i));
      }
    }
  }

  update(delta: number, heroScale: number) {
    const k = 1 - Math.pow(0.02, delta / 1000);
    const h = this.scene.scale.height;
    const zs = zoomScale();
    for (const r of this.remotes.values()) {
      const before = project(r.current.lat, r.current.lng);
      r.current.lat += (r.target.lat - r.current.lat) * k;
      r.current.lng += (r.target.lng - r.current.lng) * k;
      const p = project(r.current.lat, r.current.lng);
      const aim = project(r.target.lat, r.target.lng);
      const dx = aim.x - before.x;
      const dy = aim.y - before.y;
      const moving = Math.hypot(dx, dy) > 1.2;
      if (moving) {
        if (Math.abs(dx) > Math.abs(dy)) {
          r.facing = 'side';
          r.flip = dx < 0;
        } else r.facing = dy < 0 ? 'up' : 'down';
        r.walkTime += delta;
      } else r.walkTime = 0;
      const frame = moving ? WALK_FRAMES[Math.floor(r.walkTime / 160) % 4]! : 0;
      const onScreen = p.x > -60 && p.y > -60 && p.x < this.scene.scale.width + 60 && p.y < h + 60;
      const s = heroScale * zs * depthScale(p.y, h);
      r.sprite
        .setTexture(`${r.base}_${r.facing}_${frame}`)
        .setFlipX(r.facing === 'side' && r.flip)
        .setPosition(p.x, p.y)
        .setScale(s)
        .setVisible(onScreen)
        .setDepth(9.5 + p.y / 10000);
      r.shadow.setPosition(p.x, p.y).setScale(zs * depthScale(p.y, h)).setVisible(onScreen);
      const top = p.y - r.sprite.displayHeight * 0.95;
      r.label.setPosition(p.x, top).setVisible(onScreen);
      r.busy.setPosition(p.x, top - 14).setVisible(onScreen && r.data.busy);
    }
  }
}
