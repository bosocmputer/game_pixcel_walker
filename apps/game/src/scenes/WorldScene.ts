/**
 * Overworld: the real map is rendered by MapLibre underneath (see game/map.ts); this scene
 * only draws game sprites on a transparent canvas — the hero at the GPS position plus landmark
 * and home icons — by projecting lat/lng to screen space every frame.
 */
import Phaser from 'phaser';
import { heroCanvas, landmarkIcon, type Facing } from '../game/art';
import { bus, type BattleRequest } from '../game/bus';
import { CHUNK_TILES, ensureAround, landmarksAround, loadingCount, toTile } from '../game/world';
import { centerOn, depthScale, pixelsPerMeter, project, resetNorth, zoomBy } from '../game/map';
import { walk } from '../game/walk';
import { bossAvailableAt, nearbyLandmarks, BOSS_RADIUS_M } from '../game/rules';
import { store, type SaveData } from '../state/store';
import { paperdollOf } from '../game/paperdoll';

const LANDMARK_RADIUS_M = 700;
const WALK_FRAMES = [1, 0, 2, 0];
const HERO_SCALE = 3;

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private accuracyRing!: Phaser.GameObjects.Arc;
  private pulse!: Phaser.GameObjects.Arc;
  private loadingText!: Phaser.GameObjects.Text;
  private target: { lat: number; lng: number } | null = null;
  private current: { lat: number; lng: number } | null = null;
  private accuracy = 10;
  private heroBase = '';
  private facing: Facing = 'down';
  private flip = false;
  private walkTime = 0;
  private landmarkSprites = new Map<string, Phaser.GameObjects.Container>();
  private homeSprite: Phaser.GameObjects.Image | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastNearIds = '';
  private lastDataChunk = '';
  private lastLandmarkScan = 0;
  private unsubs: (() => void)[] = [];

  constructor() {
    super('World');
  }

  create() {
    for (const kind of ['CONVENIENCE', 'FUEL', 'PARK', 'HOME']) {
      if (!this.textures.exists(`lm_${kind}`)) this.textures.addCanvas(`lm_${kind}`, landmarkIcon(kind));
    }
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.accuracyRing = this.add.circle(0, 0, 10, 0x26c6da, 0.12).setStrokeStyle(2, 0x26c6da, 0.6).setDepth(5);
    this.pulse = this.add.circle(0, 0, 10, 0xffffff, 0).setStrokeStyle(3, 0xffa726, 0.9).setDepth(5);
    this.tweens.add({ targets: this.pulse, scale: 3, alpha: 0, duration: 1600, repeat: -1 });
    this.shadow = this.add.ellipse(0, 0, 40, 14, 0x000000, 0.28).setDepth(9);
    this.refreshHero(store.s);
    this.player = this.add.image(0, 0, this.heroKey()).setDepth(10).setOrigin(0.5, 0.92).setScale(HERO_SCALE);
    this.loadingText = this.add
      .text(0, 0, 'กำลังโหลดข้อมูลแผนที่…', { fontFamily: 'Mali', fontSize: '14px', color: '#ffffff', backgroundColor: '#1b1f2acc', padding: { x: 8, y: 4 } })
      .setDepth(100)
      .setOrigin(0.5, 0);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-PLUS', () => zoomBy(0.5));
    kb.on('keydown-MINUS', () => zoomBy(-0.5));

    this.unsubs.push(
      bus.on('position', (p) => this.onPosition(p.lat, p.lng, p.accuracy)),
      store.subscribe((s) => {
        this.refreshHero(s);
        this.refreshHome(s);
      }),
      bus.on('boss:challenge', ({ landmark }) => this.startBattle({ kind: 'BOSS', monsterIds: [], landmark })),
      bus.on('battle:start', (req) => this.startBattle(req)),
      bus.on('zoom', ({ delta }) => (delta === 0 ? resetNorth() : zoomBy(delta * 0.5))),
    );
    this.events.once('shutdown', () => this.unsubs.forEach((u) => u()));
    this.events.on('resume', () => {
      walk.paused = false;
    });

    this.refreshHome(store.s);
    if (walk.position) this.onPosition(walk.position.lat, walk.position.lng, 10);
  }

  private startBattle(req: BattleRequest) {
    if (this.scene.isActive('Battle')) return;
    walk.paused = true;
    walk.setSimDirection(0, 0);
    this.scene.pause();
    this.scene.launch('Battle', req);
  }

  private onPosition(lat: number, lng: number, accuracy: number) {
    this.target = { lat, lng };
    this.current ??= { lat, lng };
    this.accuracy = accuracy;

    // Keep gameplay data (terrain for encounters/safe zones, landmarks) streaming around us.
    const t = toTile(lat, lng);
    const dataKey = `${Math.floor(t.x / CHUNK_TILES)},${Math.floor(t.y / CHUNK_TILES)}`;
    if (dataKey !== this.lastDataChunk) {
      this.lastDataChunk = dataKey;
      ensureAround(t.x, t.y, 1);
    }
    const near = nearbyLandmarks(lat, lng, BOSS_RADIUS_M);
    const ids = near.map((l) => l.id).join(',');
    if (ids !== this.lastNearIds) {
      this.lastNearIds = ids;
      bus.emit('landmark:near', { landmarks: near });
    }
  }

  // -------------------------------------------------------------------------------------------
  // Hero (paperdoll × facing × walk frame)

  private heroKey(facing: Facing = this.facing, frame = 0) {
    return `${this.heroBase}_${facing}_${frame}`;
  }

  private refreshHero(s: SaveData) {
    const doll = paperdollOf(s);
    const base = `hero_${JSON.stringify(doll)}`;
    if (base === this.heroBase) return;
    this.heroBase = base;
    for (const f of ['down', 'up', 'side'] as Facing[]) {
      for (let i = 0; i < 3; i++) {
        const key = this.heroKey(f, i);
        if (!this.textures.exists(key)) this.textures.addCanvas(key, heroCanvas(doll, f, i));
      }
    }
    this.registry.set('heroKey', this.heroKey('down', 0));
    this.player?.setTexture(this.heroKey());
  }

  private refreshHome(s: SaveData) {
    if (!s.home) {
      this.homeSprite?.destroy();
      this.homeSprite = null;
      return;
    }
    if (!this.homeSprite) this.homeSprite = this.add.image(0, 0, 'lm_HOME').setScale(2.5).setDepth(8).setOrigin(0.5, 1);
  }

  update(time: number, delta: number) {
    if (!this.target || !this.current) return;

    // Lerp the displayed position toward the latest GPS fix, then lock the map camera to it.
    const k = 1 - Math.pow(0.002, delta / 1000);
    const before = project(this.current.lat, this.current.lng);
    this.current.lat += (this.target.lat - this.current.lat) * k;
    this.current.lng += (this.target.lng - this.current.lng) * k;
    const aim = project(this.target.lat, this.target.lng);
    const dx = aim.x - before.x;
    const dy = aim.y - before.y;
    centerOn(this.current.lat, this.current.lng);
    const here = project(this.current.lat, this.current.lng);

    const moving = Math.hypot(dx, dy) > 1.5;
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = 'side';
        this.flip = dx < 0;
      } else {
        this.facing = dy < 0 ? 'up' : 'down';
      }
      this.walkTime += delta;
    } else {
      this.walkTime = 0;
    }
    const frame = moving ? WALK_FRAMES[Math.floor(this.walkTime / 160) % 4]! : 0;
    this.player.setTexture(this.heroKey(this.facing, frame)).setFlipX(this.facing === 'side' && this.flip).setPosition(here.x, here.y);
    this.shadow.setPosition(here.x, here.y);
    this.pulse.setPosition(here.x, here.y);
    this.accuracyRing.setPosition(here.x, here.y).setRadius(Math.max(12, this.accuracy * pixelsPerMeter(this.current.lat)));

    if (walk.simulated) {
      const K = this.keys;
      const x = (K.D!.isDown || K.RIGHT!.isDown ? 1 : 0) - (K.A!.isDown || K.LEFT!.isDown ? 1 : 0);
      const y = (K.S!.isDown || K.DOWN!.isDown ? 1 : 0) - (K.W!.isDown || K.UP!.isDown ? 1 : 0);
      if (x || y) walk.setSimDirection(x, y, K.SHIFT!.isDown);
      else if (!document.body.dataset.joystick) walk.setSimDirection(0, 0);
    }

    this.loadingText.setPosition(this.scale.width / 2, 8).setVisible(loadingCount() > 0);
    if (time - this.lastLandmarkScan > 500) {
      this.lastLandmarkScan = time;
      this.syncLandmarks();
    }
    this.placeOverlays();
  }

  /** Create/destroy landmark sprites near the player (cheap; runs twice a second). */
  private syncLandmarks() {
    const s = store.s;
    const now = Date.now();
    const seen = new Set<string>();
    for (const l of landmarksAround(this.current!.lat, this.current!.lng, LANDMARK_RADIUS_M)) {
      seen.add(l.id);
      let c = this.landmarkSprites.get(l.id);
      if (!c) {
        const icon = this.add.image(0, 0, `lm_${l.kind}`).setOrigin(0.5, 1).setScale(l.kind === 'PARK' ? 3 : 2.5);
        const bang = this.add.text(0, -44, '!', { fontFamily: 'Silkscreen', fontSize: '22px', color: '#ff5252', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        c = this.add.container(0, 0, [icon, bang]).setDepth(7);
        c.setData({ bang, lat: l.lat, lng: l.lng });
        this.tweens.add({ targets: bang, y: -52, yoyo: true, repeat: -1, duration: 500 });
        this.landmarkSprites.set(l.id, c);
      }
      (c.getData('bang') as Phaser.GameObjects.Text).setVisible(bossAvailableAt(l, s, now) <= now);
    }
    for (const [id, c] of this.landmarkSprites) {
      if (seen.has(id)) continue;
      c.destroy();
      this.landmarkSprites.delete(id);
    }
  }

  /** Re-project overlays every frame so they stick to the map while it zooms/rotates. */
  private placeOverlays() {
    const h = this.scale.height;
    for (const c of this.landmarkSprites.values()) {
      const p = project(c.getData('lat') as number, c.getData('lng') as number);
      const onScreen = p.x > -80 && p.y > -80 && p.x < this.scale.width + 80 && p.y < h + 80;
      c.setVisible(onScreen).setPosition(p.x, p.y).setScale(depthScale(p.y, h)).setDepth(7 + p.y / 10000);
    }
    const home = store.s.home;
    if (home && this.homeSprite) {
      const p = project(home.lat, home.lng);
      this.homeSprite.setPosition(p.x, p.y).setScale(2.5 * depthScale(p.y, h));
    }
  }
}
