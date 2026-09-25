/**
 * Party auto-battle scene (Pockie Ninja style): side-view formation, player party on the left,
 * monsters on the right. The shared engine resolves one unit turn per step; this scene only
 * animates the resulting events. Fights are dungeons of 1..N waves.
 */
import Phaser from 'phaser';
import { PIXEL_FONT, uiIcon } from '../ui/pixel';
import {
  CLASSES,
  CONSUMABLES,
  DUNGEON_BY_ID,
  EQUIPMENT,
  MONSTERS,
  SKILLS,
  createDungeon,
  dailyTitle,
  AWAKEN_MAX,
  addInput,
  awakenGrade,
  gateLayer,
  gateRank,
  rankOf,
  itemName as sharedItemName,
  createRng,
  landmarkWaves,
  memberLootSeed,
  memberState,
  nextWave,
  partyFieldHpScale,
  runToEnd,
  step,
  type AwakenGrade,
  type CombatEvent,
  type CombatUnit,
  type Dungeon,
  type UnitSetup,
  type WaveDef,
} from '@pw/shared';
import { heroCanvas, monsterCanvas, type HairStyle, type Paperdoll } from '../game/art';
import { hasPixelSprite, pixelImage } from '../game/sprites';
import {
  animFrameCount,
  AVATAR_ORIGIN_X,
  AVATAR_ORIGIN_Y,
  isAvatarPackLoaded,
  USE_AVATAR_PACK,
} from '../game/avatar';
import { bus, toast, type BattleRequest } from '../game/bus';
import { paperdollOf } from '../game/paperdoll';
import { applyBattleOutcome, bossIdFor, changeClass, worldBossHp, type BattleOutcome } from '../game/rules';
import { playerSetup } from '../game/party';
import { store } from '../state/store';
import { el, esc } from '../ui/dom';
import { autoHunt } from '../game/autohunt';
import { music, sfx } from '../game/audio';
import { createFxAnims, hitFx, meleeSwing, playFx, preloadFx, shootProjectile, skillLook, statusFx, type FxAnchor, type SkillLook } from './battleFx';
import { ComboCounter, ELEMENT_COLOR, coinBurst, damageNumber, flinchTexture, shatter } from './battleJuice';
import { haptic } from '../game/haptics';
import { buildStage, riftBreak, type StageLayer } from './battleStage';
import { StatusRow, TurnBar, preloadOverlay } from './battleOverlay';
import { DEFAULT_POS, walk } from '../game/walk';

/** World boss attack window, in rounds. */
const WORLD_BOSS_ROUNDS = 20;
const STEP_MS = 700;
/** Potions provided by the test arena (never taken from the bag). */
const TEST_KIT = { red_potion: 5, blue_elixir: 5 };

interface UnitView {
  sprite: Phaser.GameObjects.Image;
  bars: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  home: { x: number; y: number };
  /** Screen pixels per effect pixel (bosses get bigger effects). */
  fxPx: number;
  /** Texture the unit rests on, and its hand-drawn slash frames (avatar-pack heroes only). */
  idleKey: string;
  slashKeys: string[];
  /** Contact shadow (follows the sprite, shrinks when it leaves the ground). */
  shadow: Phaser.GameObjects.Ellipse;
  /** Resting scale — breathing and squash always return here. */
  baseX: number;
  baseY: number;
  /** Breathing phase so units don't breathe in sync. */
  phase: number;
  /** Scene time until which the unit is attacking / being hit (no breathing meanwhile). */
  actUntil: number;
  /** HP fraction the bar shows — drops on each hit as it lands (the engine resolved the whole turn already). */
  shown: number;
  /** HP fraction the white "ghost" bar still shows (drains after the real bar). */
  ghost: number;
  ghostHoldUntil: number;
  /** Status badges under the bars. */
  status: StatusRow;
  /** Draw order at rest (lower on screen = in front). */
  depth: number;
  /** Monster with an animation strip: frames 0 idle · 1 breathe · 2 attack · 3 hurt. */
  animated: boolean;
  /** Hero flinch texture (runtime lean-back copy of the idle frame). */
  hurtKey: string | null;
}

const STATUS_TH: Record<string, string> = {
  STUN: 'มึน!', FREEZE: 'แข็ง!', POISON: 'ติดพิษ', BURN: 'ติดไฟ', BLEED: 'เลือดไหล', SLOW: 'ช้าลง', TAUNTING: 'ยั่วยุ!', ROOT: 'ถูกรัด!',
};

export class BattleScene extends Phaser.Scene {
  private req!: BattleRequest;
  private d!: Dungeon;
  /** Our unit id: 'me' solo, the player id in a dungeon run (identical on every member's device). */
  private meId = 'me';
  private partyIds = new Set<string>();
  private views = new Map<string, UnitView>();
  private eventIndex = 0;
  private waitUntil = 0;
  private speed = 2;
  private finished = false;
  private worldBossStartHp = 0;
  /** Rank letter of the gate being fought (landmark boss or dungeon), for the [ระบบ] banner. */
  private gateRank: string | null = null;
  private panel!: HTMLElement;
  private header!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  // Game feel (ROADMAP ⚔️ phase 1)
  /** Real time (performance.now) until which the hit-stop freeze lasts. */
  private frozenUntil = 0;
  /** Final-blow slow motion is running. */
  private slowmo = false;
  /** Extra real ms the next engine step must wait (hit-stops scheduled by this step). */
  private stopDebt = 0;
  /** Unit whose turn it is (bouncing marker). */
  private activeId: string | null = null;
  private marker!: Phaser.GameObjects.Triangle;
  private combo!: ComboCounter;
  /** Recent damage numbers per unit → lane, so simultaneous numbers don't overlap. */
  private lanes = new Map<string, { n: number; at: number }>();
  private celebrated = false;
  /** Unit that takes the final blow of the whole fight (slow motion on that hit). */
  private finisherId: string | null = null;
  /** Which world the fight is in (sky, rift-break style). */
  private stageLayer: StageLayer = 'FIELD';
  private turnBar!: TurnBar;
  // Awakening (ROADMAP ⚔️ 4.1)
  /** Solo fights only for now — every party member simulates the same fight on their own device. */
  private awakenAllowed = false;
  /** A press is recorded and waits for our next turn. */
  private awakenPending = false;
  /** Timing ring on screen: real-time start (performance.now) + its graphics. */
  private ring: { start: number; g: Phaser.GameObjects.Graphics; close: () => void; done: boolean } | null = null;

  constructor() {
    super('Battle');
  }

  preload() {
    preloadFx(this);
    preloadOverlay(this);
  }

  init(req: BattleRequest) {
    this.req = req;
    this.meId = req.run?.meId ?? 'me';
    this.partyIds = new Set([this.meId, ...(req.run?.entrants.map((e) => e.setup.id) ?? [])]);
    this.views.clear();
    this.eventIndex = 0;
    this.waitUntil = 0;
    this.finished = false;
    this.worldBossStartHp = 0;
    this.lastPanel = '';
    this.allEvents = [];
    this.currentArchived = false;
    this.looks.clear();
    this.speed = req.auto ? 4 : Number(localStorage.getItem('pw.battleSpeed') ?? 2);
    this.frozenUntil = 0;
    this.slowmo = false;
    this.stopDebt = 0;
    this.activeId = null;
    this.lanes.clear();
    this.celebrated = false;
    this.finisherId = null;
    this.awakenAllowed = !req.run;
    this.awakenPending = false;
    this.ring = null;
  }

