import Phaser from 'phaser';
import { EQUIPMENT, MUTATIONS } from '@pw/shared';
import { TILE_PX, TILE_VARIANTS, buildTileset, heroCanvas, landmarkIcon, type Paperdoll } from '../game/art';
import { bus, type BattleRequest } from '../game/bus';
import { getWorld, toTile } from '../game/world';
import { walk } from '../game/walk';
import { bossAvailableAt, nearbyLandmarks, BOSS_RADIUS_M } from '../game/rules';
import { store, mutationOf, type SaveData } from '../state/store';

const CHUNK = 32;
const CHUNK_PX = CHUNK * TILE_PX;
const LANDMARK_VIEW_TILES = 90;

export class WorldScene extends Phaser.Scene {
  private tileset!: HTMLCanvasElement;
  private chunks = new Map<string, Phaser.GameObjects.Image>();
  private player!: Phaser.GameObjects.Image;
  private accuracyRing!: Phaser.GameObjects.Arc;
  private target = { x: 0, y: 0 };
  private heroKey = '';
  private landmarkSprites = new Map<string, Phaser.GameObjects.Container>();
  private homeSprite: Phaser.GameObjects.Image | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastNearIds = '';
  private unsubs: (() => void)[] = [];

  constructor() {
    super('World');
  }

