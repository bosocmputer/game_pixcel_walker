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
  type CombatEvent,
  type CombatUnit,
  type Dungeon,
  type UnitSetup,
  type WaveDef,
} from '@pw/shared';
import { heroCanvas, monsterCanvas, type HairStyle, type Paperdoll } from '../game/art';
import { hasPixelSprite } from '../game/sprites';
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

  constructor() {
    super('Battle');
  }

  preload() {
    preloadFx(this);
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
    const g = this.add.graphics();
    g.fillGradientStyle(0x2b3a67, 0x2b3a67, 0x1b1f2a, 0x1b1f2a, 1).fillRect(0, 0, width, height * 0.5);
    g.fillStyle(0x3d5a3a, 1).fillRect(0, height * 0.5, width, height * 0.5);
    for (let i = 0; i < 60; i++) g.fillStyle(0x4a6b45, 1).fillRect(Math.random() * width, height * 0.5 + Math.random() * height * 0.5, 4, 3);

    this.header = this.add.text(width / 2, 12, '', { fontFamily: PIXEL_FONT, fontSize: '15px', color: '#fff', stroke: '#000', strokeThickness: 4, align: 'center' }).setOrigin(0.5, 0).setDepth(50);
    this.banner = this.add.text(width / 2, height * 0.3, '', { fontFamily: PIXEL_FONT, fontSize: '22px', color: '#ffd54f', stroke: '#000', strokeThickness: 5, align: 'center', wordWrap: { width: width - 40 } }).setOrigin(0.5).setDepth(60).setAlpha(0);

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
          const y = height * (0.44 + ((i + 0.5) / Math.max(group.length, 1)) * 0.22 - 0.11 + (row === 'BACK' ? -0.02 : 0));
          const x = width * colX + (i % 2 ? (side === 'A' ? -14 : 14) : 0);
          let v = this.views.get(u.id);
          if (!v) v = this.addView(u, u.isBoss ? scale + 2 : scale);
          v.home = { x, y };
          if (u.hp > 0) v.sprite.setPosition(x, y).setAlpha(1);
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
      if (!this.textures.exists(key)) this.textures.addCanvas(key, monsterCanvas(u.sprite));
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
    const sprite = this.add.image(0, 0, key).setScale(finalScale).setOrigin(origin.x, origin.y).setDepth(10).setFlipX(u.side === 'B');
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
    const v = {
      sprite,
      label,
      bars,
      home: { x: 0, y: 0 },
      fxPx: Math.max(2, scale - 1) + (u.isBoss ? 1 : 0),
      idleKey: key,
      slashKeys,
    };
    this.views.set(u.id, v);
    return v;
  }

  private drawBars() {
    for (const u of this.d.combat.units) {
      const v = this.views.get(u.id);
      if (!v) continue;
      v.bars.clear();
      if (u.hp <= 0 || u.passive) continue;
      const w = Math.max(50, v.sprite.displayWidth * 0.9);
      const x = v.home.x - w / 2;
      const y = v.home.y + 18;
      v.bars.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 7);
      const pct = u.hp / u.base.maxHp;
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
        this.views.delete(id);
      }
      this.eventIndex = 0;
      this.layout();
    } else {
      this.finish(false);
      return;
    }
    const busy = this.animateNew();
    this.waitUntil = time + (busy ? STEP_MS : 120) / this.speed;
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

  /** Animates events appended since the last call. Returns true if anything visible happened. */
  private animateNew(): boolean {
    const evs = this.d.combat.events;
    let visible = false;
    let delay = 0;
    const gap = 110 / this.speed;
    while (this.eventIndex < evs.length) {
      const e = evs[this.eventIndex++]!;
      if (e.type !== 'TURN' && e.type !== 'ROUND') visible = true;
      delay += this.animate(e, delay);
      if (e.type === 'DAMAGE' || e.type === 'MISS' || e.type === 'HEAL') delay += gap;
    }
    this.time.delayedCall(delay + 50, () => this.drawBars());
    return visible;
  }

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
    const outbound = { progress: 0 };
    const inbound = { progress: 0 };
    const baseAngle = attacker.sprite.angle;
    const baseScaleY = attacker.sprite.scaleY;
    /** Avatar-pack heroes swing the drawn sword instead of the effect-only swipe. */
    const slashing = attacker.slashKeys.length >= 3;

    this.tweens.add({
      targets: outbound,
      progress: 1,
      delay,
      duration: approachMs,
      ease: 'Quad.easeOut',
      onStart: () => {
        attacker.sprite.setDepth(20);
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
        attacker.sprite.setPosition(from.x, from.y).setAngle(baseAngle).setScale(attacker.sprite.scaleX, baseScaleY).setDepth(10);
        if (slashing) attacker.sprite.setTexture(attacker.idleKey);
      },
    });
    return approachMs;
  }

  /** Animates one event; returns extra delay (ms) before the following events reach their target. */
  private animate(e: CombatEvent, delay: number): number {
    let lead = 0;
    switch (e.type) {
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
          this.cameras.main.shake(250, 0.01);
          this.showBanner(`${u.name}\n${bossUlt.nameTh}!`, '#ff6b6b');
          sfx('ultimate');
        } else if (skill) {
          const tag = e.reactive === 'ASSIST' ? '⚡ ' : e.reactive === 'COUNTER' ? '↩ ' : e.reactive ? '✦ ' : '';
          // Skill names float above the sprite so they don't collide with damage/heal numbers.
          this.popup(e.unit, `${tag}${skill.nameTh}`, '#ffa726', false, delay, -v.sprite.displayHeight * 0.45);
        }
        break;
      }
      case 'DAMAGE': {
        this.popup(e.target, `${e.amount}${e.crit ? '!' : ''}${e.block ? '🛡' : ''}`, e.crit ? '#ffeb3b' : '#ffffff', e.crit, delay);
        const v = this.views.get(e.target);
        const a = this.anchor(e.target);
        if (v && a) {
          this.time.delayedCall(delay, () => {
            v.sprite.setTintFill(0xffffff);
            this.time.delayedCall(70, () => v.sprite.clearTint());
            // Knock-back away from the attacker.
            const src = this.views.get(e.source);
            const dir = src && src.home.x < v.home.x ? 1 : -1;
            this.tweens.add({ targets: v.sprite, x: v.home.x + dir * (e.crit ? 12 : 6), yoyo: true, duration: 70 });
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
        this.cameras.main.flash(300, 255, 80, 80);
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
        if (v) this.time.delayedCall(delay, () => this.tweens.add({ targets: [v.sprite, v.label], alpha: 0, duration: 350 }));
        this.fx('smoke', e.unit, delay + 120);
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
