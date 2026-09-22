import Phaser from 'phaser';
import {
  CLASSES,
  CONSUMABLES,
  EQUIPMENT,
  MONSTERS,
  SKILLS,
  TICK,
  GAUGE_FULL,
  advance,
  alive,
  bossAtkScale,
  bossHpScale,
  canUseSkill,
  command,
  createBattle,
  createRng,
  skillMpCost,
  type Battle,
  type BattleEvent,
  type BattleSetup,
  type Command,
  type Unit,
} from '@pw/shared';
import { monsterCanvas } from '../game/art';
import { bus, toast, type BattleRequest } from '../game/bus';
import { applyBattleOutcome, bossIdFor, changeClass, worldBossHp, type BattleOutcome } from '../game/rules';
import { derivedOf, mutationOf, store } from '../state/store';
import { el, esc } from '../ui/dom';
import { autoHunt } from '../game/autohunt';

const WORLD_BOSS_WINDOW_S = 60;

interface UnitView {
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  home: { x: number; y: number };
}

export class BattleScene extends Phaser.Scene {
  private req!: BattleRequest;
  private b!: Battle;
  private views = new Map<string, UnitView>();
  private eventIndex = 0;
  private acc = 0;
  private speed = 2;
  private auto = false;
  private targetId: string | null = null;
  private panel!: HTMLElement;
  private finished = false;
  private worldBossStartHp = 0;
  private targetMarker!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  init(req: BattleRequest) {
    this.req = req;
    this.views.clear();
    this.eventIndex = 0;
    this.acc = 0;
    this.finished = false;
    this.targetId = null;
    this.worldBossStartHp = 0;
    this.lastPanelKey = '';
    this.auto = req.auto || localStorage.getItem('pw.auto') === '1';
    this.speed = req.auto ? 4 : 2;
  }

  create() {
    const setup = this.buildSetup();
    const seed = (Math.random() * 2 ** 31) | 0;
    this.b = createBattle(setup, seed);

    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x1b1f2a, 0x1b1f2a, 0x2b3a67, 0x2b3a67, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x3a4f7a, 1).fillRect(0, height * 0.42, width, height * 0.3);
    for (let i = 0; i < 40; i++) {
      g.fillStyle(0x4a6090, 1).fillRect(Math.random() * width, height * 0.42 + Math.random() * height * 0.3, 4, 4);
    }

    this.layoutUnits();
    this.targetMarker = this.add.text(0, 0, '▼', { fontFamily: 'Silkscreen', fontSize: '20px', color: '#FFA726', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: this.targetMarker, alpha: 0.4, yoyo: true, repeat: -1, duration: 400 });

    const title =
      this.req.kind === 'BOSS' ? `⚔️ บอส: ${this.b.units.find((u) => u.isBoss)?.name ?? ''}` :
      this.req.kind === 'TRIAL' ? `🏛️ บททดสอบอาชีพ ${CLASSES[this.req.trialClass!].nameTh}` : '⚔️ เผชิญหน้ามอนสเตอร์!';
    this.add.text(width / 2, 18, title, { fontFamily: 'Mali', fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);

    this.panel = el(`<div class="battle-panel"></div>`);
    document.getElementById('ui')!.appendChild(this.panel);
    document.body.classList.add('in-battle');
    this.events.once('shutdown', () => {
      this.panel.remove();
      document.body.classList.remove('in-battle');
    });
    this.renderPanel();
  }

