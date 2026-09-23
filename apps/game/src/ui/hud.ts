/** DOM UI: HUD, walk controls, landmark card, panels. Flat-vector style over the Phaser canvas. */
import {
  CLASSES,
  CLASS_CHANGE_LEVEL,
  CONSUMABLES,
  EQUIPMENT,
  MONSTERS,
  MUTATIONS,
  MUTATION_MIN_LEVEL,
  MUTATION_THRESHOLD,
  DECK_PRESETS,
  RARITY_COLOR,
  SKILLS,
  STAT_KEYS,
  canChangeClass,
  expToNext,
  mutationProgress,
  type ClassId,
  type EquipSlot,
  type Landmark,
  type Spawn,
  type StatKey,
} from '@pw/shared';
import { bus, toast } from '../game/bus';
import { DEFAULT_POS, walk } from '../game/walk';
import {
  allocate,
  bank,
  bossAvailableAt,
  bossIdFor,
  buy,
  equip,
  nearHome,
  repairAll,
  repairAllCost,
  respec,
  respecCost,
  restAtHome,
  sellGear,
  setHome,
  unequip,
  usePotion,
  worldBossHp,
  worldBossReadyAt,
} from '../game/rules';
import { LOADOUT_SIZE, applyStarter, derivedOf, effectiveLoadout, learnableSkills, mutationOf, store, type SaveData } from '../state/store';
import { bar, el, esc } from './dom';
import { showCreator } from './creator';
import { arenaPanel, wireArena } from './arena';
import { net } from '../game/net';
import { partyPanel, showInvite, showReadyCheck, wireParty } from './party';
import { autoHunt } from '../game/autohunt';

const STAT_TH: Record<StatKey, string> = {
  str: 'STR พลัง',
  agi: 'AGI ว่องไว',
  vit: 'VIT อึด',
  int: 'INT ปัญญา',
  dex: 'DEX แม่นยำ',
  luk: 'LUK โชค',
};

const SLOT_TH: Record<EquipSlot, string> = {
  helmet: 'หมวก',
  chest: 'เกราะ',
  weapon: 'อาวุธ',
  offhand: 'มือรอง',
  boots: 'รองเท้า',
  accessory: 'เครื่องประดับ',
};

const HOME_SHOP = ['red_potion', 'blue_elixir', 'cotton_shirt', 'training_sword', 'apprentice_staff', 'cloth_bandana', 'straw_sandals', 'iron_helm', 'runner_sneakers'];
const SMITH_SHOP = ['whetstone', 'master_repair_kit', 'pixel_broadsword', 'iron_helm'];

const root = () => document.getElementById('ui')!;
let near: Landmark[] = [];
/** Encounters are opt-in: forcing a battle mid-walk (e.g. crossing a road) is unsafe. */
let pendingEncounter: { monsterIds: string[]; expires: number } | null = null;
/** Monsters within fight range right now (from WorldScene). */
let inRange: Spawn[] = [];
const ENCOUNTER_TTL_MS = 90_000;

// ---------------------------------------------------------------------------------------------
// Onboarding

export function showOnboarding(onDone: () => void) {
  // Appearance and starter gear are chosen on one page (the old separate "Naked Dilemma" step).
  showCreator(root(), (name, appearance, loadout) => {
    store.create(name, appearance);
    store.update((s) => applyStarter(s, loadout));
    onDone();
  });
}

// ---------------------------------------------------------------------------------------------
// HUD