  create() {
    this.tileset = buildTileset();
    for (const kind of ['CONVENIENCE', 'FUEL', 'PARK', 'HOME']) {
      if (!this.textures.exists(`lm_${kind}`)) this.textures.addCanvas(`lm_${kind}`, landmarkIcon(kind));
    }

    this.accuracyRing = this.add.circle(0, 0, 10, 0x26c6da, 0.12).setStrokeStyle(1, 0x26c6da, 0.6).setDepth(5);
    this.refreshHero(store.s);
    this.player = this.add.image(0, 0, this.heroKey).setDepth(10).setOrigin(0.5, 0.85).setScale(1.5);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#1b1f2a');
    cam.setZoom(this.scale.width >= 900 ? 2 : 1);
    cam.roundPixels = true;
    this.scale.on('resize', (size: Phaser.Structs.Size) => cam.setZoom(size.width >= 900 ? 2 : 1));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;

    this.unsubs.push(
      bus.on('position', (p) => this.onPosition(p.lat, p.lng, p.accuracy)),
      store.subscribe((s) => {
        this.refreshHero(s);
        this.refreshHome(s);
      }),
      bus.on('boss:challenge', ({ landmark }) => this.startBattle({ kind: 'BOSS', monsterIds: [], landmark })),
      bus.on('battle:start', (req) => this.startBattle(req)),
    );
    this.events.once('shutdown', () => this.unsubs.forEach((u) => u()));
    this.events.on('resume', () => {
      walk.paused = false;
    });

    this.refreshHome(store.s);
    if (walk.position) this.onPosition(walk.position.lat, walk.position.lng, 10, true);
  }

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
    const accPx = (accuracy / getWorld().meta.tileMeters) * TILE_PX;
    this.accuracyRing.setRadius(Math.max(6, accPx));
    if (snap || (this.player.x === 0 && this.player.y === 0)) {
      this.player.setPosition(this.target.x, this.target.y);
      this.cameras.main.centerOn(this.target.x, this.target.y);
    }
    const near = nearbyLandmarks(lat, lng, BOSS_RADIUS_M);
    const ids = near.map((l) => l.id).join(',');
    if (ids !== this.lastNearIds) {
      this.lastNearIds = ids;
      bus.emit('landmark:near', { landmarks: near });
    }
  }

  private refreshHero(s: SaveData) {
    const mut = mutationOf(s);
    const doll: Paperdoll = {
      classId: s.classId,
      helmet: s.equipment.helmet && s.equipment.helmet.durability > 0 ? spriteOf(s.equipment.helmet.itemId) : undefined,
      chest: s.equipment.chest && s.equipment.chest.durability > 0 ? spriteOf(s.equipment.chest.itemId) : undefined,
      weapon: s.equipment.weapon && s.equipment.weapon.durability > 0 ? spriteOf(s.equipment.weapon.itemId) : undefined,
      boots: s.equipment.boots && s.equipment.boots.durability > 0 ? spriteOf(s.equipment.boots.itemId) : undefined,
      aura: mut ? MUTATIONS[mut].aura : null,
    };
    const key = `hero_${JSON.stringify(doll)}`;
    if (key === this.heroKey) return;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, heroCanvas(doll));
    this.heroKey = key;
    this.player?.setTexture(key);
    this.registry.set('heroKey', key);
  }

  private refreshHome(s: SaveData) {
    if (!s.home) {
      this.homeSprite?.destroy();
      this.homeSprite = null;
      return;
    }
    const t = toTile(s.home.lat, s.home.lng);
    if (!this.homeSprite) this.homeSprite = this.add.image(0, 0, 'lm_HOME').setScale(2).setDepth(8).setOrigin(0.5, 1);
    this.homeSprite.setPosition(t.x * TILE_PX, t.y * TILE_PX);
  }

  update(_time: number, delta: number) {
    // Smoothly move toward the latest GPS fix (Lerp, as in the Radar spec).
    const k = 1 - Math.pow(0.001, delta / 1000);
    this.player.x += (this.target.x - this.player.x) * k;
    this.player.y += (this.target.y - this.player.y) * k;
    this.accuracyRing.setPosition(this.player.x, this.player.y);
    const cam = this.cameras.main;
    cam.centerOn(Math.round(this.player.x), Math.round(this.player.y));

    if (walk.simulated) {
      const K = this.keys;
      const x = (K.D!.isDown || K.RIGHT!.isDown ? 1 : 0) - (K.A!.isDown || K.LEFT!.isDown ? 1 : 0);
      const y = (K.S!.isDown || K.DOWN!.isDown ? 1 : 0) - (K.W!.isDown || K.UP!.isDown ? 1 : 0);
      if (x || y) walk.setSimDirection(x, y, K.SHIFT!.isDown);
      else if (!document.body.dataset.joystick) walk.setSimDirection(0, 0);
    }

    this.updateChunks();
    this.updateLandmarks();
  }

  private updateChunks() {
    const { meta } = getWorld();
    const view = this.cameras.main.worldView;
    const x0 = Math.max(0, Math.floor(view.x / CHUNK_PX) - 1);
    const y0 = Math.max(0, Math.floor(view.y / CHUNK_PX) - 1);
    const x1 = Math.min(Math.ceil(meta.width / CHUNK) - 1, Math.floor(view.right / CHUNK_PX) + 1);
    const y1 = Math.min(Math.ceil(meta.height / CHUNK) - 1, Math.floor(view.bottom / CHUNK_PX) + 1);

    const keep = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `chunk_${cx}_${cy}`;
        keep.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this.renderChunk(cx, cy, key));
      }
    }
    for (const [key, img] of this.chunks) {
      if (keep.has(key)) continue;
      img.destroy();
      this.textures.remove(key);
      this.chunks.delete(key);
    }
  }

  private renderChunk(cx: number, cy: number, key: string): Phaser.GameObjects.Image {
    const { meta, tiles } = getWorld();
    const tex = this.textures.createCanvas(key, CHUNK_PX, CHUNK_PX)!;
    const ctx = tex.getContext();
    for (let ty = 0; ty < CHUNK; ty++) {
      for (let tx = 0; tx < CHUNK; tx++) {
        const gx = cx * CHUNK + tx;
        const gy = cy * CHUNK + ty;
        if (gx >= meta.width || gy >= meta.height) continue;
        const id = tiles[gy * meta.width + gx]!;
        const variant = (gx * 7 + gy * 13) % TILE_VARIANTS;
        ctx.drawImage(this.tileset, variant * TILE_PX, id * TILE_PX, TILE_PX, TILE_PX, tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX);
      }
    }
    tex.refresh();
    return this.add.image(cx * CHUNK_PX, cy * CHUNK_PX, key).setOrigin(0).setDepth(0);
  }

  private updateLandmarks() {
    const px = this.player.x / TILE_PX;
    const py = this.player.y / TILE_PX;
    const s = store.s;
    const now = Date.now();
    const seen = new Set<string>();
    for (const l of getWorld().landmarks) {
      const t = toTile(l.lat, l.lng);
      if (Math.abs(t.x - px) > LANDMARK_VIEW_TILES || Math.abs(t.y - py) > LANDMARK_VIEW_TILES) continue;
      seen.add(l.id);
      let c = this.landmarkSprites.get(l.id);
      if (!c) {
        const icon = this.add.image(0, 0, `lm_${l.kind}`).setOrigin(0.5, 1).setScale(l.kind === 'PARK' ? 2.5 : 2);
        const bang = this.add.text(0, -32, '!', { fontFamily: 'Silkscreen', fontSize: '16px', color: '#ff5252', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        c = this.add.container(t.x * TILE_PX, t.y * TILE_PX, [icon, bang]).setDepth(7);
        c.setData('bang', bang);
        this.tweens.add({ targets: bang, y: -38, yoyo: true, repeat: -1, duration: 500 });
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

function spriteOf(itemId: string): string | undefined {
  return EQUIPMENT[itemId]?.sprite;
}