  private buildSetup(): BattleSetup {
    const s = store.s;
    const derived = derivedOf(s);
    const items: Record<string, number> = {};
    for (const id of ['red_potion', 'blue_elixir']) if (s.bag[id]) items[id] = s.bag[id]!;

    let enemies: BattleSetup['enemies'] = this.req.monsterIds.map((monsterId) => ({ monsterId }));
    if (this.req.kind === 'BOSS' && this.req.landmark) {
      const bossId = bossIdFor(this.req.landmark)!;
      const def = MONSTERS[bossId]!;
      if (def.boss?.worldBoss) {
        this.worldBossStartHp = worldBossHp(this.req.landmark, s);
        enemies = [{ monsterId: bossId, hp: this.worldBossStartHp }];
      } else {
        enemies = [{ monsterId: bossId, hpScale: bossHpScale(bossId, 1), atkScale: bossAtkScale(bossId, 1) }];
      }
    }
    if (this.req.kind === 'TRIAL') enemies = [{ monsterId: 'soi_dog_spirit' }, { monsterId: 'alley_rat' }];

    return {
      players: [
        {
          id: 'me',
          name: s.name,
          sprite: 'hero',
          level: s.level,
          classId: s.classId,
          mutation: mutationOf(s),
          derived,
          hp: s.hp,
          mp: s.mp,
          controller: this.auto ? 'AUTO' : 'MANUAL',
        },
      ],
      enemies,
      items,
      canFlee: this.req.kind === 'FIELD',
    };
  }

  private layoutUnits() {
    const { width, height } = this.scale;
    const enemies = this.b.units.filter((u) => u.side === 'ENEMY');
    const scale = Math.max(3, Math.min(6, Math.floor(width / 110)));
    enemies.forEach((u, i) => {
      if (!this.views.has(u.id)) this.addView(u, 0, 0, u.isBoss ? scale + 2 : scale);
      const n = enemies.length;
      const x = (width * (i + 1)) / (n + 1);
      const y = height * (u.isBoss ? 0.36 : n > 3 && i % 2 ? 0.3 : 0.38);
      const v = this.views.get(u.id)!;
      v.home = { x, y };
      if (alive(u)) v.sprite.setPosition(x, y);
    });
    const me = this.b.units.find((u) => u.side === 'PLAYER')!;
    if (!this.views.has(me.id)) this.addView(me, 0, 0, scale);
    const v = this.views.get(me.id)!;
    v.home = { x: width / 2, y: height * 0.62 };
    v.sprite.setPosition(v.home.x, v.home.y);
    for (const [, view] of this.views) this.drawBar(view, this.b.units.find((u) => this.views.get(u.id) === view)!);
  }

