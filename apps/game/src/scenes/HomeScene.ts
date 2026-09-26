/**
 * Inside the player's house: a pixel-art Lanna room (pixel-art/home) with furniture to tap.
 * The hero walks to the piece, then its station opens: bed = rest, chest = bank, workbench = repair,
 * shelf = shop, mirror = equipment, cauldron = brewing (coming), door = leave.
 * Presentation only — every action calls the same rules as before (game/rules.ts).
 */
import Phaser from 'phaser';
import { bus, toast } from '../game/bus';
import { music, sfx } from '../game/audio';
import { isAvatarPackLoaded, USE_AVATAR_PACK, AVATAR_ORIGIN_X, AVATAR_ORIGIN_Y } from '../game/avatar';
import { restAtHome } from '../game/rules';
import { store } from '../state/store';
import { el } from '../ui/dom';
import { PIXEL_FONT, uiIcon } from '../ui/pixel';
import { openPanel } from '../ui/hud';

interface HomeItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stand: [number, number];
  label: string;
}
interface HomeMeta {
  w: number;
  h: number;
  floorY: number;
  items: HomeItem[];
}

/** Hero height in room pixels (the bed is 28, the wardrobe 48). */
/** Room art is 32-bit (2x): every room-pixel constant below is in 2x room pixels. */
const HERO_ROOM_H = 88;
const WALK_PX_PER_S = 140;

export class HomeScene extends Phaser.Scene {
  private meta!: HomeMeta;
  private S = 1;
  private ox = 0;
  private oy = 0;
  private room!: Phaser.GameObjects.Image;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private hero!: Phaser.GameObjects.Image;
  private heroBase = 'hero';
  /** Hero feet in room pixels. */
  private pos = { x: 92, y: 82 };
  private walking: Phaser.Tweens.Tween | null = null;
  private busy = false;
  private overlay!: HTMLElement;

  constructor() {
    super('Home');
  }

  preload() {
    this.load.json('home_meta', '/assets/home/home.json');
    this.load.image('home_room', '/assets/home/room.png');
    for (const id of ['bed', 'mirror', 'shelf', 'door', 'cauldron', 'chest', 'workbench']) {
      this.load.image(`home_${id}`, `/assets/home/${id}.png`);
      this.load.image(`home_${id}_hi`, `/assets/home/${id}_hi.png`);
    }
  }