  create() {
    const s = store.s;
    let waves: WaveDef[] = [{ monsterIds: this.req.monsterIds }];
    let bossHp: number | undefined;
    let maxRounds: number | undefined;
    let rollModifiers = false;
    if (this.req.kind === 'BOSS' && this.req.landmark) {
      const bossId = bossIdFor(this.req.landmark)!;
      if (MONSTERS[bossId]?.boss?.worldBoss) {
        this.worldBossStartHp = worldBossHp(this.req.landmark, s);
        bossHp = this.worldBossStartHp;
        maxRounds = WORLD_BOSS_ROUNDS;
        waves = [{ monsterIds: [bossId], boss: true }];
      } else {
        waves = landmarkWaves(bossId);
        rollModifiers = true;
      }
    }
    if (this.req.kind === 'TRIAL') waves = [{ monsterIds: ['soi_dog_spirit', 'alley_rat'] }];
    const test = this.req.kind === 'TEST' ? this.req.test : undefined;
    if (test) {
      waves = test.waves;
      rollModifiers = test.modifiers;
      maxRounds = test.maxRounds;
    }

    // Every fight starts at full HP/MP; the test arena also brings its own potion kit.
    const items: Record<string, number> = test ? { ...TEST_KIT } : {};
    if (!test && s.bag.red_potion) items.red_potion = s.bag.red_potion;
    if (!test && s.bag.blue_elixir) items.blue_elixir = s.bag.blue_elixir;
    const me = playerSetup(s);
    let party: UnitSetup[] = [me];
    let seed = (Math.random() * 2 ** 31) | 0;
    let enemyScale = test ? { hp: test.hpMult, atk: test.atkMult } : undefined;
    const run = this.req.run;
    if (run) {
      // Everyone builds the run from the same server-issued data; each brings their own potions.
      party = run.entrants.map((e) => ({ ...e.setup }));
      seed = run.seed;
      delete items.red_potion;
      delete items.blue_elixir;
      if (run.target.kind === 'DUNGEON') {
        waves = DUNGEON_BY_ID[run.target.dungeonId!]!.waves;
        rollModifiers = true;
      } else if (party.length > 1) {
        // Party field fight: tougher monsters, but still quicker and safer than going alone.
        enemyScale = { hp: partyFieldHpScale(party.length), atk: 1 };
      }
    }
    const lastWave = waves.at(-1);
    this.gateRank = this.req.landmark
      ? gateRank(this.req.landmark.kind)
      : this.req.kind === 'DUNGEON' && lastWave?.boss
        ? rankOf(MONSTERS[lastWave.monsterIds[0]!]?.level ?? 1)
        : null;
    this.d = createDungeon({
      party,
      waves,
      seed,
      items,
      rollModifiers,
      bossHp,
      maxRounds,
      enemyScale,
      noBossScaling: !!test,
    });

    const { width, height } = this.scale;
    // The stage: the player's real street in Mode-7 under a sky that shows which world this is.
    const landmarkLayer = this.req.landmark ? gateLayer(this.req.landmark.kind) : null;
    this.stageLayer = landmarkLayer ?? (this.req.run?.target.kind === 'DUNGEON' || this.req.kind === 'DUNGEON' ? 'PIXEL' : 'FIELD');
    const at = walk.position ?? this.req.landmark ?? DEFAULT_POS;
    buildStage(this, { lat: at.lat, lng: at.lng, layer: this.stageLayer, kind: landmarkLayer ? this.req.landmark!.kind : undefined });

    this.header = this.add.text(width / 2, 12, '', { fontFamily: PIXEL_FONT, fontSize: '15px', color: '#fff', stroke: '#000', strokeThickness: 4, align: 'center' }).setOrigin(0.5, 0).setDepth(50);
    this.banner = this.add.text(width / 2, height * 0.3, '', { fontFamily: PIXEL_FONT, fontSize: '22px', color: '#ffd54f', stroke: '#000', strokeThickness: 5, align: 'center', wordWrap: { width: width - 40 } }).setOrigin(0.5).setDepth(60).setAlpha(0);
    this.header.setScrollFactor(0);
    this.banner.setScrollFactor(0);

    this.marker = this.add.triangle(0, 0, 0, 0, 12, 0, 6, 8, 0xffd54f).setStrokeStyle(2, 0x3a1a00).setDepth(45).setVisible(false);
    this.combo = new ComboCounter(this);
    this.turnBar = new TurnBar(this, 96); // below the 3-line header (title · wave/round · modifier)
    this.events.once('shutdown', () => this.turnBar.destroy());
    this.events.once('shutdown', () => this.setTimeScale(1));
    this.layout();
    this.panel = el(`<div class="battle-panel"></div>`);
    document.getElementById('ui')!.appendChild(this.panel);
    document.body.classList.add('in-battle');
    this.events.once('shutdown', () => {
      this.panel.remove();
      document.body.classList.remove('in-battle');
    });
    this.renderPanel();

    createFxAnims(this);
    music(this.d.combat.units.some((u) => u.isBoss) || this.d.waves.some((w) => w.boss) ? 'boss' : 'battle');
    sfx('encounter');
    this.events.once('shutdown', () => music('field'));
  }

  // -------------------------------------------------------------------------------------------
  // Layout: side view, two rows per side

  private layout() {
    const { width, height } = this.scale;
    const units = this.d.combat.units;
    const scale = Math.max(3, Math.min(5, Math.floor(width / 120)));
    for (const side of ['A', 'B'] as const) {
      for (const row of ['FRONT', 'BACK'] as const) {
        const group = units.filter((u) => u.side === side && u.row === row);
        const colX = side === 'A' ? (row === 'FRONT' ? 0.34 : 0.16) : row === 'FRONT' ? 0.66 : 0.84;
        group.forEach((u, i) => {
          // Standing on the Mode-7 floor: the back row further away (higher, smaller), the front row near.
          const n = Math.max(group.length, 1);
          const y = height * ((row === 'BACK' ? 0.53 : 0.61) + ((i + 0.5) / n - 0.5) * (n > 2 ? 0.2 : 0.14));
          // Stagger along the row so labels of stacked units don't overlap.
          const x = width * colX + (i % 2 ? (side === 'A' ? -1 : 1) : 0) * Math.min(40, width * 0.05) + (n > 2 && i === n - 1 ? (side === 'A' ? 10 : -10) : 0);
          let v = this.views.get(u.id);
          if (!v) v = this.addView(u, u.isBoss ? scale + 2 : scale);
          v.home = { x, y };
          v.depth = 10 + y / 1000;
          v.sprite.setDepth(v.depth);
          if (u.hp > 0) v.sprite.setPosition(x, y).setAlpha(1);
          v.shadow.setPosition(x, y).setVisible(u.hp > 0);
          v.label.setPosition(x, y + 4);
        });
      }
    }
    this.drawBars();
  }

  private addView(u: CombatUnit, scale: number): UnitView {
    let key: string;
    let doll: Paperdoll | null = null;
    const ally = this.req.run?.entrants.find((e) => e.setup.id === u.id && u.id !== this.meId);
    if (ally) {
      const l = ally.look;
      doll = { ...l, appearance: { ...l.appearance, hairStyle: l.appearance.hairStyle as HairStyle } };
      key = `hero_${JSON.stringify(doll)}_side_0`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, heroCanvas(doll, 'side', 0));
    } else if (u.side === 'A') {
      doll = paperdollOf(store.s);
      const down = (this.scene.get('World').registry.get('heroKey') as string) ?? 'hero';
      key = down.replace(/_down_0$/, '_side_0');
      if (!this.textures.exists(key)) key = down;
    } else {
      key = `mob_${u.sprite}`;
      const strip = pixelImage('monsters', `${u.sprite}_anim`);
      if (strip) {
        key = `mob_anim_${u.sprite}`;
        if (!this.textures.exists(key)) this.textures.addSpriteSheet(key, strip, { frameWidth: strip.width / 4, frameHeight: strip.height });
      } else if (!this.textures.exists(key)) this.textures.addCanvas(key, monsterCanvas(u.sprite));
    }
    const isHero = !!ally || u.side === 'A';
    const isPack = USE_AVATAR_PACK && isAvatarPackLoaded();
    const origin = isHero && isPack ? { x: AVATAR_ORIGIN_X, y: AVATAR_ORIGIN_Y } : { x: 0.5, y: 1 };
    let finalScale: number;
    if (isHero) {
      finalScale = isPack ? scale * 0.55 : scale;
    } else {
      // Native-res pixel monsters use the hero's pixel size so both read as one art style.
      finalScale = hasPixelSprite('monsters', u.sprite) ? (isPack ? scale * 0.55 : scale / 2) : isPack ? (u.isBoss ? scale * 1.0 : scale * 0.75) : scale;
    }
    if (u.row === 'BACK' && !u.isBoss) finalScale *= 0.9;
    const animated = key.startsWith('mob_anim_');
    const sprite = this.add.image(0, 0, key, animated ? 0 : undefined).setScale(finalScale).setOrigin(origin.x, origin.y).setDepth(10).setFlipX(u.side === 'B');
    const label = this.add
      .text(0, 0, u.passive ? `${u.name} (HP ∞)` : `${u.name} Lv.${u.level}`, { fontFamily: PIXEL_FONT, fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0)
      .setDepth(11);
    const bars = this.add.graphics().setDepth(11);
    // Hand-drawn slash frames (wind-up / strike / follow-through) for avatar-pack heroes.
    const slashKeys: string[] = [];
    if (doll && isPack) {
      const frames = animFrameCount(doll.appearance?.gender ?? 'male', doll.appearance?.hairStyle ?? '', 'slash');
      for (let i = 0; i < frames; i++) {
        const slashKey = `hero_${JSON.stringify(doll)}_slash_${i}`;
        if (!this.textures.exists(slashKey)) this.textures.addCanvas(slashKey, heroCanvas(doll, 'side', i, 'slash'));
        slashKeys.push(slashKey);
      }
    }
    const shadowW = Math.max(26, sprite.displayWidth * (isHero ? 0.5 : 0.7));
    const shadow = this.add.ellipse(0, 0, shadowW, Math.max(8, shadowW * 0.28), 0x000000, 0.32).setDepth(9);
    const v: UnitView = {
      sprite,
      label,
      bars,
      home: { x: 0, y: 0 },
      fxPx: Math.max(2, scale - 1) + (u.isBoss ? 1 : 0),
      idleKey: key,
      slashKeys,
      shadow,
      baseX: sprite.scaleX,
      baseY: sprite.scaleY,
      phase: Math.random() * Math.PI * 2,
      actUntil: 0,
      shown: u.hp / u.base.maxHp,
      ghost: u.hp / u.base.maxHp,
      ghostHoldUntil: 0,
      status: new StatusRow(this),
      depth: 10,
      animated,
      hurtKey: animated ? null : flinchTexture(this, key, u.side === 'A' ? 1 : -1),
    };
    this.views.set(u.id, v);
    return v;
  }