export function mountHud() {
  const hud = el(`<div class="hud">
    <div class="topbar" data-open="char"></div>
    <div class="net-pill offline">⚪ ออฟไลน์</div>
    <div class="near"></div>
    <div class="joystick hidden"><div class="stick"></div></div>
    <div class="sim-tools hidden"><button class="sim-speed" data-simspeed title="ความเร็วโหมดจำลอง (ทดสอบ)"></button><button class="sim-home" data-simhome title="วาร์ปกลับจุดเริ่ม (คูเมืองเชียงใหม่)">📍</button></div>
    <div class="zoom"><button data-zoom="1" aria-label="ซูมเข้า">＋</button><button data-zoom="-1" aria-label="ซูมออก">－</button><button data-zoom="0" aria-label="หันทิศเหนือ">🧭</button><button class="auto-btn" data-autohunt aria-label="ล่าอัตโนมัติ">🤖<small>AUTO</small></button></div>
    <div class="bottombar">
      <button class="menu-btn" data-open="char">👤<span>ตัวละคร</span></button>
      <button class="menu-btn" data-open="bag">🎒<span>กระเป๋า</span></button>
      <button class="menu-btn" data-open="party">👥<span>ปาร์ตี้</span><i class="badge hidden"></i></button>
      <button class="menu-btn" data-open="home">🏠<span>บ้าน</span></button>
      <button class="menu-btn" data-open="settings">⚙️<span>ตั้งค่า</span></button>
    </div>
    <div class="toasts"></div>
  </div>`);
  root().appendChild(hud);

  hud.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-simspeed]')) {
      walk.cycleSimSpeed();
      return renderSimSpeed();
    }
    if ((e.target as HTMLElement).closest('[data-simhome]')) {
      walk.teleport(DEFAULT_POS.lat, DEFAULT_POS.lng);
      return toast('📍 วาร์ปกลับคูเมือง · คลิกขวา/กดค้างบนแผนที่เพื่อวาร์ปไปจุดนั้น');
    }
    if ((e.target as HTMLElement).closest('[data-autohunt]')) return autoHunt.toggle();
    const z = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
    if (z) return bus.emit('zoom', { delta: Number(z.dataset.zoom) });
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-open],[data-act]');
    if (!t) return;
    if (t.dataset.open) openPanel(t.dataset.open);
  });

  const render = () => {
    renderTopbar(hud.querySelector('.topbar')!, store.s);
    renderNear(hud.querySelector('.near')!);
  };
  store.subscribe(render);
  bus.on('landmark:near', ({ landmarks }) => {
    near = landmarks;
    renderNear(hud.querySelector('.near')!);
  });
  const renderSimSpeed = () => {
    hud.querySelector('.sim-tools')!.classList.toggle('hidden', !walk.simulated);
    const b = hud.querySelector<HTMLElement>('.sim-speed')!;
    b.textContent = `🏃 ${walk.simSpeed}×`;
  };
  bus.on('position', (p) => {
    hud.querySelector('.joystick')!.classList.toggle('hidden', !p.simulated);
    renderSimSpeed();
  });
  const renderPartyBadge = () => {
    const b = hud.querySelector<HTMLElement>('[data-open="party"] .badge')!;
    b.classList.toggle('hidden', !net.party);
    b.textContent = net.party ? String(net.party.members.length) : '';
  };
  bus.on('party', () => {
    renderPartyBadge();
    if (panelName === 'party') renderPanel();
  });
  bus.on('players', () => {
    if (panelName === 'party') renderPanel();
  });
  bus.on('party:invited', ({ from, name, level }) => showInvite(from, name, level));
  bus.on('run:prepare', (r) => {
    if (r.needAccept) showReadyCheck(r.runId, r.target, r.openedBy, r.timeoutMs, r.mine);
  });
  bus.on('encounter', ({ monsterIds }) => {
    pendingEncounter = { monsterIds, expires: Date.now() + ENCOUNTER_TTL_MS };
    navigator.vibrate?.(120);
    renderNear(hud.querySelector('.near')!);
  });
  bus.on('battle:end', () => renderNear(hud.querySelector('.near')!));
  bus.on('net', ({ connected, online }) => {
    const pill = hud.querySelector<HTMLElement>('.net-pill')!;
    pill.classList.toggle('offline', !connected);
    pill.textContent = connected ? `🟢 ออนไลน์ ${online} คน` : '⚪ ออฟไลน์';
  });
  bus.on('autohunt', ({ enabled }) => {
    hud.querySelector('.auto-btn')!.classList.toggle('on', enabled);
    renderNear(hud.querySelector('.near')!);
  });
  bus.on('monsters:inRange', ({ spawns }) => {
    inRange = spawns;
    renderNear(hud.querySelector('.near')!);
  });
  bus.on('toast', ({ text, kind }) => showToast(hud.querySelector('.toasts')!, text, kind ?? 'info'));
  window.setInterval(() => renderNear(hud.querySelector('.near')!), 5000);
  mountJoystick(hud.querySelector('.joystick')!);
  render();
}

