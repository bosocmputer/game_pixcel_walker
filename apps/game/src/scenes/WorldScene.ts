/**
 * Overworld: the real map is rendered by MapLibre underneath (see game/map.ts); this scene
 * only draws game sprites on a transparent canvas — the hero at the GPS position plus landmark
 * and home icons — by projecting lat/lng to screen space every frame.
 */
import Phaser from 'phaser';
import { PIXEL_FONT } from '../ui/pixel';
import { FIGHT_RANGE_M, MONSTERS, gateLayer, gateRank, haversine, type Landmark, type Spawn } from '@pw/shared';
import { DEFAULT_APPEARANCE, heroCanvas, landmarkIcon, monsterCanvas, type Facing } from '../game/art';
import { bus, toast, type BattleRequest } from '../game/bus';
import { CHUNK_TILES, ensureAround, landmarksAround, loadingCount, toTile } from '../game/world';
import { centerOn, depthScale, getMap, pixelsPerMeter, project, resetNorth, zoomBy, zoomScale } from '../game/map';
import { pruneKills, visibleSpawns } from '../game/spawns';
import { walk } from '../game/walk';
import { bossAvailableAt, nearbyLandmarks, BOSS_RADIUS_M } from '../game/rules';
import { store, type SaveData } from '../state/store';
import { paperdollOf } from '../game/paperdoll';
import { RemotePlayers } from './remotePlayers';
import { PIN_FILES, RIFT_FRAMES, hasPixelSprite, pixelImage } from '../game/sprites';
import { net } from '../game/net';
import { autoHunt } from '../game/autohunt';
import {
  AVATAR_ORIGIN_X,
  AVATAR_ORIGIN_Y,
  AVATAR_WORLD_SCALE,
  idleFrameCount,
  isAvatarPackLoaded,
  IDLE_DELAY_MS,
  IDLE_MS,
  USE_AVATAR_PACK,
} from '../game/avatar';