  private drawBars() {
    for (const u of this.d.combat.units) {
      const v = this.views.get(u.id);
      if (!v) continue;
      v.bars.clear();
      v.status.render(u, v.home.x, v.home.y + 32);
      if ((u.hp <= 0 && v.shown <= 0) || u.passive) continue;
      const w = Math.max(50, v.sprite.displayWidth * 0.9);
      const x = v.home.x - w / 2;
      const y = v.home.y + 18;
      v.bars.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 7);
      const pct = Math.max(0, v.shown);
      if (v.ghost > pct) v.bars.fillStyle(0xffffff, 0.9).fillRect(x, y, w * v.ghost, 5);
      v.bars.fillStyle(pct > 0.5 ? 0x66bb6a : pct > 0.25 ? 0xffa726 : 0xef5350, 1).fillRect(x, y, w * pct, 5);
      if (u.shield) v.bars.fillStyle(0x80deea, 1).fillRect(x, y - 3, Math.min(w, (w * u.shield.amount) / u.base.maxHp), 2);
      if (u.side === 'A' && u.base.maxMp > 0) {
        v.bars.fillStyle(0x000000, 0.6).fillRect(x - 1, y + 6, w + 2, 5);
        v.bars.fillStyle(0x42a5f5, 1).fillRect(x, y + 7, (w * Math.max(0, u.mp)) / u.base.maxMp, 3);
      }
    }
  }

  // -------------------------------------------------------------------------------------------
  // Loop: one engine step, animate its events, wait, repeat

  update(time: number) {
    this.tickVisuals();
    if (this.ring) return this.tickRing();
    if (this.finished || time < this.waitUntil) return;
    const c = this.d.combat;
    if (c.result === 'ONGOING') {
      step(c);
    } else if (this.advanceWave()) {
      for (const [id, v] of this.views) {
        if (this.partyIds.has(id)) continue;
        v.sprite.destroy();
        v.label.destroy();
        v.bars.destroy();
        v.shadow.destroy();
        v.status.destroy();
        this.views.delete(id);
      }
      this.eventIndex = 0;
      this.layout();
    } else {
      // A short victory pose before the result window.
      if (this.d.result === 'WIN' && !this.celebrated) {
        this.celebrated = true;
        this.waitUntil = time + this.celebrate();
        return;
      }
      this.finish(false);
      return;
    }
    this.stopDebt = 0;
    const busy = this.animateNew();
    this.renderTurnBar();
    // Auto-hunt can't play the timing ring: it awakens at GOOD as soon as the gauge is full.
    if (this.req.auto) {
      const me = this.d.combat.units.find((u) => u.id === this.meId);
      if (me && this.awakenAllowed && !this.awakenPending && me.hp > 0 && me.awaken >= AWAKEN_MAX) this.queueAwaken('GOOD');
    }
    this.waitUntil = time + (busy ? STEP_MS : 120) / this.speed + this.stopDebt;
    this.updateHeader();
    this.renderPanel();
  }

  private updateHeader() {
    const c = this.d.combat;
    const mod = this.d.modifiers[this.d.wave];
    const wave = this.d.waves.length > 1 ? `เวฟ ${this.d.wave + 1}/${this.d.waves.length} · ` : '';
    const title =
      this.req.run?.target.kind === 'DUNGEON' ? `${DUNGEON_BY_ID[this.req.run.target.dungeonId!]!.icon} ${DUNGEON_BY_ID[this.req.run.target.dungeonId!]!.nameTh}${this.partyIds.size > 1 ? ` · ปาร์ตี้ ${this.partyIds.size} คน` : ''}`
      : this.partyIds.size > 1 ? `⚔️ สู้กับปาร์ตี้ ${this.partyIds.size} คน`
      : this.req.kind === 'TRIAL' ? `🏛️ บททดสอบ ${CLASSES[this.req.trialClass!].nameTh}`
      : this.req.kind === 'TEST' ? '🧪 สนามทดสอบ'
      : this.req.kind === 'BOSS' ? '⚔️ ดันเจี้ยนบอส' : '⚔️ ต่อสู้';
    const limit = this.worldBossStartHp ? ` / ${WORLD_BOSS_ROUNDS}` : this.req.test?.maxRounds ? ` / ${this.req.test.maxRounds}` : '';
    this.header.setText(`${title}\n${wave}รอบ ${c.round}${limit}${mod && mod.id !== 'calm' ? `\n🌐 ${mod.nameTh}` : ''}`);
  }

  private showBanner(text: string, color = '#ffd54f') {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 200 });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1100 / this.speed, duration: 400 });
  }

  private popup(unitId: string, text: string, color: string, big = false, delay = 0, yOff = 0) {
    const v = this.views.get(unitId);
    if (!v) return;
    this.time.delayedCall(delay, () => {
      const t = this.add
        .text(v.home.x + Phaser.Math.Between(-14, 14), v.home.y - v.sprite.displayHeight * 0.7 + yOff, text, {
          fontFamily: PIXEL_FONT, fontSize: big ? '22px' : '15px', color, stroke: '#000', strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(30);
      this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    });
  }

  // -------------------------------------------------------------------------------------------
  // Game feel: time control, breathing, camera

  private setTimeScale(k: number) {
    this.time.timeScale = k;
    this.tweens.timeScale = k;
    this.anims.globalTimeScale = k;
  }

  /** Hit-stop: the whole scene freezes for `ms` real milliseconds (everything scheduled shifts with it). */
  private freeze(ms: number) {
    if (ms <= 0 || this.finished) return;
    const until = performance.now() + ms;
    if (until <= this.frozenUntil) return;
    this.frozenUntil = until;
    this.setTimeScale(0.02);
    window.setTimeout(() => {
      if (performance.now() + 2 >= this.frozenUntil) this.setTimeScale(this.slowmo ? 0.3 : 1);
    }, ms);
  }

  /** Hit-stop length for a hit (shorter at higher battle speeds so auto-hunt stays snappy). */
  private hitStopMs(crit: boolean, ult: boolean): number {
    return Math.round((ult ? 150 : crit ? 110 : 55) / Math.sqrt(this.speed));
  }

  /** Quick camera punch-in on a crit / ultimate. */
  private zoomPunch(amount = 0.05) {
    if (this.slowmo) return;
    const cam = this.cameras.main;
    cam.zoomTo(1 + amount, 60, 'Quad.easeOut', true);
    this.time.delayedCall(90, () => {
      if (!this.slowmo) cam.zoomTo(1, 220, 'Quad.easeOut', true);
    });
  }

  /** Lane for the next damage number on a unit (numbers within 350 ms fan out instead of stacking). */
  private laneFor(unitId: string): number {
    const now = this.time.now;
    const l = this.lanes.get(unitId);
    const n = l && now - l.at < 350 ? l.n + 1 : 0;
    this.lanes.set(unitId, { n: n % 5, at: now });
    return n % 5;
  }

  /** Per-frame: breathing, low-HP panting, shadows, ghost HP bars, the turn marker. */
  private tickVisuals() {
    if (!this.d) return;
    const now = this.time.now;
    const t = now / 1000;
    let dirty = false;
    for (const u of this.d.combat.units) {
      const v = this.views.get(u.id);
      if (!v) continue;
      const lift = Math.max(0, v.home.y - v.sprite.y);
      v.shadow.setPosition(v.sprite.x, v.home.y).setScale(Math.max(0.45, 1 - lift / 90)).setAlpha(v.sprite.alpha * 0.9);
      if (u.hp <= 0 && now >= v.actUntil) continue;
      const pct = Math.max(0, v.shown);
      if (v.ghost < pct) v.ghost = pct;
      else if (v.ghost > pct && now > v.ghostHoldUntil) {
        v.ghost = Math.max(pct, v.ghost - 0.01 * Math.sqrt(this.speed));
        dirty = true;
      }
      if (now < v.actUntil || u.hp <= 0) continue;
      const low = pct < 0.25 && !u.passive;
      if (v.animated) {
        v.sprite.setScale(v.baseX, v.baseY).setFrame(Math.floor(now / (low ? 220 : 480) + v.phase) % 2);
      } else {
        const b = Math.sin(t * (low ? 7 : 2.4) + v.phase) * (low ? 0.035 : 0.022);
        v.sprite.setScale(v.baseX * (1 - b * 0.4), v.baseY * (1 + b));
      }
      if (low) {
        const k = 0.5 + 0.5 * Math.sin(t * 6);
        v.sprite.setTint(Phaser.Display.Color.GetColor(255, Math.round(150 + 80 * k), Math.round(150 + 80 * k)));
      } else if (v.sprite.isTinted) v.sprite.clearTint();
    }
    if (dirty) this.drawBars();
    const av = this.activeId ? this.views.get(this.activeId) : undefined;
    if (av && av.sprite.alpha > 0.5) {
      this.marker.setVisible(true).setPosition(av.sprite.x, av.sprite.y - av.sprite.displayHeight - 14 + Math.sin(t * 7) * 3);
    } else this.marker.setVisible(false);
  }

  // -------------------------------------------------------------------------------------------
  // Awakening: gauge row, timing ring, input

  private awakenRow(me: CombatUnit): string {
    if (!this.awakenAllowed || !me.awakenable) return '';
    const pct = Math.round((me.awaken / AWAKEN_MAX) * 100);
    const full = me.awaken >= AWAKEN_MAX;
    const right = this.awakenPending
      ? '<small class="aw-wait">ปล่อยในเทิร์นถัดไป…</small>'
      : full
        ? '<button class="btn primary aw-btn" data-act="awaken">สกิลพร้อมใช้งาน!</button>'
        : `<small>${pct}%</small>`;
    return `<div class="awaken-row ${full ? 'full' : ''}"><span class="aw-label">[ระบบ] ตื่นรู้</span><span class="aw-bar"><i style="width:${pct}%"></i></span>${right}</div>`;
  }

  /** Time for the ring to close onto the target circle (the PERFECT moment). */
  private static readonly RING_MS = 900;

  private startRing() {
    const me = this.d.combat.units.find((u) => u.id === this.meId);
    if (this.ring || this.finished || this.awakenPending || !me || me.awaken < AWAKEN_MAX) return;
    const g = this.add.graphics().setDepth(85).setScrollFactor(0);
    // A full-screen DOM catcher: any tap / Space grades the press (the Phaser canvas lets taps through).
    const catcher = el(`<div class="awaken-catcher" aria-label="แตะให้ตรงจังหวะ"></div>`);
    document.getElementById('ui')!.appendChild(catcher);
    const press = (e: Event) => {
      e.preventDefault();
      this.gradeRing(performance.now());
    };
    catcher.addEventListener('pointerdown', press);
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') press(e);
    };
    window.addEventListener('keydown', key);
    const close = () => {
      catcher.remove();
      window.removeEventListener('keydown', key);
    };
    this.events.once('shutdown', close);
    this.ring = { start: performance.now(), g, close, done: false };
    this.setTimeScale(0.15);
    this.showBanner('[ระบบ] แตะเมื่อวงแหวนทับวงทอง!', '#7ff0ff');
    sfx('notice');
  }

  /** Draws the shrinking ring each frame (real time, unaffected by the slowed scene clock). */
  private tickRing() {
    const r = this.ring!;
    if (r.done) return;
    const me = this.views.get(this.meId);
    const cx = me ? me.home.x : this.scale.width / 2;
    const cy = me ? me.home.y - me.sprite.displayHeight * 0.5 : this.scale.height / 2;
    const t = (performance.now() - r.start) / BattleScene.RING_MS;
    const target = 30;
    const radius = target * (1 + 2.2 * Math.max(0, 1 - t));
    r.g.clear();
    r.g.fillStyle(0x000000, 0.35).fillRect(0, 0, this.scale.width, this.scale.height);
    r.g.lineStyle(5, 0xffd54f, 1).strokeCircle(cx, cy, target);
    r.g.lineStyle(2, 0x3a1a00, 1).strokeCircle(cx, cy, target - 4);
    r.g.lineStyle(4, 0x7ff0ff, 0.95).strokeCircle(cx, cy, radius);
    if (t > 1 + 300 / BattleScene.RING_MS) this.gradeRing(null);
  }

  private gradeRing(at: number | null) {
    const r = this.ring;
    if (!r || r.done) return;
    r.done = true;
    const perfectAt = r.start + BattleScene.RING_MS;
    const grade = awakenGrade(at === null ? null : at - perfectAt);
    r.close();
    this.tweens.add({ targets: r.g, alpha: 0, duration: 60, onComplete: () => r.g.destroy() });
    this.ring = null;
    this.setTimeScale(1);
    const color = grade === 'PERFECT' ? '#ffd54f' : grade === 'GOOD' ? '#7ff0ff' : '#b0bec5';
    this.showBanner(grade === 'PERFECT' ? 'PERFECT!!' : grade === 'GOOD' ? 'GOOD!' : 'MISS…', color);
    sfx(grade === 'PERFECT' ? 'crit' : grade === 'GOOD' ? 'buff' : 'miss');
    if (grade !== 'MISS') haptic(grade === 'PERFECT' ? 'crit' : 'tap');
    this.queueAwaken(grade);
  }

  /** Records the press as an engine input for our unit's next turn (replayable). */
  private queueAwaken(grade: AwakenGrade) {
    const me = this.d.combat.units.find((u) => u.id === this.meId);
    if (!me) return;
    addInput(this.d, { unit: this.meId, turn: me.turnsTaken, kind: 'AWAKEN', grade });
    this.awakenPending = true;
    this.lastPanel = '';
    this.renderPanel();
  }

  /** Full-width cut-in: the hero, "[ระบบ] การตื่นรู้!" and the grade. Returns its length (ms). */
  private awakenCutIn(unitId: string, grade: AwakenGrade, delay: number): number {
    const ms = Math.round(760 / Math.sqrt(this.speed));
    const v = this.views.get(unitId);
    this.time.delayedCall(delay, () => {
      // The ring's grade banner has done its job — the cut-in carries the grade now.
      this.tweens.killTweensOf(this.banner);
      this.banner.setAlpha(0);
      const { width, height } = this.scale;
      const y = height * 0.36;
      const band = this.add.rectangle(-width, y, width, 96, 0x0c0818, 0.9).setOrigin(0, 0.5).setDepth(80).setScrollFactor(0);
      const edge = this.add.rectangle(-width, y - 48, width, 3, 0x7ff0ff).setOrigin(0, 0.5).setDepth(81).setScrollFactor(0);
      const edge2 = this.add.rectangle(-width, y + 48, width, 3, 0x7ff0ff).setOrigin(0, 0.5).setDepth(81).setScrollFactor(0);
      const parts: Phaser.GameObjects.GameObject[] = [band, edge, edge2];
      if (v) {
        const face = this.add.image(-width * 0.3, y + 44, v.sprite.texture.key, v.animated ? 0 : undefined).setOrigin(0.5, 1).setDepth(82).setScrollFactor(0);
        face.setScale(Math.min(3.4, 120 / face.height));
        parts.push(face);
        this.tweens.add({ targets: face, x: width * 0.26, duration: 160, ease: 'Cubic.easeOut' });
      }
      const color = grade === 'PERFECT' ? '#ffd54f' : grade === 'GOOD' ? '#7ff0ff' : '#c8d4ff';
      const title = this.add
        .text(width * 1.2, y - 12, '[ระบบ] การตื่นรู้!', { fontFamily: PIXEL_FONT, fontSize: '26px', color: '#ffffff', stroke: '#000', strokeThickness: 6 })
        .setOrigin(0, 0.5)
        .setDepth(82)
        .setScrollFactor(0);
      const sub = this.add
        .text(width * 1.2, y + 20, grade, { fontFamily: PIXEL_FONT, fontSize: '18px', color, stroke: '#000', strokeThickness: 5 })
        .setOrigin(0, 0.5)
        .setDepth(82)
        .setScrollFactor(0);
      parts.push(title, sub);
      for (let i = 0; i < 7; i++) {
        const line = this.add.rectangle(width + i * 60, y - 40 + i * 13, 50 + i * 9, 2, 0xffffff, 0.7).setDepth(81).setScrollFactor(0);
        parts.push(line);
        this.tweens.add({ targets: line, x: -120, duration: 420, delay: i * 30, repeat: 1 });
      }
      this.tweens.add({ targets: [band, edge, edge2], x: 0, duration: 140, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: [title, sub], x: width * 0.44, duration: 180, delay: 60, ease: 'Cubic.easeOut' });
      this.cameras.main.flash(120, 127, 240, 255);
      sfx('ultimate');
      haptic('ultimate');
      this.time.delayedCall(ms - 180, () => {
        this.tweens.add({ targets: parts, alpha: 0, duration: 170, onComplete: () => parts.forEach((p) => p.destroy()) });
      });
    });
    return ms;
  }

  private renderTurnBar() {
    const c = this.d.combat;
    if (this.finished || c.result !== 'ONGOING') return this.turnBar.destroy();
    this.turnBar.render(c.queue, c.queueIndex, this.activeId, c.units, (id) => this.views.get(id)?.idleKey ?? null);
  }

  /** Final blow of the whole fight: slow motion, flash and a push-in on the victim. */
  private finalBlow(targetId: string) {
    const v = this.views.get(targetId);
    if (!v) return;
    const cam = this.cameras.main;
    this.slowmo = true;
    this.setTimeScale(0.3);
    cam.flash(140, 255, 255, 255);
    cam.zoomTo(1.14, 220, 'Quad.easeOut', true);
    cam.pan(v.home.x, v.home.y - v.sprite.displayHeight * 0.5, 220, 'Quad.easeOut', true);
    haptic('finisher');
    window.setTimeout(() => {
      this.slowmo = false;
      if (performance.now() >= this.frozenUntil) this.setTimeScale(1);
      cam.zoomTo(1, 320, 'Quad.easeInOut', true);
      cam.pan(this.scale.width / 2, this.scale.height / 2, 320, 'Quad.easeInOut', true);
    }, 950);
  }

  /** Victory pose: the party hops and sparkles, a banner — then the result window. Returns ms to wait. */
  private celebrate(): number {
    this.activeId = null;
    this.combo.break();
    let i = 0;
    for (const u of this.d.combat.units) {
      const v = this.views.get(u.id);
      if (!v || u.side !== 'A' || u.hp <= 0 || u.passive) continue;
      v.actUntil = this.time.now + 1400;
      this.tweens.add({ targets: v.sprite, y: v.home.y - 22, duration: 170, ease: 'Quad.easeOut', yoyo: true, repeat: 1, delay: i * 90 });
      this.fx('buff', u.id, 120 + i * 90, { ground: true });
      i++;
    }
    this.showBanner('VICTORY!', '#ffd54f');
    return 1100;
  }

  /** Animates events appended since the last call. Returns true if anything visible happened. */
  private animateNew(): boolean {
    const evs = this.d.combat.events;
    let visible = false;
    let delay = 0;
    const gap = 110 / this.speed;
    // The fight ends with this step → the last killing blow gets the slow-motion finish.
    this.finisherEvent = null;
    if (this.d.combat.result === 'WIN' && this.d.wave + 1 >= this.d.waves.length) {
      const dead = new Set(evs.slice(this.eventIndex).filter((x) => x.type === 'DEATH').map((x) => (x as { unit: string }).unit));
      for (let i = evs.length - 1; i >= this.eventIndex; i--) {
        const x = evs[i]!;
        if (x.type === 'DAMAGE' && dead.has(x.target)) {
          this.finisherEvent = x;
          break;
        }
      }
      if (this.finisherEvent) this.stopDebt += 950;
    }
    while (this.eventIndex < evs.length) {
      const e = evs[this.eventIndex++]!;
      if (e.type !== 'TURN' && e.type !== 'ROUND') visible = true;
      delay += this.animate(e, delay);
      if (e.type === 'DAMAGE' || e.type === 'MISS' || e.type === 'HEAL') delay += gap;
    }
    this.time.delayedCall(delay + 50, () => {
      // Settle every bar on the engine's real numbers once the turn has played out.
      for (const u of this.d.combat.units) {
        const v = this.views.get(u.id);
        if (v) v.shown = Math.max(0, u.hp / u.base.maxHp);
      }
      this.drawBars();
    });
    return visible;
  }

  /** Target of an Awakening Strike whose hit hasn't landed yet (extra-big impact). */
  private awakenStrikeOn: string | null = null;

  /** The DAMAGE event that ends the fight (slow-motion finish), if this step ends it. */
  private finisherEvent: CombatEvent | null = null;

  /** Last skill each unit used — decides how its hits look (slash vs impact). */
  private looks = new Map<string, SkillLook>();

  private anchor(unitId: string): (FxAnchor & { px: number }) | null {
    const v = this.views.get(unitId);
    return v ? { x: v.home.x, y: v.home.y, h: v.sprite.displayHeight, px: v.fxPx } : null;
  }

  private fx(key: string, unitId: string, delay = 0, opts: { ground?: boolean; scale?: number } = {}) {
    const a = this.anchor(unitId);
    if (a) playFx(this, key, a, a.px, { delay, ...opts });
  }

  /**
   * Brings a melee unit to the locked target just long enough for the hit, then returns it home.
   * This is presentation-only: target selection and combat resolution remain in the shared engine.
   */
  private lungeAtTarget(attacker: UnitView, target: UnitView, side: 'A' | 'B', delay: number): number {
    const from = { ...attacker.home };
    const direction = side === 'A' ? 1 : -1;
    const stopShort = Math.max(28, Math.min(48, (attacker.sprite.displayWidth + target.sprite.displayWidth) * 0.32));
    const landing = { x: target.home.x - direction * stopShort, y: target.home.y };
    const lift = Math.min(32, Math.max(16, 18 + Math.abs(landing.y - from.y) * 0.25));
    const approachMs = 250 / this.speed;
    const strikePauseMs = 120 / this.speed;
    const returnMs = 280 / this.speed;
    const windupMs = 90 / this.speed;
    const outbound = { progress: 0 };
    const inbound = { progress: 0 };
    const baseAngle = attacker.sprite.angle;
    const baseScaleY = attacker.baseY;
    attacker.actUntil = Math.max(attacker.actUntil, this.time.now + delay + windupMs + approachMs + strikePauseMs + returnMs + 40);
    // Anticipation: lean back and crouch before springing forward.
    this.time.delayedCall(delay, () => {
      attacker.sprite.setScale(attacker.baseX * 1.08, attacker.baseY * 0.9);
      this.tweens.add({ targets: attacker.sprite, x: from.x - direction * 7, duration: windupMs, ease: 'Quad.easeOut' });
    });
    delay += windupMs;
    /** Avatar-pack heroes swing the drawn sword instead of the effect-only swipe. */
    const slashing = attacker.slashKeys.length >= 3;

    this.tweens.add({
      targets: outbound,
      progress: 1,
      delay,
      duration: approachMs,
      ease: 'Quad.easeOut',
      onStart: () => {
        attacker.sprite.setDepth(20).setScale(attacker.baseX * 0.94, attacker.baseY * 1.08);
        // Wind up the sword on the way in; the strike frame lands with the hit.
        if (slashing) attacker.sprite.setTexture(attacker.slashKeys[0]!);
      },
      onUpdate: () => {
        const p = outbound.progress;
        attacker.sprite.setPosition(
          Phaser.Math.Linear(from.x, landing.x, p),
          Phaser.Math.Linear(from.y, landing.y, p) - Math.sin(Math.PI * p) * lift,
        );
      },
      onComplete: () => {
        if (slashing) attacker.sprite.setTexture(attacker.slashKeys[1]!);
        else if (attacker.animated) attacker.sprite.setFrame(2);
        // The drawn slash brings its own trail; only the procedural hero needs the effect.
        if (!slashing) meleeSwing(this, { x: landing.x, y: landing.y, h: attacker.sprite.displayHeight }, attacker.fxPx, direction);
        this.tweens.add({
          targets: attacker.sprite,
          angle: baseAngle + direction * (slashing ? 6 : 14),
          scaleY: baseScaleY * (slashing ? 0.96 : 0.9),
          duration: 32 / this.speed,
          hold: 56 / this.speed,
          yoyo: true,
        });
      },
    });
    this.tweens.add({
      targets: inbound,
      progress: 1,
      delay: delay + approachMs + strikePauseMs,
      duration: returnMs,
      ease: 'Quad.easeIn',
      onStart: () => {
        if (slashing) attacker.sprite.setTexture(attacker.slashKeys[2]!);
      },
      onUpdate: () => {
        const p = inbound.progress;
        attacker.sprite.setPosition(
          Phaser.Math.Linear(landing.x, from.x, p),
          Phaser.Math.Linear(landing.y, from.y, p) - Math.sin(Math.PI * p) * (lift * 0.65),
        );
      },
      onComplete: () => {
        attacker.sprite.setPosition(from.x, from.y).setAngle(baseAngle).setScale(attacker.baseX, attacker.baseY).setDepth(attacker.depth);
        if (slashing) attacker.sprite.setTexture(attacker.idleKey);
        else if (attacker.animated) attacker.sprite.setFrame(0);
      },
    });
    return windupMs + approachMs;
  }

  /** Animates one event; returns extra delay (ms) before the following events reach their target. */
  private animate(e: CombatEvent, delay: number): number {
    let lead = 0;
    switch (e.type) {
      case 'AWAKEN': {
        this.awakenPending = false;
        this.lastPanel = '';
        const v = this.views.get(e.unit);
        const target = this.views.get(e.target);
        lead = this.awakenCutIn(e.unit, e.grade, delay);
        this.stopDebt += lead;
        this.awakenStrikeOn = e.target;
        if (v && target) lead += this.lungeAtTarget(v, target, 'A', delay + lead);
        break;
      }
      case 'LINK': {
        const a = this.views.get(e.from);
        const b = this.views.get(e.unit);
        const t = this.views.get(e.target);
        if (a && b && t) {
          this.time.delayedCall(delay, () => {
            const g = this.add.graphics().setDepth(34);
            const ty = t.home.y - t.sprite.displayHeight * 0.5;
            // A gold chain from the first attacker through the second to the target.
            for (const [from, to] of [[a, t], [b, t]] as const) {
              const fy = from.home.y - from.sprite.displayHeight * 0.5;
              for (let k = 0; k <= 10; k++) {
                const x = Phaser.Math.Linear(from.home.x, to.home.x, k / 10);
                const y = Phaser.Math.Linear(fy, ty, k / 10);
                g.fillStyle(k % 2 ? 0xffd54f : 0xfff6c8, 1).fillRect(x - 3, y - 3, 6, 6);
              }
            }
            this.tweens.add({ targets: g, alpha: 0, delay: 260, duration: 300, onComplete: () => g.destroy() });
            damageNumber(this, t.home.x, t.home.y - t.sprite.displayHeight - 8, 'LINK!', { color: '#ffd54f', small: true, speed: Math.sqrt(this.speed) });
            sfx('buff');
          });
        }
        break;
      }
      case 'TURN':
        this.time.delayedCall(delay, () => {
          this.activeId = e.unit;
          this.renderTurnBar();
        });
        break;
      case 'WAVE':
        this.showBanner(`${e.wave === 1 && this.gateRank ? `[ระบบ] ประตูระดับ ${this.gateRank}\n` : ''}เวฟ ${e.wave}/${e.total}${e.modifier ? `\n${e.modifier}` : ''}`);
        sfx('wave');
        break;
      case 'SKILL': {
        const v = this.views.get(e.unit);
        const u = this.d.combat.units.find((x) => x.id === e.unit);
        if (!v || !u) break;
        const offensive = e.targets.some((t) => t !== e.unit && this.d.combat.units.find((x) => x.id === t)?.side !== u.side);
        const skill = SKILLS[e.skill];
        if (e.mp) this.popup(e.unit, `−${e.mp} MP`, '#64b5f6', false, delay, 18);
        const bossUlt = u.monsterId ? MONSTERS[u.monsterId]?.boss?.skills.find((s) => s.id === e.skill) : undefined;
        const look = skillLook(e.skill);
        this.looks.set(e.unit, look);
        const targetId = e.targets.find((t) => t !== e.unit && this.d.combat.units.find((x) => x.id === t)?.side !== u.side);
        const target = targetId ? this.views.get(targetId) : undefined;
        if (offensive && look.melee && !bossUlt && target) lead = this.lungeAtTarget(v, target, u.side, delay);
        if (look.cast) {
          this.fx(look.cast, e.unit, delay, { ground: true, scale: u.isBoss ? 1.2 : 1 });
          this.time.delayedCall(delay, () => sfx('cast'));
          if (!look.melee && v.slashKeys.length) {
            this.time.delayedCall(delay, () => {
              v.actUntil = Math.max(v.actUntil, this.time.now + 460);
              v.sprite.setTexture(v.slashKeys[0]!);
              this.time.delayedCall(440, () => {
                if (v.sprite.texture.key === v.slashKeys[0]) v.sprite.setTexture(v.idleKey);
              });
            });
          } else if (v.animated) {
            this.time.delayedCall(delay, () => {
              v.actUntil = Math.max(v.actUntil, this.time.now + 400);
              v.sprite.setFrame(2);
              this.time.delayedCall(380, () => v.sprite.setFrame(0));
            });
          }
        }
        if (look.bolt) {
          const from = this.anchor(e.unit);
          const flight = 260 / this.speed;
          for (const t of e.targets) {
            const to = this.anchor(t);
            if (from && to && t !== e.unit) this.time.delayedCall(delay, () => shootProjectile(this, look.bolt!, from, to, from.px, flight));
          }
          this.time.delayedCall(delay, () => sfx('shoot'));
          lead = flight;
        }
        if (bossUlt) {
          this.cameras.main.shake(320, 0.014);
          this.showBanner(`${u.name}\n${bossUlt.nameTh}!`, '#ff6b6b');
          sfx('ultimate');
          haptic('ultimate');
          const stop = this.hitStopMs(false, true);
          this.stopDebt += stop;
          this.time.delayedCall(delay, () => {
            this.zoomPunch(0.08);
            this.freeze(stop);
          });
        } else if (skill) {
          const tag = e.reactive === 'ASSIST' ? '⚡ ' : e.reactive === 'COUNTER' ? '↩ ' : e.reactive ? '✦ ' : '';
          // Skill names float above the sprite so they don't collide with damage/heal numbers.
          this.popup(e.unit, `${tag}${skill.nameTh}`, '#ffa726', false, delay, -v.sprite.displayHeight * 0.45);
        }
        break;
      }
      case 'DAMAGE': {
        const v = this.views.get(e.target);
        const a = this.anchor(e.target);
        const victim = this.d.combat.units.find((x) => x.id === e.target);
        const attacker = this.d.combat.units.find((x) => x.id === e.source);
        const stop = this.hitStopMs(e.crit, false);
        const finale = this.finisherEvent === e;
        this.stopDebt += stop;
        if (v && a) {
          this.time.delayedCall(delay, () => {
            const lane = this.laneFor(e.target);
            damageNumber(this, v.home.x, v.home.y - v.sprite.displayHeight * 0.72, `${e.amount}${e.block ? ' 🛡' : ''}`, {
              color: e.block ? '#9ad0ff' : ELEMENT_COLOR[e.element],
              crit: e.crit,
              lane,
              speed: Math.sqrt(this.speed),
            });
            // Hurt: white flash, squash, knock-back away from the attacker.
            v.actUntil = Math.max(v.actUntil, this.time.now + 260);
            v.ghostHoldUntil = this.time.now + 380;
            if (victim) v.shown = Math.max(0, v.shown - e.amount / victim.base.maxHp);
            this.drawBars();
            v.sprite.setTintFill(0xffffff);
            this.time.delayedCall(70, () => v.sprite.clearTint());
            // Hurt pose: the monster's flinch frame, or the hero's lean-back copy.
            if (v.animated) {
              v.sprite.setFrame(3);
              this.time.delayedCall(240, () => v.sprite.setFrame(0));
            } else if (v.hurtKey && v.sprite.texture.key === v.idleKey) {
              v.sprite.setTexture(v.hurtKey);
              this.time.delayedCall(240, () => {
                if (v.sprite.texture.key === v.hurtKey) v.sprite.setTexture(v.idleKey);
              });
            }
            const src = this.views.get(e.source);
            const dir = src && src.home.x < v.home.x ? 1 : -1;
            this.tweens.add({ targets: v.sprite, x: v.home.x + dir * (e.crit ? 16 : 8), yoyo: true, duration: 80, ease: 'Quad.easeOut' });
            v.sprite.setScale(v.baseX * 1.12, v.baseY * 0.84);
            this.tweens.add({ targets: v.sprite, scaleX: v.baseX, scaleY: v.baseY, duration: 220, ease: 'Back.easeOut' });
            const frac = victim ? e.amount / victim.base.maxHp : 0.1;
            this.cameras.main.shake(e.crit ? 170 : 110, Math.min(0.02, 0.003 + frac * 0.035));
            if (attacker?.side === 'A') this.combo.hit();
            else this.combo.break();
            if (e.crit) {
              this.zoomPunch();
              if (e.source === this.meId || e.target === this.meId) haptic('crit');
            } else if (e.target === this.meId) haptic('hit');
            if (this.awakenStrikeOn === e.target && attacker?.id === this.meId) {
              this.awakenStrikeOn = null;
              this.fx('holy', e.target, 0, { scale: 1.4 });
              this.fx('crit', e.target, 40, { scale: 1.3 });
              this.cameras.main.shake(260, 0.022);
              this.zoomPunch(0.1);
            }
            if (finale) this.finalBlow(e.target);
            else this.freeze(stop);
          });
          const look = this.looks.get(e.source);
          hitFx(this, a, a.px, { element: e.element, crit: e.crit, block: e.block, melee: look?.melee ?? true, delay });
        }
        break;
      }
      case 'MISS':
        this.popup(e.target, 'MISS', '#b0bec5', false, delay);
        this.time.delayedCall(delay, () => sfx('miss'));
        break;
      case 'HEAL':
        this.popup(e.target, `+${e.amount}`, '#69f0ae', false, delay);
        this.fx('heal', e.target, delay, { ground: true });
        this.time.delayedCall(delay, () => sfx('heal'));
        break;
      case 'TICK':
        this.popup(e.target, `${e.amount}`, e.status === 'POISON' ? '#b388ff' : '#ff8a65');
        if (e.status === 'POISON' || e.status === 'BURN') this.fx(e.status === 'POISON' ? 'poison' : 'fire', e.target, 0, { ground: true, scale: 0.6 });
        if (e.status === 'BLEED') this.fx('slash_red', e.target, 0, { scale: 0.6 });
        break;
      case 'STATUS': {
        this.popup(e.target, STATUS_TH[e.status] ?? e.status, '#ffd54f', false, delay);
        const a = this.anchor(e.target);
        if (a) statusFx(this, a, a.px, e.status, delay + 60);
        break;
      }
      case 'SKIP':
        this.popup(e.unit, STATUS_TH[e.reason] ?? 'ข้ามเทิร์น', '#90caf9');
        this.fx(e.reason === 'FREEZE' ? 'ice' : 'stun', e.unit, 0, { scale: 0.8 });
        break;
      case 'SHIELD':
        this.popup(e.target, '🛡 SHIELD', '#80deea');
        this.fx('shield', e.target, delay);
        this.time.delayedCall(delay, () => sfx('shield'));
        break;
      case 'BUFF': {
        const amount = e.flat !== undefined
          ? `${e.flat >= 0 ? '+' : ''}${e.flat}`
          : `${Math.round((e.pct ?? 0) * 100)}%`;
        const up = (e.flat ?? e.pct ?? 0) >= 0;
        this.popup(e.target, `${String(e.stat).toUpperCase()} ${amount}`, up ? '#a5d6a7' : '#ef9a9a');
        this.fx(up ? 'buff' : 'debuff', e.target, delay, { ground: up });
        this.time.delayedCall(delay, () => sfx(up ? 'buff' : 'debuff'));
        break;
      }
      case 'COVER':
        this.popup(e.unit, '🛡 COVER', '#4dabf7', true);
        this.fx('shield', e.unit, delay);
        sfx('block');
        break;
      case 'ITEM': {
        const mp = e.item === 'blue_elixir';
        this.popup(e.unit, `${CONSUMABLES[e.item]?.nameTh ?? 'ยา'} +${e.amount}${mp ? ' MP' : ''}`, mp ? '#64b5f6' : '#80deea');
        this.fx(mp ? 'mana' : 'heal', e.unit, 0, { ground: true });
        sfx('heal');
        break;
      }
      case 'RECOVER':
        this.popup(e.unit, `+${e.amount}`, '#69f0ae');
        this.fx('heal', e.unit, 0, { ground: true, scale: 0.7 });
        break;
      case 'BLOCK_ULT':
        this.popup(e.unit, 'BLOCK!', '#4dabf7', true);
        this.fx('shield', e.unit, delay, { scale: 1.2 });
        sfx('block');
        break;
      case 'MIRACLE':
        this.popup(e.unit, 'MIRACLE!', '#ffd43b', true);
        this.fx('holy', e.unit, delay, { ground: true });
        sfx('holy');
        break;
      case 'PHASE':
        riftBreak(this, this.stageLayer);
        haptic('ultimate');
        this.showBanner(e.message, '#ff8a80');
        this.fx('cast_fire', e.unit, 0, { ground: true, scale: 1.4 });
        sfx('ultimate');
        break;
      case 'ENRAGE':
        this.showBanner('⚠️ บอสคลั่ง! (Enrage)', '#ff5252');
        this.fx('buff', e.unit, 0, { ground: true, scale: 1.4 });
        sfx('ultimate');
        break;
      case 'SUMMON':
        this.layout();
        this.fx('smoke', e.unit, 0);
        sfx('cast');
        break;
      case 'DEATH': {
        const v = this.views.get(e.unit);
        const u = this.d.combat.units.find((x) => x.id === e.unit);
        const sp = Math.sqrt(this.speed);
        if (v && u) {
          this.time.delayedCall(delay + 60, () => {
            v.actUntil = Number.MAX_SAFE_INTEGER;
            if (this.activeId === e.unit) this.activeId = null;
            this.tweens.add({ targets: v.label, alpha: 0, duration: 300 });
            if (u.side === 'B') {
              // Monsters blink, burst into their own pixels and drop coins.
              shatter(this, v.sprite, v.fxPx, sp);
              if (!u.passive) coinBurst(this, v.home.x, v.home.y, u.isBoss ? 6 : 3, v.fxPx, sp, () => sfx('coin'));
            } else {
              // Our side collapses instead.
              this.tweens.add({ targets: v.sprite, angle: -80, alpha: 0.35, duration: 380, ease: 'Quad.easeIn' });
              this.fx('smoke', e.unit, 120);
              if (e.unit === this.meId) haptic('down');
            }
          });
        }
        this.time.delayedCall(delay + 120, () => sfx('death'));
        break;
      }
      default:
        break;
    }
    return lead;
  }

  // -------------------------------------------------------------------------------------------
  // DOM panel: deck with launch rates, speed, skip, flee

  private lastPanel = '';

  private renderPanel() {
    const me = this.d.combat.units.find((u) => u.id === this.meId);
    if (!me) {
      // Knocked out in an earlier wave: the party fights on without us.
      const html = `<div class="battle-vitals"><span class="hp">${uiIcon('skull', true)}หมดสติ — รอเพื่อนสู้ต่อ</span><span class="spacer"></span>
        <button class="chip" data-act="speed">${this.speed}×</button><button class="chip" data-act="skip">⏭ ข้าม</button></div>`;
      if (html === this.lastPanel) return;
      this.lastPanel = html;
      this.panel.innerHTML = html;
      this.wirePanelButtons();
      return;
    }
    const bag = me.bag ?? this.d.combat.items;
    const deck = me.deck.map((id) => {
      const sk = SKILLS[id]!;
      const cd = Math.max(0, (me.cooldowns[id] ?? 0) - 1);
      return `<div class="deck-slot ${sk.kind === 'REACTIVE' ? 'reactive' : ''} ${cd ? 'cd' : ''}">
        <img class="ds-ico" src="/assets/skills/${sk.id}.png" alt="" /><span><b>${esc(sk.nameTh)}</b><small>${sk.rate}%${cd ? ` · CD ${cd}` : ''}</small></span>
        ${cd ? `<i class="ds-cd">${cd}</i>` : ''}</div>`;
    });
    const html = `
      <div class="battle-vitals">
        <span class="hp">HP ${Math.max(0, Math.round(me.hp))}/${Math.round(me.base.maxHp)}</span>
        <span class="mp">MP ${Math.round(me.mp)}/${Math.round(me.base.maxMp)}</span>
        <span class="pot">${this.req.kind === 'TEST' ? 'ยาทดสอบ' : 'ยา'} HP ${bag.red_potion ?? 0} · MP ${bag.blue_elixir ?? 0}</span>
        <span class="spacer"></span>
        <button class="chip" data-act="speed">${this.speed}×</button>
        <button class="chip" data-act="skip">⏭ ข้าม</button>
        ${(this.req.kind === 'FIELD' && !this.req.auto && this.partyIds.size < 2) || this.req.kind === 'TEST' ? '<button class="chip" data-act="flee">ออก</button>' : ''}
      </div>
      ${this.awakenRow(me)}
      <div class="deck-row">${deck.join('') || '<small>ยังไม่มีสกิลในชุด — ใช้โจมตีธรรมดา</small>'}</div>
      <div class="battle-hint">ต่อสู้อัตโนมัติ · ระบบสุ่มใช้สกิลจากชุดตาม % ทุกเทิร์น</div>`;
    if (html === this.lastPanel) return;
    this.lastPanel = html;
    this.panel.innerHTML = html;
    this.wirePanelButtons();
  }

  private wirePanelButtons() {
    this.panel.querySelector('[data-act="speed"]')?.addEventListener('click', () => {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1;
      localStorage.setItem('pw.battleSpeed', String(this.speed));
      this.lastPanel = '';
      this.renderPanel();
    });
    this.panel.querySelector('[data-act="skip"]')?.addEventListener('click', () => this.skipToEnd());
    this.panel.querySelector('[data-act="awaken"]')?.addEventListener('click', () => this.startRing());
    this.panel.querySelector('[data-act="flee"]')?.addEventListener('click', () => this.finish(true));
  }

  /** Archives the finished wave's events (for the arena report) and starts the next wave if any. */
  private advanceWave(): boolean {
    this.allEvents.push(...this.d.combat.events);
    this.currentArchived = true;
    const more = nextWave(this.d);
    if (more) this.currentArchived = false;
    return more;
  }

  private skipToEnd() {
    if (this.finished) return;
    do runToEnd(this.d.combat);
    while (this.advanceWave());
    this.eventIndex = this.d.combat.events.length;
    this.finish(false);
  }

  // -------------------------------------------------------------------------------------------
  // End

  private finish(fled: boolean) {
    if (this.finished) return;
    this.finished = true;
    if (this.ring) {
      this.ring.close();
      this.ring.g.destroy();
      this.ring = null;
    }
    this.slowmo = false;
    this.setTimeScale(1);
    this.marker.setVisible(false);
    music(null);
    sfx(fled ? 'close' : this.d.result === 'WIN' ? 'victory' : 'defeat');
    if (this.req.kind === 'TEST') return this.showTestReport(fled);
    const c = this.d.combat;
    const me = memberState(this.d, this.meId);
    const boss = c.units.find((u) => u.isBoss);
    const windowOver = !!this.worldBossStartHp && c.result === 'LOSE' && (me?.hp ?? 0) > 0;
    const result = fled || windowOver ? 'FLED' : this.d.result === 'WIN' ? 'WIN' : 'LOSE';
    const potions = me?.items ?? c.items;

    const outcome = applyBattleOutcome({
      result,
      defeated: this.d.defeated,
      itemsLeft: { ...store.s.bag, red_potion: potions.red_potion ?? 0, blue_elixir: potions.blue_elixir ?? 0 },
      // Party runs: personal loot — each member rolls their own drops.
      rng: createRng(this.req.run ? memberLootSeed(this.d.seed, this.meId) : this.d.seed ^ 0x9e3779b9),
      landmark: this.req.landmark,
      kind: this.req.kind,
      spawn: this.req.spawn,
      worldBoss:
        this.worldBossStartHp && boss
          ? { remainingHp: Math.max(0, Math.round(boss.hp)), damage: Math.round(this.worldBossStartHp - boss.hp), maxHp: boss.base.maxHp }
          : undefined,
    });

    if (this.req.kind === 'TRIAL' && result === 'WIN' && this.req.trialClass) {
      changeClass(this.req.trialClass);
      toast(`ยินดีด้วย! คุณคือ ${CLASSES[this.req.trialClass].nameTh} แล้ว`, 'good');
    }
    this.showResult(outcome, windowOver);
  }

  /** Collects events from every wave played in this arena run. */
  private allEvents: CombatEvent[] = [];
  private currentArchived = false;

  private showTestReport(fled: boolean) {
    const won = this.d.result === 'WIN';
    const dummy = this.d.combat.units.filter((u) => u.side === 'B').every((u) => u.passive);
    const st = deckStats(this.currentArchived ? this.allEvents : this.allEvents.concat(this.d.combat.events), this.meId);
    const rows = Object.entries(st.skills)
      .sort((a, b) => b[1].uses - a[1].uses)
      .map(([id, v]) => `<tr><td>${esc(SKILLS[id]?.nameTh ?? MONSTERS[id]?.nameTh ?? id)}</td><td>${v.uses}</td><td>${v.damage.toLocaleString()}</td></tr>`)
      .join('');
    const modal = el(`<div class="modal-backdrop"><div class="modal result">
      <h2>${uiIcon('swords', true)}${fled ? 'ออกจากสนาม' : dummy ? 'ครบเวลา' : won ? 'ชนะ' : 'แพ้'} — ${st.rounds} รอบ</h2>
      <p>ดาเมจที่ทำ <b>${st.dealt.toLocaleString()}</b> (เฉลี่ย <b>${Math.round(st.dealt / Math.max(1, st.rounds)).toLocaleString()}</b>/รอบ)
        · ที่ได้รับ <b>${st.taken.toLocaleString()}</b> · ฟื้นฟู <b>${st.healed.toLocaleString()}</b> · ใช้ MP <b>${st.mpUsed.toLocaleString()}</b></p>
      <p>โดน ${st.hits} · Critical ${st.crits} (${Math.round((st.crits / Math.max(1, st.hits)) * 100)}%) · Miss ${st.misses}
        ${Object.keys(st.statuses).length ? ` · สถานะ: ${Object.entries(st.statuses).map(([k, n]) => `${STATUS_TH[k] ?? k} ×${n}`).join(', ')}` : ''}</p>
      <table class="deck-stats"><tr><th>สกิล</th><th>ครั้ง</th><th>ดาเมจ</th></tr>${rows}</table>
      <p class="muted">สนามทดสอบ: เริ่ม HP/MP เต็ม ใช้ยาทดสอบ (HP 5 · MP 5) ไม่แตะของในกระเป๋า ไม่ได้รางวัล${dummy ? ' · พิษ/เลือดไหลกับหุ่นคิดจาก HP 1,000' : ''}</p>
      <button class="btn" data-act="again">สู้ซ้ำ</button>
      <button class="btn primary" data-act="close">กลับสู่แผนที่</button></div></div>`);
    document.getElementById('ui')!.appendChild(modal);
    const close = (again: boolean) => {
      modal.remove();
      const req = this.req;
      this.scene.stop();
      this.scene.resume('World');
      bus.emit('battle:end');
      if (again) window.setTimeout(() => bus.emit('battle:start', req), 150);
    };
    modal.querySelector('[data-act="close"]')!.addEventListener('click', () => close(false));
    modal.querySelector('[data-act="again"]')!.addEventListener('click', () => close(true));
  }

  private showResult(o: BattleOutcome, retreat: boolean) {
    const knocked = !retreat && o.result === 'FLED' && o.worldBossDamage !== undefined;
    const gate = this.req.kind === 'BOSS' || this.req.kind === 'DUNGEON';
    const title = retreat ? 'หมดเวลาโจมตี' : knocked ? 'ถูกตีกระเด็นออกมา!'
      : o.result === 'WIN' ? (gate && !o.worldBossDamage ? `${uiIcon('gate')}ปิดประตูมิติสำเร็จ!` : `${uiIcon('star')}ชนะ!`)
      : o.result === 'LOSE' ? `${uiIcon('skull')}พ่ายแพ้…` : 'ถอนตัว';
    const quests = (o.questsDone ?? []).map((q) => `<li class="sys-q">[ระบบ] เควสสำเร็จ: ${esc(dailyTitle(q))}</li>`).join('');
    const items = Object.entries(o.loot.items).map(([id, n]) => `<li>${esc(itemName(id))} ×${n}</li>`).join('');
    const body =
      o.result === 'WIN'
        ? `<p>+${o.loot.exp.toLocaleString()} EXP · +${o.loot.gold.toLocaleString()} Gold</p>
           ${o.levelsGained ? `<p class="good">เลเวลอัป +${o.levelsGained}!</p>` : ''}
           ${items ? `<ul class="loot">${items}</ul>` : ''}
           ${quests ? `<ul class="loot">${quests}</ul>` : ''}`
        : o.result === 'LOSE'
          ? `<p class="bad">ชุดเกราะพังทั้งหมด (Durability 0)</p><p class="bad">เสีย ${o.goldLost.toLocaleString()} Gold ที่ถืออยู่</p><p>EXP ไม่ลด — ลองปรับชุดสกิล/Build ใหม่ได้เลย!</p>`
          : '';
    const wb = o.worldBossDamage ? `<p>สร้างความเสียหายให้บอสโลก ${o.worldBossDamage.toLocaleString()} — HP บอสถูกบันทึกไว้ให้คนต่อไป</p>` : '';

    const hunting = this.req.auto && autoHunt.enabled;
    if (this.req.auto) autoHunt.onBattleResult(o.result);
    const autoClose = hunting && o.result !== 'LOSE';
    const modal = el(`<div class="modal-backdrop"><div class="modal result">
      <h2>${title}</h2>${body}${wb}
      ${autoClose ? '<p class="muted">🤖 ล่าอัตโนมัติ — ไปตัวถัดไป…</p>' : ''}
      <button class="btn primary" data-act="close">กลับสู่แผนที่</button></div></div>`);
    document.getElementById('ui')!.appendChild(modal);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      modal.remove();
      this.scene.stop();
      this.scene.resume('World');
      bus.emit('battle:end');
    };
    modal.querySelector('[data-act="close"]')!.addEventListener('click', close);
    if (autoClose) window.setTimeout(close, 1300);
  }
}

