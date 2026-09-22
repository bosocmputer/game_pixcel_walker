import Phaser from 'phaser';
import { TILE_PX, TILE_VARIANTS, buildAtlas, drawTile, heroCanvas, landmarkIcon, type Facing, type TileAtlas } from '../game/art';
import { bus, type BattleRequest } from '../game/bus';
import {
  CHUNK_TILES,
  chunkRect,
  ensureAround,
  isLoaded,
  landmarksAround,
  loadingCount,
  metersPerTile,
  onChunkLoaded,
  tileAt,
  toLatLng,
  toTile,
} from '../game/world';
import { walk } from '../game/walk';
import { bossAvailableAt, nearbyLandmarks, BOSS_RADIUS_M } from '../game/rules';
import { store, type SaveData } from '../state/store';
import { paperdollOf } from '../game/paperdoll';

const RCHUNK = 32; // render chunk, in tiles (divides CHUNK_TILES)
const RCHUNK_PX = RCHUNK * TILE_PX;
const LANDMARK_RADIUS_M = 900;
const ZOOMS = [1, 2, 3, 4];
const WALK_FRAMES = [1, 0, 2, 0];

export class WorldScene extends Phaser.Scene {
  private atlas!: TileAtlas;
  private chunks = new Map<string, { img: Phaser.GameObjects.Image; placeholder: boolean }>();
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private accuracyRing!: Phaser.GameObjects.Arc;
  private pulse!: Phaser.GameObjects.Arc;
  private loadingText!: Phaser.GameObjects.Text;
  private target = { x: 0, y: 0 };
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
  private zoomIndex = 1;
  private pinchStart: { dist: number; zoom: number } | null = null;
  private unsubs: (() => void)[] = [];

  constructor() {
    super('World');
  }