const LANDMARK_RADIUS_M = 700;
const WALK_FRAMES = [1, 0, 2, 0];
const getHeroScale = () => (USE_AVATAR_PACK && isAvatarPackLoaded() ? AVATAR_WORLD_SCALE : 3);
const getHeroOrigin = () =>
  USE_AVATAR_PACK && isAvatarPackLoaded()
    ? { x: AVATAR_ORIGIN_X, y: AVATAR_ORIGIN_Y }
    : { x: 0.5, y: 0.92 };

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private accuracyRing!: Phaser.GameObjects.Arc;
  private pulse!: Phaser.GameObjects.Arc;
  private rangeRing!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private target: { lat: number; lng: number } | null = null;
  private current: { lat: number; lng: number } | null = null;
  private accuracy = 10;
  private heroBase = '';
  private facing: Facing = 'down';
  private flip = false;
  private walkTime = 0;
  private standTime = 0;
  private idleFrames = 0;
  private landmarkSprites = new Map<string, Phaser.GameObjects.Container>();
  private monsterSprites = new Map<string, Phaser.GameObjects.Container>();
  private lastSpawnScan = 0;
  private lastInRange = '';
  private homeSprite: Phaser.GameObjects.Image | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastNearIds = '';
  private lastDataChunk = '';
  private lastLandmarkScan = 0;
  private unsubs: (() => void)[] = [];
  private remotes!: RemotePlayers;

  constructor() {
    super('World');
  }

  create() {
    // Pins: rift strips become looping sprite-sheet animations; the rest are single images.
    for (const name of PIN_FILES) {
      const key = `lm_${name}`;
      if (this.textures.exists(key)) continue;
      const img = pixelImage('landmarks', name);
      if (!img) {
        this.textures.addCanvas(key, landmarkIcon(name));
      } else if (name.startsWith('rift_')) {
        this.textures.addSpriteSheet(key, img, { frameWidth: img.width / RIFT_FRAMES, frameHeight: img.height });
        this.anims.create({ key: `${key}_open`, frames: this.anims.generateFrameNumbers(key, {}), frameRate: 6, repeat: -1 });
      } else {
        this.textures.addImage(key, img);
      }
    }
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.rangeRing = this.add.graphics().setDepth(4);
    this.accuracyRing = this.add.circle(0, 0, 10, 0x26c6da, 0.12).setStrokeStyle(2, 0x26c6da, 0.6).setDepth(5);
    this.pulse = this.add.circle(0, 0, 10, 0xffffff, 0).setStrokeStyle(3, 0xffa726, 0.9).setDepth(5);
    this.tweens.add({ targets: this.pulse, scale: 3, alpha: 0, duration: 1600, repeat: -1 });
    this.shadow = this.add.ellipse(0, 0, 40, 14, 0x000000, 0.28).setDepth(9);
    this.remotes = new RemotePlayers(this);
    this.refreshHero(store.s);
    const origin = getHeroOrigin();
    this.player = this.add.image(0, 0, this.heroKey()).setDepth(10).setOrigin(origin.x, origin.y).setScale(getHeroScale());
    this.loadingText = this.add
      .text(0, 0, 'กำลังโหลดข้อมูลแผนที่…', { fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff', backgroundColor: '#1b1f2acc', padding: { x: 8, y: 4 } })
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
      bus.on('home:enter', () => this.enterHome()),
      bus.on('players', ({ players }) => this.remotes.sync(players)),
      bus.on('zoom', ({ delta }) => (delta === 0 ? resetNorth() : zoomBy(delta * 0.5))),
    );
    this.events.once('shutdown', () => this.unsubs.forEach((u) => u()));
    this.events.on('resume', () => {
      walk.paused = false;
      this.lastSpawnScan = 0;
    });

    // The Phaser canvas lets pointer events through to the map, so taps come from MapLibre.
    const map = getMap();
    const onTap = (e: { point: { x: number; y: number } }) => this.onTap(e.point.x, e.point.y);
    map?.on('click', onTap);
    // Sim mode test tool: right-click (desktop) / long-press (Android) teleports there.
    const onWarp = (e: { lngLat: { lat: number; lng: number }; preventDefault?: () => void }) => {
      if (!walk.simulated || !this.scene.isActive()) return;
      walk.teleport(e.lngLat.lat, e.lngLat.lng);
      toast('✨ วาร์ปแล้ว (โหมดทดสอบ)');
    };
    map?.on('contextmenu', onWarp);
    this.events.once('shutdown', () => {
      map?.off('click', onTap);
      map?.off('contextmenu', onWarp);
    });
    pruneKills();

    this.refreshHome(store.s);
    if (walk.position) this.onPosition(walk.position.lat, walk.position.lng, 10);
  }

  private enterHome() {
    if (this.scene.isActive('Battle') || this.scene.isActive('Home')) return;
    autoHunt.stop();
    walk.paused = true;
    walk.setSimDirection(0, 0);
    this.scene.pause();
    this.scene.launch('Home');
  }

  private startBattle(req: BattleRequest) {
    if (this.scene.isActive('Battle')) return;
    // A party fight pulls you out of the house.
    if (this.scene.isActive('Home')) this.scene.stop('Home');
    if (walk.tooFast) {
      toast('เคลื่อนที่เร็วเกินไป (อยู่ในรถ?) — หยุดก่อนแล้วค่อยสู้ ความปลอดภัยมาก่อน!', 'bad');
      return;
    }
    if (!req.run && net.pendingRun) return; // a shared fight is about to start
    // With party members nearby, map monsters are fought together: the server pulls them in.
    if (req.kind === 'FIELD' && !req.run && net.partyNearby()) {
      net.openRun({ kind: 'FIELD', monsterIds: req.monsterIds, spawn: req.spawn }, !!req.auto);
      return;
    }
    walk.paused = true;
    walk.setSimDirection(0, 0);
    this.scene.pause();
    this.scene.launch('Battle', req);
    bus.emit('battle:launched');
  }

  private onPosition(lat: number, lng: number, accuracy: number) {
    this.target = { lat, lng };
    // Big jumps (teleport, 300× sim speed) snap instead of gliding across the city.
    if (!this.current || haversine(this.current, this.target) > 300) this.current = { lat, lng };
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
  // Hero (paperdoll × facing × walk frame, plus the standing animation)

  private heroKey(facing: Facing = this.facing, frame = 0) {
    return `${this.heroBase}_${facing}_${frame}`;
  }

  /** Standing animation frame (front-facing; the pack has no side/back idle art). */
  private idleKey(frame: number) {
    return `${this.heroBase}_idle_${frame}`;
  }

  private refreshHero(s: SaveData) {
    const doll = paperdollOf(s);
    const base = `hero_${JSON.stringify(doll)}`;
    if (base === this.heroBase) return;
    this.heroBase = base;
    for (const f of ['down', 'up', 'side'] as Facing[]) {
      for (let i = 0; i < 4; i++) {
        const key = this.heroKey(f, i);
        if (!this.textures.exists(key)) this.textures.addCanvas(key, heroCanvas(doll, f, i));
      }
    }
    const ap = doll.appearance ?? DEFAULT_APPEARANCE;
    this.idleFrames = idleFrameCount(ap.gender ?? 'male', ap.hairStyle);
    for (let i = 0; i < this.idleFrames; i++) {
      const key = this.idleKey(i);
      if (!this.textures.exists(key)) this.textures.addCanvas(key, heroCanvas(doll, 'down', i, true));
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
    if (!this.homeSprite) this.homeSprite = this.add.image(0, 0, 'lm_HOME').setScale(this.homeScale()).setDepth(8).setOrigin(0.5, 1);
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
    const isPack = USE_AVATAR_PACK && isAvatarPackLoaded();
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = 'side';
        this.flip = dx < 0;
      } else {
        this.facing = dy < 0 ? 'up' : 'down';
        if (isPack && Math.abs(dx) > 0.3) this.flip = dx < 0;
      }
      this.walkTime += delta;
      this.standTime = 0;
    } else {
      this.walkTime = 0;
      this.standTime += delta;
    }
    // Standing still for a moment plays the idle animation (breathing); a step cuts back to walking.
    const standing = !moving && this.idleFrames > 0 && this.standTime > IDLE_DELAY_MS;
    const frame = moving ? (isPack ? Math.floor(this.walkTime / 160) % 4 : WALK_FRAMES[Math.floor(this.walkTime / 160) % 4]!) : 0;
    const zs = zoomScale();
    const origin = getHeroOrigin();
    this.player
      .setTexture(standing ? this.idleKey(Math.floor((this.standTime - IDLE_DELAY_MS) / IDLE_MS) % this.idleFrames) : this.heroKey(this.facing, frame))
      .setOrigin(origin.x, origin.y)
      .setFlipX(isPack ? this.flip : (this.facing === 'side' && this.flip))
      .setPosition(here.x, here.y)
      .setScale(getHeroScale() * zs);
    this.shadow.setPosition(here.x, here.y).setScale(zs);
    this.pulse.setPosition(here.x, here.y);
    this.drawRangeRing(this.current.lat, this.current.lng);
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
    if (time - this.lastSpawnScan > 1000) {
      this.lastSpawnScan = time;
      this.syncMonsters();
    }
    this.placeOverlays();
    this.remotes.update(delta, getHeroScale());
  }

  /** Play-radius ring: the true ground circle projected, so it stays right under any rotation/tilt. */
  private drawRangeRing(lat: number, lng: number) {
    const mLat = FIGHT_RANGE_M / 110574;
    const mLng = FIGHT_RANGE_M / (111320 * Math.cos((lat * Math.PI) / 180));
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const p = project(lat + Math.sin(a) * mLat, lng + Math.cos(a) * mLng);
      pts.push(new Phaser.Math.Vector2(p.x, p.y));
    }
    this.rangeRing.clear().fillStyle(0xffa726, 0.07).fillPoints(pts, true).lineStyle(2, 0xffa726, 0.7).strokePoints(pts, true);
  }

  /** Pin texture for a place (docs/STORY.md §5): rift by layer + rank, sealed crack, or a place picture. */
  private pinTexture(l: Landmark, open: boolean): string {
    const layer = gateLayer(l.kind);
    const rank = gateRank(l.kind) ?? 'E';
    if (!layer) return `lm_${l.kind}`;
    if (!open) return `lm_sealed_${rank}`;
    return `lm_rift_${layer.toLowerCase()}_${rank}`;
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
        const icon = this.add.sprite(0, 0, this.pinTexture(l, true)).setOrigin(0.5, 1).setScale(getHeroScale());
        c = this.add.container(0, 0, [icon]).setDepth(7);
        c.setData({ icon, lat: l.lat, lng: l.lng, open: null });
        // Services hover like a [ระบบ] hologram; sanctuaries breathe softly.
        if (l.kind === 'HOSPITAL' || l.kind === 'MARKET') this.tweens.add({ targets: icon, y: -4, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
        if (l.kind === 'SANCTUARY') this.tweens.add({ targets: icon, alpha: 0.7, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
        this.landmarkSprites.set(l.id, c);
      }
      // Gates: an open rift animates; a closed one is a sealed crack.
      if (gateLayer(l.kind)) {
        const open = bossAvailableAt(l, s, now) <= now;
        if (c.getData('open') !== open) {
          const icon = c.getData('icon') as Phaser.GameObjects.Sprite;
          icon.setTexture(this.pinTexture(l, open));
          if (open && this.anims.exists(`${icon.texture.key}_open`)) icon.play({ key: `${icon.texture.key}_open`, startFrame: Math.floor(Math.random() * RIFT_FRAMES) });
          else icon.stop();
          c.setData('open', open);
        }
      }
    }
    for (const [id, c] of this.landmarkSprites) {
      if (seen.has(id)) continue;
      c.destroy();
      this.landmarkSprites.delete(id);
    }
  }


  // -------------------------------------------------------------------------------------------
  // World monsters

  private homeScale(): number {
    return hasPixelSprite('landmarks', 'HOME') ? getHeroScale() : 2.5;
  }

  private levelColor(level: number): string {
    const d = level - store.s.level;
    return d <= -3 ? '#8dff8a' : d <= 1 ? '#fff176' : '#ff6b6b';
  }

  private syncMonsters() {
    const here = this.current!;
    const seen = new Set<string>();
    for (const sp of visibleSpawns(here.lat, here.lng)) {
      seen.add(sp.id);
      let c = this.monsterSprites.get(sp.id);
      const def = MONSTERS[sp.monsterId]!;
      if (!c) {
        const key = `mob_${def.sprite}`;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, monsterCanvas(def.sprite));
        const shadow = this.add.ellipse(0, 0, 36, 10, 0x000000, 0.25);
        const isBoss = !!def.boss;
        const isPack = USE_AVATAR_PACK && isAvatarPackLoaded();
        const mobScale = hasPixelSprite('monsters', def.sprite) ? getHeroScale() : isBoss ? (isPack ? 3.5 : 3.2) : (isPack ? 2.3 : 2.6);
        const img = this.add.image(0, 0, key).setOrigin(0.5, 1).setScale(mobScale);
        const label = this.add
          .text(0, 4, `Lv.${def.level}`, { fontFamily: PIXEL_FONT, fontSize: '12px', color: this.levelColor(def.level), stroke: '#000', strokeThickness: 3 })
          .setOrigin(0.5, 0);
        const swords = this.add.text(0, -img.displayHeight - 10, '⚔️', { fontSize: '18px' }).setOrigin(0.5).setVisible(false);
        c = this.add.container(0, 0, [shadow, img, label, swords]).setDepth(8);
        c.setData({ spawn: sp, img, swords, label });
        this.tweens.add({ targets: img, y: -4, yoyo: true, repeat: -1, duration: 600 + Math.random() * 400, ease: 'Sine.easeInOut' });
        this.monsterSprites.set(sp.id, c);
      }
      const inRange = haversine(here, sp) <= FIGHT_RANGE_M;
      (c.getData('swords') as Phaser.GameObjects.Text).setVisible(inRange);
      (c.getData('label') as Phaser.GameObjects.Text).setColor(this.levelColor(def.level));
    }
    for (const [id, c] of this.monsterSprites) {
      if (seen.has(id)) continue;
      c.destroy();
      this.monsterSprites.delete(id);
    }
    const inRange = [...this.monsterSprites.values()]
      .map((c) => c.getData('spawn') as Spawn)
      .filter((sp) => haversine(here, sp) <= FIGHT_RANGE_M)
      .sort((a, b) => haversine(here, a) - haversine(here, b));
    const key = inRange.map((sp) => sp.id).join(',');
    if (key !== this.lastInRange) {
      this.lastInRange = key;
      bus.emit('monsters:inRange', { spawns: inRange });
      if (inRange.length) navigator.vibrate?.(80);
    }
  }

  /** Tap on the map: fight the nearest monster under the finger if it is within range. */
  private onTap(x: number, y: number) {
    if (this.scene.isPaused() || !this.current) return;
    let best: { spawn: Spawn; d: number } | null = null;
    for (const c of this.monsterSprites.values()) {
      const d = Math.hypot(c.x - x, c.y - 20 * c.scale - y);
      if (d < 48 * Math.max(0.7, c.scale) && (!best || d < best.d)) best = { spawn: c.getData('spawn') as Spawn, d };
    }
    if (!best) return;
    const sp = best.spawn;
    const def = MONSTERS[sp.monsterId]!;
    const dist = haversine(this.current, sp);
    if (dist > FIGHT_RANGE_M) {
      toast(`${def.nameTh} Lv.${def.level} อยู่ห่าง ${Math.round(dist)} ม. — เดินเข้าไปใกล้อีก ${Math.ceil(dist - FIGHT_RANGE_M)} ม.`);
      return;
    }
    this.startBattle({ kind: 'FIELD', monsterIds: [sp.monsterId], spawn: { id: sp.id, expiresAt: sp.expiresAt } });
  }

  /** Re-project overlays every frame so they stick to the map while it zooms/rotates. */
  private placeOverlays() {
    const h = this.scale.height;
    const zs = zoomScale();
    for (const c of this.landmarkSprites.values()) {
      const p = project(c.getData('lat') as number, c.getData('lng') as number);
      const onScreen = p.x > -80 && p.y > -80 && p.x < this.scale.width + 80 && p.y < h + 80;
      c.setVisible(onScreen).setPosition(p.x, p.y).setScale(depthScale(p.y, h) * zs).setDepth(7 + p.y / 10000);
    }
    for (const c of this.monsterSprites.values()) {
      const sp = c.getData('spawn') as Spawn;
      const p = project(sp.lat, sp.lng);
      const onScreen = p.x > -80 && p.y > -80 && p.x < this.scale.width + 80 && p.y < h + 80;
      c.setVisible(onScreen).setPosition(p.x, p.y).setScale(depthScale(p.y, h) * zs).setDepth(8 + p.y / 10000);
    }
    const home = store.s.home;
    if (home && this.homeSprite) {
      const p = project(home.lat, home.lng);
      this.homeSprite.setPosition(p.x, p.y).setScale(this.homeScale() * depthScale(p.y, h) * zs);
    }
  }
}