  create() {
    this.meta = this.cache.json.get('home_meta') as HomeMeta;
    this.pos = { x: 184, y: 164 };
    this.busy = false;
    this.walking = null;
    this.sprites.clear();
    this.labels.clear();
    const down = (this.scene.get('World').registry.get('heroKey') as string) ?? 'hero_down_0';
    this.heroBase = down.replace(/_down_0$/, '');

    this.cameras.main.setBackgroundColor('#1c1a28');
    this.room = this.add.image(0, 0, 'home_room').setOrigin(0, 0).setDepth(0);
    for (const it of this.meta.items) {
      const spr = this.add.image(0, 0, `home_${it.id}`).setOrigin(0, 0).setInteractive({ useHandCursor: true, pixelPerfect: true });
      spr.on('pointerover', () => this.highlight(it.id, true));
      spr.on('pointerout', () => this.highlight(it.id, false));
      spr.on('pointerdown', () => this.use(it));
      this.sprites.set(it.id, spr);
      const label = this.add
        .text(0, 0, it.label, { fontFamily: PIXEL_FONT, fontSize: '11px', color: '#fff6d8', backgroundColor: '#1c1a28cc', padding: { x: 4, y: 2 } })
        .setOrigin(0.5, 1)
        .setDepth(200)
        .setAlpha(0.85);
      this.labels.set(it.id, label);
    }
    this.hero = this.add.image(0, 0, `${this.heroBase}_down_0`);
    // Tapping the floor walks there.
    this.room.setInteractive();
    this.room.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const x = (p.x - this.ox) / this.S;
      const y = (p.y - this.oy) / this.S;
      if (!this.busy && y > this.meta.floorY + 12) this.walkTo(x, y);
    });

    this.overlay = el(`<div class="home-overlay">
      <div class="home-title">${uiIcon('home', true)}บ้านของ ${store.s.name}</div>
      <button type="button" class="btn danger home-exit" data-home-exit>ออกจากบ้าน</button>
    </div>`);
    document.getElementById('ui')!.appendChild(this.overlay);
    this.overlay.querySelector('[data-home-exit]')!.addEventListener('click', () => this.exit());
    document.body.classList.add('in-home');

    this.layout();
    this.scale.on('resize', this.layout, this);
    music('home');
    sfx('open');
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.overlay.remove();
      document.body.classList.remove('in-home');
    });
  }

  /** Integer pixel scale that fits between the HUD top bar and the bottom menu. */
  private layout() {
    const { width, height } = this.scale;
    const top = 132;
    const bottom = 96;
    const S = Math.max(1, Math.min(Math.floor(width / this.meta.w), Math.floor((height - top - bottom) / this.meta.h)));
    this.S = S;
    this.ox = Math.round((width - this.meta.w * S) / 2);
    this.oy = Math.round(top + Math.max(0, (height - top - bottom - this.meta.h * S) / 2));
    this.room.setPosition(this.ox, this.oy).setScale(S);
    for (const it of this.meta.items) {
      this.sprites.get(it.id)!.setPosition(this.ox + it.x * S, this.oy + it.y * S).setScale(S).setDepth(10 + it.y + it.h);
      // Small screens: just the name ("ประตู"), big screens: name · action.
      this.labels
        .get(it.id)!
        .setText(S >= 3 ? it.label : it.label.split(' · ')[0]!)
        .setPosition(this.ox + (it.x + it.w / 2) * S, this.oy + it.y * S - 2)
        .setFontSize(S >= 3 ? 13 : 11);
    }
    this.placeHero();
  }

  private heroScale(): number {
    const frameH = this.textures.get(`${this.heroBase}_down_0`).getSourceImage().height || 64;
    return (this.S * HERO_ROOM_H) / frameH;
  }

  private placeHero(facing = 'down', frame = 0, flip = false) {
    const pack = USE_AVATAR_PACK && isAvatarPackLoaded();
    const key = `${this.heroBase}_${facing}_${frame}`;
    this.hero
      .setTexture(this.textures.exists(key) ? key : `${this.heroBase}_down_0`)
      .setOrigin(pack ? AVATAR_ORIGIN_X : 0.5, pack ? AVATAR_ORIGIN_Y : 0.92)
      .setFlipX(flip)
      .setScale(this.heroScale())
      .setPosition(this.ox + this.pos.x * this.S, this.oy + this.pos.y * this.S)
      .setDepth(10 + this.pos.y);
  }

  private highlight(id: string, on: boolean) {
    this.sprites.get(id)?.setTexture(`home_${id}${on ? '_hi' : ''}`);
    this.labels.get(id)?.setAlpha(on ? 1 : 0.85);
  }

  private walkTo(x: number, y: number, then?: () => void) {
    this.walking?.stop();
    const from = { ...this.pos };
    x = Phaser.Math.Clamp(x, 6, this.meta.w - 6);
    y = Phaser.Math.Clamp(y, this.meta.floorY + 20, this.meta.h - 8);
    const dist = Math.hypot(x - from.x, y - from.y);
    const dx = x - from.x;
    const dy = y - from.y;
    const facing = Math.abs(dx) >= Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
    const flip = dx < 0;
    const t0 = this.time.now;
    this.walking = this.tweens.add({
      targets: this.pos,
      x,
      y,
      duration: Math.max(80, (dist / WALK_PX_PER_S) * 1000),
      onUpdate: () => this.placeHero(facing, Math.floor((this.time.now - t0) / 150) % 4, flip),
      onComplete: () => {
        this.walking = null;
        this.placeHero(facing === 'side' ? 'side' : 'down', 0, flip);
        then?.();
      },
    });
  }

  private use(it: HomeItem) {
    if (this.busy) return;
    this.highlight(it.id, true);
    this.time.delayedCall(250, () => this.highlight(it.id, false));
    this.walkTo(it.stand[0], it.stand[1], () => {
      // Face the furniture once there.
      const cx = it.x + it.w / 2;
      const facing = it.y + it.h <= this.meta.floorY + 12 ? 'up' : 'side';
      this.placeHero(facing, 0, cx < this.pos.x);
      this.activate(it.id);
    });
  }

  private activate(id: string) {
    switch (id) {
      case 'bed':
        return this.sleep();
      case 'door':
        return this.exit();
      case 'cauldron':
        sfx('notice');
        return toast('หม้อปรุงยา — เร็ว ๆ นี้! (รวมวัตถุดิบจากมอนสเตอร์มาต้มยาเองได้)');
      case 'mirror':
        return openPanel('char');
      case 'chest':
        return openPanel('hbank');
      case 'workbench':
        return openPanel('hrepair');
      case 'shelf':
        return openPanel('shop:home');
    }
  }

  /** Bed: fade to night, Zzz, wake up with full HP/MP. */
  private sleep() {
    this.busy = true;
    const { width, height } = this.scale;
    const shade = this.add.rectangle(0, 0, width, height, 0x0a0c1e, 1).setOrigin(0).setDepth(499).setAlpha(0);
    const z = this.add
      .text(width / 2, height / 2, 'Z z z…', { fontFamily: PIXEL_FONT, fontSize: '28px', color: '#cfe0ff', stroke: '#1c1a28', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(500)
      .setAlpha(0);
    this.tweens.chain({
      tweens: [
        { targets: shade, alpha: 1, duration: 600 },
        {
          targets: z,
          alpha: 1,
          y: height / 2 - 16,
          duration: 700,
          yoyo: true,
          onStart: () => restAtHome(),
        },
        {
          targets: shade,
          alpha: 0,
          duration: 600,
          onStart: () => sfx('heal'),
          onComplete: () => {
            shade.destroy();
            z.destroy();
            this.busy = false;
            toast('นอนเต็มอิ่ม! HP/MP เต็มแล้ว', 'good');
          },
        },
      ],
    });
  }

  exit() {
    if (!this.scene.isActive()) return;
    sfx('close');
    this.scene.stop();
    this.scene.resume('World');
    music('field');
    bus.emit('home:exit');
  }
}