  private addView(u: Unit, x: number, y: number, scale: number) {
    let key: string;
    if (u.side === 'PLAYER') {
      key = (this.scene.get('World').registry.get('heroKey') as string) ?? 'hero';
    } else {
      key = `mob_${u.sprite}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, monsterCanvas(u.sprite));
    }
    const sprite = this.add.image(x, y, key).setScale(scale).setOrigin(0.5, 1).setDepth(10);
    if (u.side === 'ENEMY') {
      sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (alive(u)) this.targetId = u.id;
      });
    }
    const label = this.add
      .text(x, y, `${u.name} Lv.${u.level}`, { fontFamily: 'Mali', fontSize: '12px', color: '#fff', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0)
      .setDepth(11);
    const hpBar = this.add.graphics().setDepth(11);
    this.views.set(u.id, { sprite, label, hpBar, home: { x, y } });
  }

  private drawBar(v: UnitView, u: Unit) {
    const w = Math.max(60, v.sprite.displayWidth * 0.9);
    const x = v.sprite.x - w / 2;
    const y = v.sprite.y + 4;
    v.label.setPosition(v.sprite.x, y + 10);
    v.hpBar.clear();
    if (!alive(u)) return;
    v.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 8);
    const pct = u.hp / u.base.maxHp;
    v.hpBar.fillStyle(pct > 0.5 ? 0x66bb6a : pct > 0.25 ? 0xffa726 : 0xef5350, 1).fillRect(x, y, w * pct, 6);
    if (u.side === 'PLAYER') {
      v.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y + 28, w + 2, 6);
      v.hpBar.fillStyle(0x26c6da, 1).fillRect(x, y + 29, (w * Math.min(u.gauge, GAUGE_FULL)) / GAUGE_FULL, 4);
    }
  }

  update(_t: number, delta: number) {
    if (this.finished) return;
    const b = this.b;

    if (b.result === 'ONGOING' && !b.awaiting) {
      this.acc += delta * this.speed;
      const ticks = Math.floor(this.acc / (TICK * 1000));
      if (ticks > 0) {
        this.acc -= ticks * TICK * 1000;
        advance(b, ticks);
      }
      if (this.worldBossStartHp && b.tick * TICK >= WORLD_BOSS_WINDOW_S && b.result === 'ONGOING') {
        this.finish('RETREAT');
        return;
      }
    }

    this.consumeEvents();
    this.layoutIfSummoned();
    for (const u of b.units) {
      const v = this.views.get(u.id);
      if (v) this.drawBar(v, u);
    }

    const foes = b.units.filter((u) => u.side === 'ENEMY' && alive(u));
    if (!this.targetId || !foes.some((f) => f.id === this.targetId)) this.targetId = foes[0]?.id ?? null;
    const tv = this.targetId ? this.views.get(this.targetId) : undefined;
    this.targetMarker.setVisible(!!tv);
    if (tv) this.targetMarker.setPosition(tv.sprite.x, tv.sprite.y - tv.sprite.displayHeight - 12);

    if (b.awaiting && this.auto) {
      const u = b.units.find((x) => x.id === b.awaiting)!;
      u.controller = 'AUTO';
      b.awaiting = null;
    }
    this.renderPanel();

    if (b.result !== 'ONGOING' && this.eventIndex >= b.events.length) this.finish(b.result);
  }

  private layoutIfSummoned() {
    if (this.b.units.some((u) => !this.views.has(u.id))) this.layoutUnits();
  }

  private consumeEvents() {
    const evs = this.b.events;
    while (this.eventIndex < evs.length) this.animate(evs[this.eventIndex++]!);
  }

  private popup(unitId: string, text: string, color: string, big = false) {
    const v = this.views.get(unitId);
    if (!v) return;
    const t = this.add
      .text(v.sprite.x + Phaser.Math.Between(-16, 16), v.sprite.y - v.sprite.displayHeight * 0.6, text, {
        fontFamily: 'Silkscreen',
        fontSize: big ? '26px' : '18px',
        color,
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private animate(e: BattleEvent) {
    switch (e.type) {
      case 'ACT': {
        const v = this.views.get(e.unit);
        if (!v) break;
        const dir = this.b.units.find((u) => u.id === e.unit)?.side === 'PLAYER' ? -1 : 1;
        this.tweens.add({ targets: v.sprite, y: v.home.y + dir * 14, yoyo: true, duration: 110 });
        const skill = SKILLS[e.skill];
        if (skill && skill.id !== 'basic_attack') this.popup(e.unit, skill.nameTh, '#FFA726');
        if (e.skill.startsWith('item:')) this.popup(e.unit, CONSUMABLES[e.skill.slice(5)]?.nameTh ?? 'ไอเทม', '#80deea');
        const bossSkill = MONSTERS[this.b.units.find((u) => u.id === e.unit)?.monsterId ?? '']?.boss?.skills.find((s) => s.id === e.skill);
        if (bossSkill) {
          this.cameras.main.shake(250, 0.01);
          this.popup(e.unit, bossSkill.nameTh + '!', '#ff5252', true);
        }
        break;
      }
      case 'DAMAGE': {
        this.popup(e.target, `${e.amount}${e.crit ? '!' : ''}`, e.crit ? '#ffeb3b' : '#ffffff', e.crit);
        const v = this.views.get(e.target);
        if (v) {
          v.sprite.setTintFill(0xffffff);
          this.time.delayedCall(80, () => v.sprite.clearTint());
        }
        break;
      }
      case 'MISS':
        this.popup(e.target, 'MISS', '#b0bec5');
        break;
      case 'HEAL':
        this.popup(e.target, `+${e.amount}`, '#69f0ae');
        break;
      case 'DOT':
        this.popup(e.target, `${e.amount}`, e.status === 'POISON' ? '#b388ff' : '#ff8a65');
        break;
      case 'STATUS':
        this.popup(e.target, STATUS_TH[e.status] ?? e.status, '#ffd54f');
        break;
      case 'SHIELD':
        this.popup(e.unit, 'IRON WALL', '#4dabf7', true);
        break;
      case 'BLOCK':
        this.popup(e.unit, 'BLOCK!', '#4dabf7', true);
        break;
      case 'MIRACLE':
        this.popup(e.unit, 'MIRACLE!', '#ffd43b', true);
        break;
      case 'DEATH': {
        const v = this.views.get(e.unit);
        if (v) this.tweens.add({ targets: [v.sprite, v.label], alpha: 0, duration: 400 });
        break;
      }
      case 'FLEE':
        toast(e.success ? 'หนีสำเร็จ!' : 'หนีไม่พ้น!', e.success ? 'info' : 'bad');
        break;
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------------------------
  // DOM command panel

  private lastPanelKey = '';

  private renderPanel() {
    const b = this.b;
    const me = b.units.find((u) => u.side === 'PLAYER')!;
    const waiting = b.awaiting === me.id;
    const key = JSON.stringify([
      waiting, this.auto, this.speed, Math.round(me.hp), Math.round(me.mp), b.items,
      Object.values(me.cooldowns).map((c) => Math.ceil(c)), b.itemCooldown > 0, b.result,
    ]);
    if (key === this.lastPanelKey) return;
    this.lastPanelKey = key;

    const skills = me.skills.map((id) => {
      const sk = SKILLS[id]!;
      const cd = Math.ceil(me.cooldowns[id] ?? 0);
      const ok = waiting && canUseSkill(me, id);
      const cost = skillMpCost(me, sk);
      return `<button class="btn skill" data-skill="${id}" ${ok ? '' : 'disabled'}>
        <b>${esc(sk.nameTh)}</b><small>${cost ? `${cost} MP` : 'ฟรี'}${cd ? ` · ${cd}s` : ''}</small></button>`;
    });
    const items = Object.entries(b.items)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `<button class="btn item" data-item="${id}" ${waiting && b.itemCooldown <= 0 ? '' : 'disabled'}>
        ${esc(CONSUMABLES[id]?.nameTh ?? id)} ×${n}</button>`);

    this.panel.innerHTML = `
      <div class="battle-vitals">
        <span class="hp">HP ${Math.round(me.hp)}/${me.base.maxHp}</span>
        <span class="mp">MP ${Math.round(me.mp)}/${me.base.maxMp}</span>
        ${this.worldBossStartHp ? `<span class="timer">⏱ ${Math.max(0, Math.ceil(WORLD_BOSS_WINDOW_S - b.tick * TICK))}s</span>` : ''}
        <span class="spacer"></span>
        <button class="chip" data-act="speed">${this.speed}×</button>
        <button class="chip ${this.auto ? 'on' : ''}" data-act="auto">AUTO</button>
      </div>
      <div class="battle-cmds ${waiting ? 'ready' : ''}">
        ${skills.join('')}
        ${items.join('')}
        ${b.canFlee ? `<button class="btn flee" data-act="flee" ${waiting ? '' : 'disabled'}>หนี</button>` : ''}
      </div>
      <div class="battle-hint">${waiting ? 'เลือกคำสั่ง (แตะมอนสเตอร์เพื่อเลือกเป้า)' : this.auto ? 'ต่อสู้อัตโนมัติ…' : 'รอเกจ ATB…'}</div>`;

    this.panel.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach((btn) =>
      btn.addEventListener('click', () => this.send({ type: 'SKILL', unitId: me.id, skillId: btn.dataset.skill!, targetId: this.targetId ?? undefined })),
    );
    this.panel.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((btn) =>
      btn.addEventListener('click', () => this.send({ type: 'ITEM', unitId: me.id, itemId: btn.dataset.item! })),
    );
    this.panel.querySelector('[data-act="flee"]')?.addEventListener('click', () => this.send({ type: 'FLEE', unitId: me.id }));
    this.panel.querySelector('[data-act="auto"]')?.addEventListener('click', () => {
      this.auto = !this.auto;
      localStorage.setItem('pw.auto', this.auto ? '1' : '0');
      me.controller = this.auto ? 'AUTO' : 'MANUAL';
      this.lastPanelKey = '';
    });
    this.panel.querySelector('[data-act="speed"]')?.addEventListener('click', () => {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1;
      this.lastPanelKey = '';
    });
  }

  private send(cmd: Command) {
    try {
      command(this.b, cmd);
    } catch (err) {
      toast((err as Error).message, 'bad');
    }
    this.lastPanelKey = '';
  }

  // -------------------------------------------------------------------------------------------
  // End

  private finish(result: Battle['result'] | 'RETREAT') {
    if (this.finished) return;
    this.finished = true;
    const b = this.b;
    const me = b.units.find((u) => u.side === 'PLAYER')!;
    const boss = b.units.find((u) => u.isBoss);
    const defeated = b.units.filter((u) => u.side === 'ENEMY' && !alive(u) && u.monsterId).map((u) => u.monsterId!);

    const outcome = applyBattleOutcome({
      result: result === 'RETREAT' ? 'FLED' : result,
      defeated,
      hp: me.hp,
      mp: me.mp,
      itemsLeft: b.items,
      rng: createRng(b.seed ^ 0x9e3779b9),
      landmark: this.req.landmark,
      kind: this.req.kind,
      spawn: this.req.spawn,
      worldBoss: this.worldBossStartHp && boss
        ? { remainingHp: Math.max(0, Math.round(boss.hp)), damage: Math.round(this.worldBossStartHp - boss.hp), maxHp: boss.base.maxHp }
        : undefined,
    });

    if (this.req.kind === 'TRIAL' && result === 'WIN' && this.req.trialClass) {
      changeClass(this.req.trialClass);
      toast(`ยินดีด้วย! คุณคือ ${CLASSES[this.req.trialClass].nameTh} แล้ว`, 'good');
    }
    this.showResult(outcome, result === 'RETREAT');
  }

  private showResult(o: BattleOutcome, retreat: boolean) {
    const knocked = !retreat && o.result === 'FLED' && o.worldBossDamage !== undefined;
    const title = retreat ? '⏱ หมดเวลาโจมตี' : knocked ? '💫 ถูกตีกระเด็นออกมา!' : o.result === 'WIN' ? '🏆 ชนะ!' : o.result === 'LOSE' ? '💀 พ่ายแพ้…' : '🏃 หนีสำเร็จ';
    const items = Object.entries(o.loot.items)
      .map(([id, n]) => `<li>${esc(itemName(id))} ×${n}</li>`)
      .join('');
    const body =
      o.result === 'WIN'
        ? `<p>+${o.loot.exp.toLocaleString()} EXP · +${o.loot.gold.toLocaleString()} Gold</p>
           ${o.levelsGained ? `<p class="good">เลเวลอัป +${o.levelsGained}!</p>` : ''}
           ${items ? `<ul class="loot">${items}</ul>` : ''}`
        : o.result === 'LOSE'
          ? `<p class="bad">ชุดเกราะพังทั้งหมด (Durability 0)</p><p class="bad">เสีย ${o.goldLost.toLocaleString()} Gold ที่ถืออยู่</p><p>EXP ไม่ลด — ลองปรับ Build ใหม่ได้เลย!</p>`
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

const STATUS_TH: Record<string, string> = {
  STUN: 'มึน!',
  SLOW: 'ช้าลง',
  POISON: 'ติดพิษ',
  ROOT: 'ถูกรัด!',
  TAUNT: 'ยั่วยุ',
  BLEED: 'ไฟลุก',
};

function itemName(id: string): string {
  return EQUIPMENT[id]?.nameTh ?? CONSUMABLES[id]?.nameTh ?? id;
}