function renderTopbar(elm: HTMLElement, s: SaveData) {
  const d = derivedOf(s);
  const mut = mutationOf(s);
  const next = expToNext(s.level);
  elm.innerHTML = `
    <div class="who">
      <b>${esc(s.name)}</b>
      <span class="tag">Lv.${s.level} ${esc(CLASSES[s.classId].nameTh)}</span>
      ${mut ? `<span class="tag mut">${esc(MUTATIONS[mut].titleTh)}</span>` : ''}
      ${s.unspentPoints ? `<span class="badge">+${s.unspentPoints}</span>` : ''}
    </div>
    <div class="bars">
      <label>HP</label>${bar(s.hp, d.maxHp, 'hp')}<small>${s.hp}/${d.maxHp}</small>
      <label>MP</label>${bar(s.mp, d.maxMp, 'mp')}<small>${s.mp}/${d.maxMp}</small>
      <label>EXP</label>${bar(s.exp, next, 'exp')}<small>${Number.isFinite(next) ? Math.floor((s.exp / next) * 100) + '%' : 'MAX'}</small>
    </div>
    <div class="gold">🪙 ${s.gold.toLocaleString()}</div>`;
}

function fmtWait(ms: number): string {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} น.` : `${m} นาที`;
}

function renderNear(box: HTMLElement) {
  const s = store.s;
  const pos = walk.position;
  const home = pos && nearHome(s, pos.lat, pos.lng);
  if (pendingEncounter && pendingEncounter.expires < Date.now()) pendingEncounter = null;
  if (!near.length && !home && !pendingEncounter && !inRange.length) {
    box.dataset.html = '';
    box.innerHTML = '';
    return;
  }
  const now = Date.now();
  const cards = near.slice(0, 2).map((l) => {
    const bossId = bossIdFor(l)!;
    const boss = MONSTERS[bossId]!;
    const at = bossAvailableAt(l, s, now);
    const ready = at <= now;
    const wb = boss.boss?.worldBoss;
    const hpInfo = wb && ready ? ` · HP ${worldBossHp(l, s).toLocaleString()}/${boss.hp.toLocaleString()}` : '';
    const trial = l.kind === 'PARK' && canChangeClass(s.classId, s.level);
    const wbWait = wb && ready ? worldBossReadyAt(l, s) - now : 0;
    return `<div class="lm-card">
      <div class="lm-title">${l.kind === 'CONVENIENCE' ? '🏪' : l.kind === 'FUEL' ? '⛽' : '🌳'} ${esc(l.label)}</div>
      <div class="lm-sub">${esc(boss.nameTh)} Lv.${boss.level}${wb ? ' (บอสโลก)' : ''} — ${ready ? `<b class="good">ปรากฏแล้ว!</b>${hpInfo}` : `เกิดใหม่ใน ${fmtWait(at - now)}`}</div>
      <div class="lm-actions">
        ${ready && wbWait <= 0 ? `<button class="btn danger" data-boss="${l.id}">⚔️ ท้าบอส</button>` : ''}
        ${ready && wbWait > 0 ? `<button class="btn" disabled>พักฟื้น ${fmtWait(wbWait)}</button>` : ''}
        ${l.kind === 'FUEL' ? `<button class="btn" data-smith="${l.id}">🔨 ร้านตีเหล็ก</button>` : ''}
        ${trial ? `<button class="btn primary" data-trial="${l.id}">🏛️ บททดสอบอาชีพ</button>` : ''}
      </div></div>`;
  });
  if (home) cards.unshift(`<div class="lm-card home"><div class="lm-title">🏠 บ้านของคุณ</div>
    <div class="lm-actions"><button class="btn primary" data-open="home">เข้าบ้าน</button></div></div>`);
  if (pendingEncounter) {
    const names = pendingEncounter.monsterIds.map((id) => `${MONSTERS[id]!.nameTh} Lv.${MONSTERS[id]!.level}`).join(' + ');
    const lowHp = s.hp < derivedOf(s).maxHp * 0.3;
    cards.unshift(`<div class="lm-card encounter"><div class="lm-title">⚔️ มอนสเตอร์ปรากฏ!</div>
      <div class="lm-sub">${esc(names)}${lowHp ? ' — <b class="bad">HP ต่ำ!</b>' : ''}</div>
      <div class="lm-actions"><button class="btn danger" data-fight>สู้</button><button class="btn" data-skip>ข้าม</button></div></div>`);
  }
  const target = inRange[0];
  if (target) {
    const m = MONSTERS[target.monsterId]!;
    const low = s.hp < derivedOf(s).maxHp * 0.3;
    cards.unshift(`<div class="lm-card fight"><div class="lm-title">⚔️ มอนสเตอร์ในรัศมี ${inRange.length} ตัว${autoHunt.enabled ? ' · 🤖 กำลังล่าอัตโนมัติ' : ''}</div>
      <div class="lm-sub">ใกล้สุด: ${esc(m.nameTh)} Lv.${m.level} — แตะตัวไหนบนแผนที่ก็สู้ได้${low ? ' — <b class="bad">HP ต่ำ!</b>' : ''}</div>
      <div class="lm-actions"><button class="btn danger" data-fight-spawn="${esc(target.id)}">⚔️ สู้</button></div></div>`);
  }
  // Only touch the DOM when content changes, so a tap is never lost to a re-render.
  const html = cards.join('');
  if (box.dataset.html === html) return;
  box.dataset.html = html;
  box.innerHTML = html;
  box.querySelector<HTMLElement>('[data-fight-spawn]')?.addEventListener('click', (e) => {
    const id = (e.currentTarget as HTMLElement).dataset.fightSpawn;
    const sp = inRange.find((x) => x.id === id);
    if (sp) bus.emit('battle:start', { kind: 'FIELD', monsterIds: [sp.monsterId], spawn: { id: sp.id, expiresAt: sp.expiresAt } });
  });
  box.querySelector('[data-fight]')?.addEventListener('click', () => {
    const e = pendingEncounter;
    pendingEncounter = null;
    if (e) bus.emit('battle:start', { kind: 'FIELD', monsterIds: e.monsterIds });
  });
  box.querySelector('[data-skip]')?.addEventListener('click', () => {
    pendingEncounter = null;
    renderNear(box);
  });
  box.querySelectorAll<HTMLElement>('[data-boss]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = near.find((x) => x.id === b.dataset.boss);
      if (l) bus.emit('boss:challenge', { landmark: l });
    }),
  );
  box.querySelectorAll<HTMLElement>('[data-smith]').forEach((b) => b.addEventListener('click', () => openPanel('smith')));
  box.querySelectorAll<HTMLElement>('[data-trial]').forEach((b) => b.addEventListener('click', () => openPanel('trial')));
}

function showToast(box: HTMLElement, text: string, kind: string) {
  const t = el(`<div class="toast ${kind}">${esc(text)}</div>`);
  box.appendChild(t);
  window.setTimeout(() => t.classList.add('out'), 2600);
  window.setTimeout(() => t.remove(), 3100);
}

function mountJoystick(pad: HTMLElement) {
  const stick = pad.querySelector<HTMLElement>('.stick')!;
  let id: number | null = null;
  const move = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    stick.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    walk.setSimDirection(x, y, len > 0.95 && e.shiftKey);
  };
  pad.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    pad.setPointerCapture(id);
    document.body.dataset.joystick = '1';
    move(e);
  });
  pad.addEventListener('pointermove', (e) => e.pointerId === id && move(e));
  const end = () => {
    id = null;
    stick.style.transform = '';
    delete document.body.dataset.joystick;
    walk.setSimDirection(0, 0);
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}

// ---------------------------------------------------------------------------------------------
// Panels

let panelEl: HTMLElement | null = null;
let panelName = '';
let unsubPanel: (() => void) | null = null;

let lastPartyHtml = '';

export function openPanel(name: string) {
  closePanel();
  lastPartyHtml = '';
  panelName = name;
  panelEl = el(`<div class="sheet-backdrop"><div class="sheet"><button class="close" aria-label="ปิด">✕</button><div class="sheet-body"></div></div></div>`);
  root().appendChild(panelEl);
  panelEl.addEventListener('click', (e) => {
    if (e.target === panelEl || (e.target as HTMLElement).closest('.close')) closePanel();
  });
  unsubPanel = store.subscribe(renderPanel);
  renderPanel();
}

export function closePanel() {
  unsubPanel?.();
  unsubPanel = null;
  panelEl?.remove();
  panelEl = null;
}

function renderPanel() {
  if (!panelEl) return;
  const body = panelEl.querySelector<HTMLElement>('.sheet-body')!;
  const s = store.s;
  const scroll = body.scrollTop;
  switch (panelName) {
    case 'char':
      body.innerHTML = charPanel(s);
      break;
    case 'bag':
      body.innerHTML = bagPanel(s);
      break;
    case 'home':
      body.innerHTML = homePanel(s);
      break;
    case 'smith':
      body.innerHTML = smithPanel(s);
      break;
    case 'trial':
      body.innerHTML = trialPanel();
      break;
    case 'arena':
      body.innerHTML = arenaPanel();
      wireArena(body, renderPanel, closePanel);
      body.scrollTop = scroll;
      return;
    case 'party': {
      // Refreshes every second with presence updates — only touch the DOM when something changed.
      const html = partyPanel();
      if (html !== lastPartyHtml || !body.firstChild) {
        lastPartyHtml = html;
        body.innerHTML = html;
        wireParty(body, closePanel);
        body.scrollTop = scroll;
      }
      return;
    }
    case 'settings':
      body.innerHTML = settingsPanel();
      break;
  }
  body.scrollTop = scroll;
  wirePanel(body);
}

function charPanel(s: SaveData): string {
  const d = derivedOf(s);
  const mut = mutationOf(s);
  const prog = mutationProgress(s.allocated);
  const rows = STAT_KEYS.map(
    (k) => `<div class="stat-row"><span>${STAT_TH[k]}</span><b>${5 + s.allocated[k]}</b>
      <button class="mini" data-alloc="${k}" ${s.unspentPoints ? '' : 'disabled'}>+1</button>
      <button class="mini" data-alloc5="${k}" ${s.unspentPoints >= 5 ? '' : 'disabled'}>+5</button></div>`,
  ).join('');
  const mutText = mut
    ? `<div class="mut-box on"><b>${esc(MUTATIONS[mut].titleTh)}</b> — ${esc(MUTATIONS[mut].passive)}<br>
        ✅ ${MUTATIONS[mut].upside.map(esc).join('<br>✅ ')}${MUTATIONS[mut].downside.length ? '<br>⚠️ ' + MUTATIONS[mut].downside.map(esc).join('<br>⚠️ ') : ''}</div>`
    : `<div class="mut-box">Extreme Mutation: ต้อง Lv.${MUTATION_MIN_LEVEL}+ และ Stat เดียว ≥ ${MUTATION_THRESHOLD * 100}%
        <div class="mut-prog">${bar(prog.share, MUTATION_THRESHOLD, 'mut')}<small>${prog.stat.toUpperCase()} ${(prog.share * 100).toFixed(0)}%</small></div></div>`;
  return `<h2>${esc(s.name)} <small>Lv.${s.level} ${esc(CLASSES[s.classId].nameTh)}</small></h2>
    <p class="muted">${esc(CLASSES[s.classId].passive.name)}: ${esc(mut ? 'ถูกแทนที่ด้วย Mutation' : CLASSES[s.classId].passive.description)}</p>
    <h3>Stat Points คงเหลือ: <span class="accent">${s.unspentPoints}</span></h3>
    ${rows}
    ${mutText}
    <h3>ค่าพลัง</h3>
    <div class="grid2">
      <span>HP</span><b>${d.maxHp}</b><span>MP</span><b>${d.maxMp}</b>
      <span>ATK</span><b>${d.atk}</b><span>MATK</span><b>${d.matk}</b>
      <span>DEF</span><b>${d.def}</b><span>MDEF</span><b>${d.mdef}</b>
      <span>Critical</span><b>${(d.crit * 100).toFixed(1)}%</b><span>Evasion</span><b>${(d.evasion * 100).toFixed(1)}%</b>
      <span>ATB Speed</span><b>${d.speed.toFixed(1)}</b><span>Drop</span><b>×${d.dropRate.toFixed(2)}</b>
    </div>
    <h3>สถิติ</h3>
    <div class="grid2">
      <span>ชนะ</span><b>${s.stats.battlesWon}</b><span>บอส</span><b>${s.stats.bossesKilled}</b>
    </div>
    ${s.level < CLASS_CHANGE_LEVEL && s.classId === 'NOVICE' ? `<p class="muted">ถึง Lv.${CLASS_CHANGE_LEVEL} แล้วไปสวนสาธารณะใหญ่เพื่อทำบททดสอบอาชีพ</p>` : ''}
    ${deckEditor(s)}
    <button class="btn" data-act="respec">รีเซ็ต Stat (${respecCost(s) ? respecCost(s) + ' Gold' : 'ฟรีก่อน Lv.10'})</button>`;
}

const TRIGGER_TH: Record<string, string> = {
  COVER: 'รับแทนเพื่อน', ASSIST: 'ตามตีซ้ำ', COUNTER: 'สวนกลับ', ON_DODGE: 'เมื่อหลบได้', ON_LOW_HP: 'เมื่อ HP ต่ำ', ON_ALLY_DEATH: 'เมื่อเพื่อนตาย',
};

const ELEMENT_ICON: Record<string, string> = { NEUTRAL: '', FIRE: '🔥', WATER: '💧', LIGHTNING: '⚡', EARTH: '🪨', HOLY: '✨', SHADOW: '🌑' };

/** Skill Deck (Pockie Ninja style): up to LOADOUT_SIZE skills rolled by % each turn. */
function deckEditor(s: SaveData): string {
  const deck = effectiveLoadout(s);
  const presets = DECK_PRESETS[s.classId] ?? [];
  const row = (id: string) => {
    const sk = SKILLS[id]!;
    const on = deck.includes(id);
    const kind = sk.kind === 'REACTIVE' ? `ตอบโต้: ${TRIGGER_TH[sk.trigger ?? ''] ?? ''}` : `CD ${sk.cooldown} · ${sk.mp} MP`;
    return `<div class="row deck-pick ${on ? 'on' : ''}"><div><b>${ELEMENT_ICON[sk.element] ?? ''} ${esc(sk.nameTh)}</b> <span class="tag">${sk.rate}%</span>
      <br><small class="muted">${esc(kind)} — ${esc(sk.description)}</small></div><span class="spacer"></span>
      <button class="mini" data-deck="${id}">${on ? 'เอาออก' : 'ใส่'}</button></div>`;
  };
  const pool = learnableSkills(s);
  const active = pool.filter((id) => SKILLS[id]!.kind === 'ACTIVE').map(row).join('');
  const reactive = pool.filter((id) => SKILLS[id]!.kind === 'REACTIVE').map(row).join('');
  const presetBtns = presets
    .map((p) => `<button class="preset ${p.deck.every((id) => deck.includes(id)) && deck.length === p.deck.length ? 'on' : ''}" data-preset="${p.id}">
      <b>${esc(p.nameTh)}</b><small>${esc(p.description)}</small></button>`)
    .join('');
  return `<h3>ชุดสกิล (Skill Deck) ${deck.length}/${LOADOUT_SIZE}</h3>
    <p class="muted">ต่อสู้อัตโนมัติ: ทุกเทิร์นระบบทอย % ของแต่ละสกิลตามลำดับความสำคัญ ถ้าไม่ติดเลยจะโจมตีธรรมดา · สกิลตอบโต้ทำงานเมื่อเกิดเหตุการณ์ (ประเภทเดียวกันทำงานได้ทีละอัน)</p>
    <div class="deck-now">${deck.map((id) => `<span class="tag">${ELEMENT_ICON[SKILLS[id]!.element] ?? ''}${esc(SKILLS[id]!.nameTh)}</span>`).join(' ')}</div>
    ${presets.length ? `<h4>ชุดแนะนำ (กดแล้วปรับต่อได้)</h4><div class="presets">${presetBtns}</div>` : ''}
    <h4>สกิลใช้งาน (ทอยทุกเทิร์น)</h4>${active}
    <h4>สกิลตอบโต้ (ทำงานเมื่อเกิดเหตุการณ์)</h4>${reactive}`;
}

function itemLine(id: string, extra = ''): string {
  const def = EQUIPMENT[id];
  if (!def) return esc(CONSUMABLES[id]?.nameTh ?? id);
  const stats = Object.entries(def.modifiers.flat ?? {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ');
  return `<span style="color:${RARITY_COLOR[def.rarity]}">■</span> <b>${esc(def.nameTh)}</b> <small>${esc(stats)}${extra}</small>`;
}

function bagPanel(s: SaveData): string {
  const slots = (Object.keys(SLOT_TH) as EquipSlot[]).map((slot) => {
    const eq = s.equipment[slot];
    if (!eq) return `<div class="slot empty"><span>${SLOT_TH[slot]}</span><em>ว่าง</em></div>`;
    const def = EQUIPMENT[eq.itemId]!;
    const broken = eq.durability <= 0;
    return `<div class="slot ${broken ? 'broken' : ''}"><span>${SLOT_TH[slot]}</span>
      <div>${itemLine(eq.itemId)}<br><small>ความทนทาน ${eq.durability}/${def.maxDurability}${broken ? ' — พัง! (ไม่มีผล)' : ''}</small></div>
      <button class="mini" data-unequip="${slot}">ถอด</button></div>`;
  }).join('');
  const gear = s.gearBag
    .map((g, i) => `<div class="row">${itemLine(g.itemId, ` · ${g.durability}/${EQUIPMENT[g.itemId]?.maxDurability}`)}
      <span class="spacer"></span><button class="mini" data-equip="${i}">สวม</button><button class="mini" data-sell="${i}">ขาย</button></div>`)
    .join('');
  const cons = Object.entries(s.bag)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `<div class="row"><b>${esc(CONSUMABLES[id]?.nameTh ?? id)}</b> ×${n}<span class="spacer"></span>
      <button class="mini" data-use="${id}">ใช้</button></div>`)
    .join('');
  return `<h2>🎒 กระเป๋า <small>🪙 ${s.gold.toLocaleString()} · ฝากไว้ ${s.bankGold.toLocaleString()}</small></h2>
    <h3>สวมใส่อยู่ (Paperdoll)</h3>${slots}
    <h3>อุปกรณ์ในกระเป๋า</h3>${gear || '<p class="muted">ว่าง</p>'}
    <h3>ไอเทมใช้แล้วหมด</h3>${cons || '<p class="muted">ว่าง</p>'}`;
}

function shopList(ids: string[]): string {
  return ids
    .map((id) => {
      const price = EQUIPMENT[id]?.price ?? CONSUMABLES[id]?.price ?? 0;
      return `<div class="row">${itemLine(id)}<span class="spacer"></span><button class="mini" data-buy="${id}" data-price="${price}">🪙 ${price}</button></div>`;
    })
    .join('');
}

function homePanel(s: SaveData): string {
  const pos = walk.position;
  const here = pos && nearHome(s, pos.lat, pos.lng);
  if (!s.home || !here) {
    const canSet = !s.home || Date.now() - s.home.setAt >= 30 * 86400_000;
    return `<h2>🏠 Home Base</h2>
      <p>บ้านใช้ฝากเงิน (ปลอดภัยเมื่อตาย), พักฟื้นเต็ม, ซ่อมราคาครึ่งเดียว และซื้อของ</p>
      <p class="muted">รอบบ้าน 200 ม. เป็นเขตปลอดภัย — คนอื่นจะไม่เห็นตัวละครคุณบนเรดาร์</p>
      ${s.home ? '<p>คุณอยู่ไกลจากบ้าน — เดินกลับไปที่ไอคอน 🏠 บนแผนที่</p>' : ''}
      ${canSet ? `<button class="btn primary" data-act="sethome">ตั้งบ้านที่ตำแหน่งนี้</button>` : `<p class="muted">ย้ายบ้านได้อีกครั้งใน ${Math.ceil((s.home!.setAt + 30 * 86400_000 - Date.now()) / 86400_000)} วัน</p>`}`;
  }
  const cost = repairAllCost(s, true);
  return `<h2>🏠 บ้านของคุณ</h2>
    <div class="row"><b>ธนาคาร</b><span class="spacer"></span>ถือ ${s.gold.toLocaleString()} · ฝาก ${s.bankGold.toLocaleString()}</div>
    <div class="row"><button class="btn" data-bank="all">ฝากทั้งหมด</button><button class="btn" data-bank="-all">ถอนทั้งหมด</button></div>
    <div class="row"><button class="btn primary" data-act="rest">😴 พักฟื้น HP/MP เต็ม</button>
      <button class="btn" data-act="repairhome" ${cost ? '' : 'disabled'}>🔧 ซ่อมทั้งหมด (🪙 ${cost})</button></div>
    <h3>ร้านค้าบ้าน</h3>${shopList(HOME_SHOP)}`;
}

function smithPanel(s: SaveData): string {
  const cost = repairAllCost(s, false);
  return `<h2>🔨 ร้านตีเหล็ก (ปั๊มน้ำมัน)</h2>
    <p class="muted">ซ่อมได้ทุกที่ที่มีปั๊ม — ราคาเต็ม (ที่บ้านถูกกว่าครึ่ง)</p>
    <button class="btn primary" data-act="repairsmith" ${cost ? '' : 'disabled'}>🔧 ซ่อมทั้งหมด (🪙 ${cost})</button>
    <h3>สินค้า</h3>${shopList(SMITH_SHOP)}`;
}

function trialPanel(): string {
  const list = (Object.keys(CLASSES) as ClassId[])
    .filter((c) => c !== 'NOVICE')
    .map((c) => {
      const k = CLASSES[c];
      return `<button class="choice" data-class="${c}"><b>${esc(k.nameTh)} (${esc(k.nameEn)})</b>
        <span>${esc(k.role)} · ${k.mainStats.map((x) => x.toUpperCase()).join('/')}</span>
        <span>${esc(k.passive.name)}: ${esc(k.passive.description)}</span></button>`;
    })
    .join('');
  return `<h2>🏛️ วิหารแห่งการทดสอบ</h2>
    <p>เลือกอาชีพได้ <b>ครั้งเดียวตลอดไป</b> — ชนะบททดสอบแล้วจะเปลี่ยนอาชีพทันที</p>
    <div class="choices">${list}</div>`;
}

function settingsPanel(): string {
  return `<h2>⚙️ ตั้งค่า</h2>
    <button class="btn primary" data-act="arena">🧪 สนามทดสอบการต่อสู้</button>
    <div class="row"><b>โหมดจำลองการเดิน</b><span class="spacer"></span>
      ${walk.simulated ? '<span class="good">เปิดอยู่</span>' : '<button class="btn" data-act="sim">เปิด (สำหรับทดสอบบนคอม)</button>'}</div>
    <p class="muted">คอมพิวเตอร์: ใช้ปุ่ม WASD / ลูกศร เดิน, กด Shift ค้างเพื่อวิ่งเร็ว (เร็วเกิน 20 กม./ชม. จะต่อสู้ไม่ได้)</p>
    <p class="muted">ข้อมูลแผนที่ © OpenStreetMap contributors (ODbL)</p>
    <button class="btn danger" data-act="reset">ลบเซฟและเริ่มใหม่</button>`;
}

function wirePanel(body: HTMLElement) {
  const on = (sel: string, fn: (el: HTMLElement) => void) =>
    body.querySelectorAll<HTMLElement>(sel).forEach((x) => x.addEventListener('click', () => fn(x)));

  on('[data-alloc]', (x) => allocate(x.dataset.alloc as StatKey, 1));
  on('[data-alloc5]', (x) => allocate(x.dataset.alloc5 as StatKey, 5));
  on('[data-preset]', (x) => {
    const p = (DECK_PRESETS[store.s.classId] ?? []).find((d) => d.id === x.dataset.preset);
    if (!p) return;
    store.update((st) => (st.loadout = [...p.deck]));
    toast(`ใช้ชุด ${p.nameTh} แล้ว — ปรับเพิ่ม/ลดได้เลย`, 'good');
  });
  on('[data-deck]', (x) => {
    const id = x.dataset.deck!;
    store.update((st) => {
      const cur = effectiveLoadout(st);
      if (cur.includes(id)) st.loadout = cur.filter((k) => k !== id);
      else if (cur.length < LOADOUT_SIZE) st.loadout = [...cur, id];
      else toast(`ชุดสกิลเต็มแล้ว (สูงสุด ${LOADOUT_SIZE})`, 'bad');
    });
  });
  on('[data-act="respec"]', () => {
    if (confirm('คืนแต้ม Stat ทั้งหมด?') && !respec()) toast('Gold ไม่พอ', 'bad');
  });
  on('[data-equip]', (x) => equip(Number(x.dataset.equip)));
  on('[data-unequip]', (x) => unequip(x.dataset.unequip as EquipSlot));
  on('[data-sell]', (x) => toast(`ขายได้ ${sellGear(Number(x.dataset.sell))} Gold`, 'good'));
  on('[data-use]', (x) => usePotion(x.dataset.use!));
  on('[data-buy]', (x) => {
    if (!buy(x.dataset.buy!, Number(x.dataset.price))) toast('Gold ไม่พอ', 'bad');
  });
  on('[data-bank]', (x) => bank(x.dataset.bank === 'all' ? store.s.gold : -store.s.bankGold));
  on('[data-act="rest"]', () => {
    restAtHome();
    toast('พักผ่อนเต็มที่แล้ว', 'good');
  });
  on('[data-act="repairhome"]', () => repairAll(true) || toast('Gold ไม่พอ', 'bad'));
  on('[data-act="repairsmith"]', () => repairAll(false) || toast('Gold ไม่พอ', 'bad'));
  on('[data-act="sethome"]', () => {
    const p = walk.position;
    if (p && setHome(p.lat, p.lng)) toast('ตั้งบ้านเรียบร้อย!', 'good');
    renderPanel();
  });
  on('[data-class]', (x) => {
    const classId = x.dataset.class as ClassId;
    if (!confirm(`เลือก ${CLASSES[classId].nameTh}? เปลี่ยนไม่ได้อีกแล้ว`)) return;
    closePanel();
    bus.emit('battle:start', { kind: 'TRIAL', monsterIds: [], trialClass: classId });
  });
  on('[data-act="arena"]', () => openPanel('arena'));
  on('[data-act="sim"]', () => {
    walk.enableSimulation();
    renderPanel();
  });
  on('[data-act="reset"]', () => {
    if (!confirm('ลบตัวละครถาวร?')) return;
    store.reset();
    location.reload();
  });
}