  create() {
    this.atlas = buildAtlas();
    for (const kind of ['CONVENIENCE', 'FUEL', 'PARK', 'HOME']) {
      if (!this.textures.exists(`lm_${kind}`)) this.textures.addCanvas(`lm_${kind}`, landmarkIcon(kind));
    }

    this.accuracyRing = this.add.circle(0, 0, 10, 0x26c6da, 0.1).setStrokeStyle(1, 0x26c6da, 0.5).setDepth(5);
    this.pulse = this.add.circle(0, 0, 6, 0xffffff, 0).setStrokeStyle(2, 0xffa726, 0.9).setDepth(5);
    this.tweens.add({ targets: this.pulse, scale: 3, alpha: 0, duration: 1600, repeat: -1 });
    this.shadow = this.add.ellipse(0, 0, 14, 5, 0x000000, 0.3).setDepth(9);
    this.refreshHero(store.s);
    this.player = this.add.image(0, 0, this.heroKey()).setDepth(10).setOrigin(0.5, 0.92);
    this.loadingText = this.add
      .text(0, 0, 'กำลังโหลดแผนที่…', { fontFamily: 'Mali', fontSize: '14px', color: '#ffffff', backgroundColor: '#1b1f2acc', padding: { x: 8, y: 4 } })
      .setScrollFactor(0)
      .setDepth(100)
      .setOrigin(0.5, 0);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#2a2f3d');
    this.zoomIndex = Number(localStorage.getItem('pw.zoom') ?? 1);
    this.applyZoom();
    cam.roundPixels = true;
    this.scale.on('resize', () => this.applyZoom());

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-PLUS', () => this.zoomBy(1));
    kb.on('keydown-MINUS', () => this.zoomBy(-1));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy < 0 ? 1 : -1));
    this.input.addPointer(1);

    this.unsubs.push(
      bus.on('position', (p) => this.onPosition(p.lat, p.lng, p.accuracy)),
      store.subscribe((s) => {
        this.refreshHero(s);
        this.refreshHome(s);
      }),
      bus.on('boss:challenge', ({ landmark }) => this.startBattle({ kind: 'BOSS', monsterIds: [], landmark })),
      bus.on('battle:start', (req) => this.startBattle(req)),
      bus.on('zoom', ({ delta }) => this.zoomBy(delta)),
      onChunkLoaded((cx, cy) => this.invalidateDataChunk(cx, cy)),
    );
    this.events.once('shutdown', () => this.unsubs.forEach((u) => u()));
    this.events.on('resume', () => {
      walk.paused = false;
    });

    this.refreshHome(store.s);
    if (walk.position) this.onPosition(walk.position.lat, walk.position.lng, 10, true);
  }

  // -------------------------------------------------------------------------------------------
  // Camera zoom (wheel, +/- keys, pinch, HUD buttons)

  private applyZoom() {
    this.zoomIndex = Phaser.Math.Clamp(this.zoomIndex, 0, ZOOMS.length - 1);
    this.cameras.main.setZoom(ZOOMS[this.zoomIndex]!);
    try {
      localStorage.setItem('pw.zoom', String(this.zoomIndex));
    } catch {
      /* ignore */
    }
    this.loadingText?.setPosition(this.scale.width / 2, 8);
  }

  zoomBy(d: number) {
    this.zoomIndex += d;
    this.applyZoom();
  }

  private handlePinch() {
    const p1 = this.input.pointer1;
    const p2 = this.input.pointer2;
    if (p1.isDown && p2.isDown) {
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (!this.pinchStart) this.pinchStart = { dist, zoom: this.zoomIndex };
      const steps = Math.round(Math.log2(dist / this.pinchStart.dist) * 1.5);
      const want = Phaser.Math.Clamp(this.pinchStart.zoom + steps, 0, ZOOMS.length - 1);
      if (want !== this.zoomIndex) {
        this.zoomIndex = want;
        this.applyZoom();
      }
    } else {
      this.pinchStart = null;
    }
  }

  // -------------------------------------------------------------------------------------------

  private startBattle(req: BattleRequest) {
    if (this.scene.isActive('Battle')) return;
    walk.paused = true;
    walk.setSimDirection(0, 0);
    this.scene.pause();
    this.scene.launch('Battle', req);
  }

  private onPosition(lat: number, lng: number, accuracy: number, snap = false) {
    const t = toTile(lat, lng);
    this.target = { x: t.x * TILE_PX, y: t.y * TILE_PX };
    this.accuracyRing.setRadius(Math.max(6, (accuracy / metersPerTile(lat)) * TILE_PX));
    if (snap || (this.player.x === 0 && this.player.y === 0)) {
      this.player.setPosition(this.target.x, this.target.y);
      this.cameras.main.centerOn(this.target.x, this.target.y);
    }
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
    const t = toTile(s.home.lat, s.home.lng);
    if (!this.homeSprite) this.homeSprite = this.add.image(0, 0, 'lm_HOME').setScale(1.5).setDepth(8).setOrigin(0.5, 1);
    this.homeSprite.setPosition(t.x * TILE_PX, t.y * TILE_PX);
  }

  update(time: number, delta: number) {
    this.handlePinch();

    // Smoothly move toward the latest GPS fix (Lerp, as in the Radar spec).
    const dx = this.target.x - this.player.x;
    const dy = this.target.y - this.player.y;
    const k = 1 - Math.pow(0.002, delta / 1000);
    this.player.x += dx * k;
    this.player.y += dy * k;
    const moving = Math.hypot(dx, dy) > 0.6;
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
    this.player.setTexture(this.heroKey(this.facing, frame)).setFlipX(this.facing === 'side' && this.flip);
    this.shadow.setPosition(this.player.x, this.player.y);
    this.accuracyRing.setPosition(this.player.x, this.player.y);
    this.pulse.setPosition(this.player.x, this.player.y);
    this.cameras.main.centerOn(Math.round(this.player.x), Math.round(this.player.y));

    if (walk.simulated) {
      const K = this.keys;
      const x = (K.D!.isDown || K.RIGHT!.isDown ? 1 : 0) - (K.A!.isDown || K.LEFT!.isDown ? 1 : 0);
      const y = (K.S!.isDown || K.DOWN!.isDown ? 1 : 0) - (K.W!.isDown || K.UP!.isDown ? 1 : 0);
      if (x || y) walk.setSimDirection(x, y, K.SHIFT!.isDown);
      else if (!document.body.dataset.joystick) walk.setSimDirection(0, 0);
    }

    this.loadingText.setVisible(loadingCount() > 0);
    this.updateChunks();
    if (time - this.lastLandmarkScan > 500) {
      this.lastLandmarkScan = time;
      this.updateLandmarks();
    }
  }

  // -------------------------------------------------------------------------------------------
  // Map rendering: 32×32-tile render chunks drawn from streamed 256×256 data chunks

  private updateChunks() {
    const view = this.cameras.main.worldView;
    const x0 = Math.floor(view.x / RCHUNK_PX) - 1;
    const y0 = Math.floor(view.y / RCHUNK_PX) - 1;
    const x1 = Math.floor(view.right / RCHUNK_PX) + 1;
    const y1 = Math.floor(view.bottom / RCHUNK_PX) + 1;

    const keep = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `rc_${cx}_${cy}`;
        keep.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this.renderChunk(cx, cy, key));
      }
    }
    for (const [key, c] of this.chunks) {
      if (keep.has(key)) continue;
      this.dropChunk(key, c.img);
    }
  }

  private dropChunk(key: string, img: Phaser.GameObjects.Image) {
    img.destroy();
    if (this.textures.exists(key)) this.textures.remove(key);
    this.chunks.delete(key);
  }

  /** Re-render the loaded data chunk plus a one-render-chunk ring (neighbour-aware edges). */
  private invalidateDataChunk(cx: number, cy: number) {
    const r = chunkRect(cx, cy);
    const rx0 = Math.floor(r.x / RCHUNK) - 1;
    const ry0 = Math.floor(r.y / RCHUNK) - 1;
    const rx1 = Math.floor((r.x + r.size) / RCHUNK);
    const ry1 = Math.floor((r.y + r.size) / RCHUNK);
    for (const [key, c] of this.chunks) {
      const [, sx, sy] = key.split('_');
      const x = Number(sx);
      const y = Number(sy);
      if (x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1) this.dropChunk(key, c.img);
    }
    this.lastNearIds = '';
    if (walk.position) this.onPosition(walk.position.lat, walk.position.lng, 10);
  }

  private renderChunk(cx: number, cy: number, key: string) {
    const tx0 = cx * RCHUNK;
    const ty0 = cy * RCHUNK;
    const loaded = isLoaded(tx0, ty0);
    const tex = this.textures.createCanvas(key, RCHUNK_PX, RCHUNK_PX)!;
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    if (!loaded) {
      ensureAround(tx0, ty0, 0);
      ctx.fillStyle = '#2a2f3d';
      ctx.fillRect(0, 0, RCHUNK_PX, RCHUNK_PX);
      ctx.fillStyle = '#323848';
      for (let i = 0; i < RCHUNK; i += 2) ctx.fillRect(i * TILE_PX, 0, 1, RCHUNK_PX);
      for (let i = 0; i < RCHUNK; i += 2) ctx.fillRect(0, i * TILE_PX, RCHUNK_PX, 1);
    } else {
      for (let ty = 0; ty < RCHUNK; ty++) {
        for (let tx = 0; tx < RCHUNK; tx++) {
          const gx = tx0 + tx;
          const gy = ty0 + ty;
          const variant = (((gx * 7 + gy * 13) % TILE_VARIANTS) + TILE_VARIANTS) % TILE_VARIANTS;
          drawTile(ctx, this.atlas, tileAt(gx, gy), variant, (dx, dy) => tileAt(gx + dx, gy + dy), tx * TILE_PX, ty * TILE_PX);
        }
      }
    }
    tex.refresh();
    const img = this.add.image(cx * RCHUNK_PX, cy * RCHUNK_PX, key).setOrigin(0).setDepth(0);
    return { img, placeholder: !loaded };
  }

  private updateLandmarks() {
    const here = toLatLng(this.player.x / TILE_PX, this.player.y / TILE_PX);
    const s = store.s;
    const now = Date.now();
    const seen = new Set<string>();
    for (const l of landmarksAround(here.lat, here.lng, LANDMARK_RADIUS_M)) {
      seen.add(l.id);
      let c = this.landmarkSprites.get(l.id);
      if (!c) {
        const t = toTile(l.lat, l.lng);
        const icon = this.add.image(0, 0, `lm_${l.kind}`).setOrigin(0.5, 1).setScale(l.kind === 'PARK' ? 1.6 : 1.3);
        const bang = this.add.text(0, -24, '!', { fontFamily: 'Silkscreen', fontSize: '14px', color: '#ff5252', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        c = this.add.container(t.x * TILE_PX, t.y * TILE_PX, [icon, bang]).setDepth(7);
        c.setData('bang', bang);
        this.tweens.add({ targets: bang, y: -29, yoyo: true, repeat: -1, duration: 500 });
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
}