/** Test arena report: no rewards/penalties, but per-skill stats to evaluate a deck. */
export interface DeckStats {
  rounds: number;
  dealt: number;
  taken: number;
  healed: number;
  crits: number;
  misses: number;
  mpUsed: number;
  hits: number;
  statuses: Record<string, number>;
  skills: Record<string, { uses: number; damage: number }>;
}

export function deckStats(events: CombatEvent[], meId: string): DeckStats {
  const st: DeckStats = { rounds: 0, dealt: 0, taken: 0, healed: 0, crits: 0, misses: 0, mpUsed: 0, hits: 0, statuses: {}, skills: {} };
  let current = '';
  for (const e of events) {
    if (e.type === 'ROUND') st.rounds++;
    if (e.type === 'SKILL' && e.unit === meId) {
      current = e.skill;
      st.mpUsed += e.mp ?? 0;
      (st.skills[current] ??= { uses: 0, damage: 0 }).uses++;
    } else if (e.type === 'SKILL') current = '';
    if (e.type === 'DAMAGE' && e.source === meId) {
      st.dealt += e.amount;
      st.hits++;
      if (e.crit) st.crits++;
      if (current) st.skills[current]!.damage += e.amount;
    }
    if (e.type === 'MISS' && e.source === meId) st.misses++;
    if (e.type === 'STATUS' && e.target !== meId && current) st.statuses[e.status] = (st.statuses[e.status] ?? 0) + 1;
    if (e.type === 'TICK' && e.target !== meId) st.dealt += e.amount;
    if (e.type === 'DAMAGE' && e.target === meId) st.taken += e.amount;
    if (e.type === 'HEAL' && e.target === meId) st.healed += e.amount;
  }
  return st;
}

function itemName(id: string): string {
  return sharedItemName(id);
}
