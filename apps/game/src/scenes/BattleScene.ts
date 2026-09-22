/**
 * Party auto-battle scene (Pockie Ninja style): side-view formation, player party on the left,
 * monsters on the right. The shared engine resolves one unit turn per step; this scene only
 * animates the resulting events. Fights are dungeons of 1..N waves.
 */
import Phaser from 'phaser';
import {
  CLASSES,
  CONSUMABLES,
  DUNGEON_BY_ID,
  EQUIPMENT,
  MONSTERS,
  SKILLS,
  createDungeon,
  createRng,
  landmarkWaves,
  memberLootSeed,
  memberState,
  nextWave,
  runToEnd,
  step,
  type CombatEvent,
  type CombatUnit,
  type Dungeon,
  type UnitSetup,
  type WaveDef,
} from '@pw/shared';
import { heroCanvas, monsterCanvas, type HairStyle, type Paperdoll } from '../game/art';
import { bus, toast, type BattleRequest } from '../game/bus';
import { applyBattleOutcome, bossIdFor, changeClass, worldBossHp, type BattleOutcome } from '../game/rules';
import { playerSetup } from '../game/party';
import { store } from '../state/store';
import { el, esc } from '../ui/dom';
import { autoHunt } from '../game/autohunt';

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
  private panel!: HTMLElement;
  private header!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  init(req: BattleRequest) {
    this.req = req;
    this.meId = req.dungeon?.meId ?? 'me';
    this.partyIds = new Set([this.meId, ...(req.dungeon?.entrants.map((e) => e.setup.id) ?? [])]);
    this.views.clear();
    this.eventIndex = 0;
    this.waitUntil = 0;
    this.finished = false;
    this.worldBossStartHp = 0;
    this.lastPanel = '';
    this.allEvents = [];
    this.currentArchived = false;
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

    // The test arena never touches real resources: full HP/MP and its own potion kit.
    const items: Record<string, number> = test ? { ...TEST_KIT } : {};
    if (!test && s.bag.red_potion) items.red_potion = s.bag.red_potion;
    if (!test && s.bag.blue_elixir) items.blue_elixir = s.bag.blue_elixir;
    const me = playerSetup(s);
    if (test) {
      me.hp = me.stats.maxHp;
      me.mp = me.stats.maxMp;
    }
    let party: UnitSetup[] = [me];
    let seed = (Math.random() * 2 ** 31) | 0;
    const run = this.req.dungeon;
    if (run) {
      // Everyone builds the run from the same server-issued data; each brings their own potions.
      waves = DUNGEON_BY_ID[run.id]!.waves;
      rollModifiers = true;
      party = run.entrants.map((e) => ({ ...e.setup }));
      seed = run.seed;
      delete items.red_potion;
      delete items.blue_elixir;
    }
    this.d = createDungeon({
      party,
      waves,
      seed,
      items,
      rollModifiers,
      bossHp,
      maxRounds,
      enemyScale: test ? { hp: test.hpMult, atk: test.atkMult } : undefined,
      noBossScaling: !!test,
    });

    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x2b3a67, 0x2b3a67, 0x1b1f2a, 0x1b1f2a, 1).fillRect(0, 0, width, height * 0.5);
    g.fillStyle(0x3d5a3a, 1).fillRect(0, height * 0.5, width, height * 0.5);
    for (let i = 0; i < 60; i++) g.fillStyle(0x4a6b45, 1).fillRect(Math.random() * width, height * 0.5 + Math.random() * height * 0.5, 4, 3);

    this.header = this.add.text(width / 2, 12, '', { fontFamily: 'Mali', fontSize: '15px', color: '#fff', stroke: '#000', strokeThickness: 4, align: 'center' }).setOrigin(0.5, 0).setDepth(50);
    this.banner = this.add.text(width / 2, height * 0.3, '', { fontFamily: 'Mali', fontSize: '22px', color: '#ffd54f', stroke: '#000', strokeThickness: 5, align: 'center', wordWrap: { width: width - 40 } }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.layout();
    this.panel = el(`<div class="battle-panel"></div>`);
    document.getElementById('ui')!.appendChild(this.panel);
    document.body.classList.add('in-battle');
    this.events.once('shutdown', () => {
      this.panel.remove();
      document.body.classList.remove('in-battle');
    });
    this.renderPanel();
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
    const ally = this.req.dungeon?.entrants.find((e) => e.setup.id === u.id && u.id !== this.meId);
    if (ally) {
      const l = ally.look;
      const doll: Paperdoll = { ...l, appearance: { ...l.appearance, hairStyle: l.appearance.hairStyle as HairStyle } };
      key = `hero_${JSON.stringify(doll)}_side_0`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, heroCanvas(doll, 'side', 0));
    } else if (u.side === 'A') {
      const down = (this.scene.get('World').registry.get('heroKey') as string) ?? 'hero';
      key = down.replace(/_down_0$/, '_side_0');
      if (!this.textures.exists(key)) key = down;
    } else {
      key = `mob_${u.sprite}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, monsterCanvas(u.sprite));
    }
    const sprite = this.add.image(0, 0, key).setScale(scale).setOrigin(0.5, 1).setDepth(10).setFlipX(u.side === 'B');
    const label = this.add
      .text(0, 0, u.passive ? `${u.name} (HP ∞)` : `${u.name} Lv.${u.level}`, { fontFamily: 'Mali', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0)
      .setDepth(11);
    const bars = this.add.graphics().setDepth(11);
    const v = { sprite, label, bars, home: { x: 0, y: 0 } };
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
      this.req.dungeon ? `${DUNGEON_BY_ID[this.req.dungeon.id]!.icon} ${DUNGEON_BY_ID[this.req.dungeon.id]!.nameTh}${this.partyIds.size > 1 ? ` · ปาร์ตี้ ${this.partyIds.size} คน` : ''}`
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
          fontFamily: 'Silkscreen', fontSize: big ? '22px' : '15px', color, stroke: '#000', strokeThickness: 4,
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
      this.animate(e, delay);
      if (e.type === 'DAMAGE' || e.type === 'MISS' || e.type === 'HEAL') delay += gap;
    }
    this.time.delayedCall(delay + 50, () => this.drawBars());
    return visible;
  }

  private animate(e: CombatEvent, delay: number) {
    switch (e.type) {
      case 'WAVE':
        this.showBanner(`เวฟ ${e.wave}/${e.total}${e.modifier ? `\n${e.modifier}` : ''}`);
        break;
      case 'SKILL': {
        const v = this.views.get(e.unit);
        const u = this.d.combat.units.find((x) => x.id === e.unit);
        if (!v || !u) break;
        const dir = u.side === 'A' ? 1 : -1;
        const offensive = e.targets.some((t) => t !== e.unit && this.d.combat.units.find((x) => x.id === t)?.side !== u.side);
        if (offensive) this.tweens.add({ targets: v.sprite, x: v.home.x + dir * 36, yoyo: true, duration: 120 / this.speed });
        const skill = SKILLS[e.skill];
        if (e.mp) this.popup(e.unit, `−${e.mp} MP`, '#64b5f6', false, 0, 18);
        const bossUlt = u.monsterId ? MONSTERS[u.monsterId]?.boss?.skills.find((s) => s.id === e.skill) : undefined;
        if (bossUlt) {
          this.cameras.main.shake(250, 0.01);
          this.showBanner(`${u.name}\n${bossUlt.nameTh}!`, '#ff6b6b');
        } else if (skill && skill.id !== 'basic_attack') {
          const tag = e.reactive === 'ASSIST' ? '⚡ ' : e.reactive === 'COUNTER' ? '↩ ' : e.reactive ? '✦ ' : '';
          // Skill names float above the sprite so they don't collide with damage/heal numbers.
          this.popup(e.unit, `${tag}${skill.nameTh}`, '#ffa726', false, 0, -v.sprite.displayHeight * 0.45);
        }
        break;
      }
      case 'DAMAGE': {
        this.popup(e.target, `${e.amount}${e.crit ? '!' : ''}${e.block ? '🛡' : ''}`, e.crit ? '#ffeb3b' : '#ffffff', e.crit, delay);
        const v = this.views.get(e.target);
        if (v) {
          this.time.delayedCall(delay, () => {
            v.sprite.setTintFill(0xffffff);
            this.time.delayedCall(70, () => v.sprite.clearTint());
          });
        }
        break;
      }
      case 'MISS':
        this.popup(e.target, 'MISS', '#b0bec5', false, delay);
        break;
      case 'HEAL':
        this.popup(e.target, `+${e.amount}`, '#69f0ae', false, delay);
        break;
      case 'TICK':
        this.popup(e.target, `${e.amount}`, e.status === 'POISON' ? '#b388ff' : '#ff8a65');
        break;
      case 'STATUS':
        this.popup(e.target, STATUS_TH[e.status] ?? e.status, '#ffd54f', false, delay);
        break;
      case 'SKIP':
        this.popup(e.unit, STATUS_TH[e.reason] ?? 'ข้ามเทิร์น', '#90caf9');
        break;
      case 'SHIELD':
        this.popup(e.target, '🛡 SHIELD', '#80deea');
        break;
      case 'BUFF':
        this.popup(e.target, `${String(e.stat).toUpperCase()} ▲`, '#a5d6a7');
        break;
      case 'COVER':
        this.popup(e.unit, '🛡 COVER', '#4dabf7', true);
        break;
      case 'ITEM':
        this.popup(e.unit, `${CONSUMABLES[e.item]?.nameTh ?? 'ยา'} +${e.amount}${e.item === 'blue_elixir' ? ' MP' : ''}`, e.item === 'blue_elixir' ? '#64b5f6' : '#80deea');
        break;
      case 'RECOVER':
        this.popup(e.unit, `+${e.amount}`, '#69f0ae');
        break;
      case 'BLOCK_ULT':
        this.popup(e.unit, 'BLOCK!', '#4dabf7', true);
        break;
      case 'MIRACLE':
        this.popup(e.unit, 'MIRACLE!', '#ffd43b', true);
        break;
      case 'PHASE':
        this.cameras.main.flash(300, 255, 80, 80);
        this.showBanner(e.message, '#ff8a80');
        break;
      case 'ENRAGE':
        this.showBanner('⚠️ บอสคลั่ง! (Enrage)', '#ff5252');
        break;
      case 'SUMMON':
        this.layout();
        break;
      case 'DEATH': {
        const v = this.views.get(e.unit);
        if (v) this.time.delayedCall(delay, () => this.tweens.add({ targets: [v.sprite, v.label], alpha: 0, duration: 350 }));
        break;
      }
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------------------------
  // DOM panel: deck with launch rates, speed, skip, flee

  private lastPanel = '';

  private renderPanel() {
    const me = this.d.combat.units.find((u) => u.id === this.meId);
    if (!me) {
      // Knocked out in an earlier wave: the party fights on without us.
      const html = `<div class="battle-vitals"><span class="hp">💀 หมดสติ — รอเพื่อนสู้ต่อ</span><span class="spacer"></span>
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
        <b>${esc(sk.nameTh)}</b><small>${sk.rate}%${cd ? ` · CD ${cd}` : ''}</small></div>`;
    });
    const html = `
      <div class="battle-vitals">
        <span class="hp">HP ${Math.max(0, Math.round(me.hp))}/${Math.round(me.base.maxHp)}</span>
        <span class="mp">MP ${Math.round(me.mp)}/${Math.round(me.base.maxMp)}</span>
        <span class="pot">${this.req.kind === 'TEST' ? 'ยาทดสอบ' : 'ยา'} HP ${bag.red_potion ?? 0} · MP ${bag.blue_elixir ?? 0}</span>
        <span class="spacer"></span>
        <button class="chip" data-act="speed">${this.speed}×</button>
        <button class="chip" data-act="skip">⏭ ข้าม</button>
        ${(this.req.kind === 'FIELD' && !this.req.auto) || this.req.kind === 'TEST' ? '<button class="chip" data-act="flee">ออก</button>' : ''}
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
      hp: me?.hp ?? 0,
      mp: me?.mp ?? 0,
      itemsLeft: { ...store.s.bag, red_potion: potions.red_potion ?? 0, blue_elixir: potions.blue_elixir ?? 0 },
      // Party runs: personal loot — each member rolls their own drops.
      rng: createRng(this.req.dungeon ? memberLootSeed(this.d.seed, this.meId) : this.d.seed ^ 0x9e3779b9),
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
      <h2>🧪 ${fled ? 'ออกจากสนาม' : dummy ? '⏱ ครบเวลา' : won ? 'ชนะ' : 'แพ้'} — ${st.rounds} รอบ</h2>
      <p>ดาเมจที่ทำ <b>${st.dealt.toLocaleString()}</b> (เฉลี่ย <b>${Math.round(st.dealt / Math.max(1, st.rounds)).toLocaleString()}</b>/รอบ)
        · ที่ได้รับ <b>${st.taken.toLocaleString()}</b> · ฟื้นฟู <b>${st.healed.toLocaleString()}</b> · ใช้ MP <b>${st.mpUsed.toLocaleString()}</b></p>
      <p>โดน ${st.hits} · Critical ${st.crits} (${Math.round((st.crits / Math.max(1, st.hits)) * 100)}%) · Miss ${st.misses}
        ${Object.keys(st.statuses).length ? ` · สถานะ: ${Object.entries(st.statuses).map(([k, n]) => `${STATUS_TH[k] ?? k} ×${n}`).join(', ')}` : ''}</p>
      <table class="deck-stats"><tr><th>สกิล</th><th>ครั้ง</th><th>ดาเมจ</th></tr>${rows}</table>
      <p class="muted">สนามทดสอบ: เริ่ม HP/MP เต็ม ใช้ยาทดสอบ (HP 5 · MP 5) ไม่แตะของในกระเป๋า ไม่ได้รางวัล${dummy ? ' · พิษ/เลือดไหลกับหุ่นคิดจาก HP 1,000' : ''}</p>
      <button class="btn" data-act="again">🔁 สู้ซ้ำ</button>
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
    const title = retreat ? '⏱ หมดเวลาโจมตี' : knocked ? '💫 ถูกตีกระเด็นออกมา!' : o.result === 'WIN' ? '🏆 ชนะ!' : o.result === 'LOSE' ? '💀 พ่ายแพ้…' : '🏃 ถอนตัว';
    const items = Object.entries(o.loot.items).map(([id, n]) => `<li>${esc(itemName(id))} ×${n}</li>`).join('');
    const body =
      o.result === 'WIN'
        ? `<p>+${o.loot.exp.toLocaleString()} EXP · +${o.loot.gold.toLocaleString()} Gold</p>
           ${o.levelsGained ? `<p class="good">เลเวลอัป +${o.levelsGained}!</p>` : ''}
           ${items ? `<ul class="loot">${items}</ul>` : ''}`
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
  return EQUIPMENT[id]?.nameTh ?? CONSUMABLES[id]?.nameTh ?? id;
}
