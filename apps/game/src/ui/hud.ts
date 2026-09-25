/** DOM UI: HUD, walk controls, landmark card, panels. Flat-vector style over the Phaser canvas. */
import {
  CLASSES,
  CLASS_CHANGE_LEVEL,
  CONSUMABLES,
  EQUIPMENT,
  itemName,
  shopForLandmark,
  gateRank,
  hospitalCost,
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
  assignDeckSlot,
  clearDeckSlot,
  totalStats,
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
  claimDaily,
  claimDailyBonus,
  dailyQuests,
  hospitalHeal,
  sanctuaryReadyAt,
  sanctuaryRest,
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
import { equipWindowHtml, gearStatBonus, itemIcon, statText, wireEquipWindow, SLOT_NAME } from './equipWindow';
import { paperdollOf } from '../game/paperdoll';
import { uiIcon } from './pixel';
import { audioSettings, setAudio, sfx } from '../game/audio';
import { bagWindowHtml, wireBagWindow } from './bagWindow';
import { bankWindowHtml, repairWindowHtml } from './homeWindows';
import { openShopState, shopWindowHtml, wireShopWindow } from './shopWindow';
import { charTabs, skillWindowHtml } from './skillWindow';
import { autoHunt } from '../game/autohunt';
import { mountChat } from './chat';
import { SYS, playerRank, questWindowHtml, questsClaimable, rankChip, systemNotice } from './systemUi';


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
  // The awakening (docs/STORY.md §1), then appearance + starter gear on one page.
  const intro = el(`<div class="onboard sys-intro"><div class="sys-win intro-win">
    <div class="sys-title"><span>${uiIcon('gate', true)}${SYS}</span><small>การตื่นรู้</small></div>
    <p class="intro-line">คืนนี้ <b>รอยแยกพิกเซล</b> เปิดขึ้นทุกเมืองทั่วโลก ของรอบตัวคุณเริ่มกลายเป็นพิกเซล และมีบางอย่างกำลังคลานออกมา…</p>
    <p class="intro-line">${SYS} ตรวจพบผู้มีคุณสมบัติ · แรงก์ E</p>
    <p class="intro-line">ปราบมอนสเตอร์เพื่อเก็บเลเวล · ปิดประตูมิติที่ร้านค้า ปั๊ม ห้าง และสถานี · ยิ่งประตูลึกยิ่งเจอตำนานเก่าที่หลับอยู่</p>
    <p class="intro-ask"><b>คุณจะรับการตื่นรู้เป็น Walker หรือไม่?</b></p>
    <button type="button" class="btn primary intro-go" data-awaken>ยอมรับ</button>
  </div></div>`);
  root().appendChild(intro);
  intro.querySelector('[data-awaken]')!.addEventListener('click', () => {
    intro.remove();
    showCreator(root(), (name, appearance, loadout) => {
      store.create(name, appearance);
      store.update((s) => applyStarter(s, loadout));
      systemNotice(`ยินดีต้อนรับ Walker ${name}`, ['เควสรายวันพร้อมแล้ว — ดูที่ปุ่ม "เควส"'], 'info');
      onDone();
    });
  });
}

// ---------------------------------------------------------------------------------------------
// HUD

export function mountHud() {
  const hud = el(`<div class="hud">
    <div class="topbar" data-open="char"></div>
    <div class="net-pill offline"><i class="dot"></i><span>ออฟไลน์</span></div>
    <div class="near"></div>
    <div class="joystick hidden"><div class="stick"></div></div>
    <div class="sim-tools hidden"><button class="sim-speed" data-simspeed title="ความเร็วโหมดจำลอง (ทดสอบ)"></button><button class="sim-home" data-simhome title="วาร์ปกลับจุดเริ่ม (คูเมืองเชียงใหม่)">${uiIcon('pin')}</button></div>
    <div class="zoom"><button data-zoom="1" aria-label="ซูมเข้า">${uiIcon('plus')}</button><button data-zoom="-1" aria-label="ซูมออก">${uiIcon('minus')}</button><button data-zoom="0" aria-label="หันทิศเหนือ">${uiIcon('compass')}</button><button class="auto-btn" data-autohunt aria-label="ล่าอัตโนมัติ">${uiIcon('auto')}<small>AUTO</small></button></div>
    <div class="bottombar">
      <button class="menu-btn" data-open="char">${uiIcon('char')}<span>ตัวละคร</span></button>
      <button class="menu-btn" data-open="bag">${uiIcon('bag')}<span>กระเป๋า</span></button>
      <button class="menu-btn" data-open="party">${uiIcon('party')}<span>ปาร์ตี้</span><i class="badge hidden"></i></button>
      <button class="menu-btn" data-open="quests">${uiIcon('quest')}<span>เควส</span><i class="badge q-badge hidden"></i></button>
      <button class="menu-btn" data-open="home">${uiIcon('home')}<span>บ้าน</span></button>
      <button class="menu-btn" data-open="settings">${uiIcon('settings')}<span>ตั้งค่า</span></button>
    </div>
    <div class="toasts"></div>
  </div>`);
  root().appendChild(hud);
  mountChat(hud);

  hud.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-simspeed]')) {
      walk.cycleSimSpeed();
      return renderSimSpeed();
    }
    if ((e.target as HTMLElement).closest('[data-simhome]')) {
      walk.teleport(DEFAULT_POS.lat, DEFAULT_POS.lng);
      return toast('วาร์ปกลับคูเมือง · คลิกขวา/กดค้างบนแผนที่เพื่อวาร์ปไปจุดนั้น');
    }
    if ((e.target as HTMLElement).closest('[data-autohunt]')) return autoHunt.toggle();
    const z = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
    if (z) return bus.emit('zoom', { delta: Number(z.dataset.zoom) });
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-open],[data-act]');
    if (!t) return;
    if (t.dataset.open === 'home') return enterHome();
    if (t.dataset.open) openPanel(t.dataset.open);
  });

  const render = () => {
    renderTopbar(hud.querySelector('.topbar')!, store.s);
    renderNear(hud.querySelector('.near')!);
    const qb = hud.querySelector<HTMLElement>('.q-badge')!;
    const n = store.s.daily ? questsClaimable(store.s.daily) : 0;
    qb.classList.toggle('hidden', !n);
    qb.textContent = n ? String(n) : '';
  };
  store.subscribe(render);
  bus.on('landmark:near', ({ landmarks }) => {
    near = landmarks;
    renderNear(hud.querySelector('.near')!);
  });
  const renderSimSpeed = () => {
    hud.querySelector('.sim-tools')!.classList.toggle('hidden', !walk.simulated);
    const b = hud.querySelector<HTMLElement>('.sim-speed')!;
    b.innerHTML = `${uiIcon('run')}<b>${walk.simSpeed}×</b>`;
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
    pill.querySelector('span')!.textContent = connected ? `ออนไลน์ ${online} คน` : 'ออฟไลน์';
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
      <span class="tag">Lv.${s.level} ${esc(CLASSES[s.classId].nameTh)}</span>${playerRank(s.level)}
      ${mut ? `<span class="tag mut">${esc(MUTATIONS[mut].titleTh)}</span>` : ''}
      ${s.unspentPoints ? `<span class="badge">+${s.unspentPoints}</span>` : ''}
    </div>
    <div class="bars">
      <label>HP</label>${bar(s.hp, d.maxHp, 'hp')}<small>${s.hp}/${d.maxHp}</small>
      <label>MP</label>${bar(s.mp, d.maxMp, 'mp')}<small>${s.mp}/${d.maxMp}</small>
      <label>EXP</label>${bar(s.exp, next, 'exp')}<small>${Number.isFinite(next) ? Math.floor((s.exp / next) * 100) + '%' : 'MAX'}</small>
    </div>
    <div class="gold">${uiIcon('coin', true)}${s.gold.toLocaleString()}</div>`;
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
    const shop = shopForLandmark(l.kind);
    const shopBtn = shop ? `<button class="btn primary" data-shop="${shop.id}">${uiIcon('bag', true)}${esc(shop.nameTh)}</button>` : '';
    if (l.kind === 'HOSPITAL') {
      const cost = hospitalCost(s.level);
      const d = derivedOf(s);
      if (s.hp >= d.maxHp && s.mp >= d.maxMp) {
        return `<div class="lm-card svc"><div class="lm-title">${uiIcon('heart', true)}${esc(l.label)} <small>จุดรักษาของสมาคม Walker</small></div>
        <div class="lm-actions"><button class="btn" disabled>HP/MP เต็มอยู่แล้ว</button></div></div>`;
      }
      return `<div class="lm-card svc"><div class="lm-title">${uiIcon('heart', true)}${esc(l.label)} <small>จุดรักษาของสมาคม Walker</small></div>
        <div class="lm-sub">ฟื้นฟู HP/MP เต็มทันที</div>
        <div class="lm-actions"><button class="btn primary" data-hospital ${s.gold >= cost ? '' : 'disabled'}>รักษา ${uiIcon('coin', true)}${cost}</button></div></div>`;
    }
    if (l.kind === 'SANCTUARY') {
      const wait = sanctuaryReadyAt(s) - now;
      return `<div class="lm-card svc"><div class="lm-title">${uiIcon('star', true)}${esc(l.label)} <small>เขตศักดิ์สิทธิ์</small></div>
        <div class="lm-sub">รอยแยกเปิดใกล้ที่นี่ไม่ได้ · พักใจฟื้นฟู HP/MP ครึ่งหนึ่ง</div>
        <div class="lm-actions">${
          s.hp >= derivedOf(s).maxHp && s.mp >= derivedOf(s).maxMp
            ? '<button class="btn" disabled>HP/MP เต็มอยู่แล้ว</button>'
            : wait > 0
              ? `<button class="btn" disabled>พักได้อีกใน ${fmtWait(wait)}</button>`
              : '<button class="btn primary" data-bless>พักใจ</button>'
        }</div></div>`;
    }
    const bossId = bossIdFor(l);
    const boss = bossId ? MONSTERS[bossId] : undefined;
    if (!boss) {
      return `<div class="lm-card svc"><div class="lm-title">${uiIcon('bag', true)}${esc(l.label)}</div>
        <div class="lm-actions">${shopBtn}</div></div>`;
    }
    const at = bossAvailableAt(l, s, now);
    const ready = at <= now;
    const wb = boss.boss?.worldBoss;
    const hpInfo = wb && ready ? ` · HP ${worldBossHp(l, s).toLocaleString()}/${boss.hp.toLocaleString()}` : '';
    const trial = l.kind === 'PARK' && canChangeClass(s.classId, s.level);
    const wbWait = wb && ready ? worldBossReadyAt(l, s) - now : 0;
    const rank = gateRank(l.kind);
    return `<div class="lm-card gate">
      <div class="lm-title">${rank ? rankChip(rank) : ''}${uiIcon('gate', true)}ประตูมิติ · ${esc(l.label)}</div>
      <div class="lm-sub">${esc(boss.nameTh)} Lv.${boss.level}${wb ? ' (บอสโลก)' : ''} — ${ready ? `<b class="good">ประตูเปิดอยู่!</b>${hpInfo}` : `ประตูปิด เปิดใหม่ใน ${fmtWait(at - now)}`}</div>
      <div class="lm-actions">
        ${ready && wbWait <= 0 ? `<button class="btn danger" data-boss="${l.id}">${uiIcon('swords', true)}เข้าประตู</button>` : ''}
        ${ready && wbWait > 0 ? `<button class="btn" disabled>พักฟื้น ${fmtWait(wbWait)}</button>` : ''}
        ${shopBtn}
        ${trial ? `<button class="btn primary" data-trial="${l.id}">${uiIcon('star', true)}บททดสอบอาชีพ</button>` : ''}
      </div></div>`;
  });
  if (home) cards.unshift(`<div class="lm-card home"><div class="lm-title">${uiIcon('home', true)}บ้านของคุณ</div>
    <div class="lm-actions"><button class="btn primary" data-open="home">เข้าบ้าน</button></div></div>`);
  if (pendingEncounter) {
    const names = pendingEncounter.monsterIds.map((id) => `${MONSTERS[id]!.nameTh} Lv.${MONSTERS[id]!.level}`).join(' + ');
    const lowHp = s.hp < derivedOf(s).maxHp * 0.3;
    cards.unshift(`<div class="lm-card encounter"><div class="lm-title">${uiIcon('swords', true)}มอนสเตอร์ปรากฏ!</div>
      <div class="lm-sub">${esc(names)}${lowHp ? ' — <b class="bad">HP ต่ำ!</b>' : ''}</div>
      <div class="lm-actions"><button class="btn danger" data-fight>สู้</button><button class="btn" data-skip>ข้าม</button></div></div>`);
  }
  const target = inRange[0];
  if (target) {
    const m = MONSTERS[target.monsterId]!;
    const low = s.hp < derivedOf(s).maxHp * 0.3;
    cards.unshift(`<div class="lm-card fight"><div class="lm-title">${uiIcon('swords', true)}มอนสเตอร์ในรัศมี ${inRange.length} ตัว${autoHunt.enabled ? ` · ${uiIcon('auto', true)}ล่าอัตโนมัติ` : ''}</div>
      <div class="lm-sub">ใกล้สุด: ${esc(m.nameTh)} Lv.${m.level} — แตะตัวไหนบนแผนที่ก็สู้ได้${low ? ' — <b class="bad">HP ต่ำ!</b>' : ''}</div>
      <div class="lm-actions"><button class="btn danger" data-fight-spawn="${esc(target.id)}">${uiIcon('swords', true)}สู้</button></div></div>`);
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
  box.querySelectorAll<HTMLElement>('[data-shop]').forEach((b) => b.addEventListener('click', () => openPanel(`shop:${b.dataset.shop}`)));
  box.querySelector('[data-hospital]')?.addEventListener('click', () => {
    if (!hospitalHeal()) return toast('Gold ไม่พอ', 'bad');
    sfx('heal');
    toast('รักษาเสร็จ HP/MP เต็มแล้ว', 'good');
  });
  box.querySelector('[data-bless]')?.addEventListener('click', () => {
    if (!sanctuaryRest()) return;
    sfx('holy');
    toast('จิตใจสงบลง HP/MP ฟื้นฟูครึ่งหนึ่ง', 'good');
    renderNear(box);
  });
  box.querySelectorAll<HTMLElement>('[data-trial]').forEach((b) => b.addEventListener('click', () => openPanel('trial')));
}

function showToast(box: HTMLElement, text: string, kind: string) {
  const t = el(`<div class="toast ${kind}"><i class="sys-tag">${SYS}</i> ${esc(text)}</div>`);
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

/** Inside the house when standing at home; otherwise the panel to set a home / walk back. */
export function enterHome() {
  const pos = walk.position;
  if (store.s.home && pos && nearHome(store.s, pos.lat, pos.lng)) {
    closePanel(true);
    bus.emit('home:enter');
  } else openPanel('home');
}

export function openPanel(name: string) {
  closePanel(true);
  if (name.startsWith('shop:')) openShopState(name.slice(5));
  sfx('open');
  lastPartyHtml = '';
  panelName = name;
  panelEl = el(`<div class="sheet-backdrop"><div class="sheet"><button class="close" aria-label="ปิด">${uiIcon('close')}</button><div class="sheet-body"></div></div></div>`);
  root().appendChild(panelEl);
  panelEl.addEventListener('click', (e) => {
    if (e.target === panelEl || (e.target as HTMLElement).closest('.close')) closePanel();
  });
  unsubPanel = store.subscribe(renderPanel);
  renderPanel();
}

export function closePanel(quiet = false) {
  if (panelEl && !quiet) sfx('close');
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
  if (panelName.startsWith('shop:')) body.innerHTML = shopWindowHtml(s);
  switch (panelName) {
    case 'char':
      body.innerHTML = charPanel(s);
      break;
    case 'bag':
      body.innerHTML = bagWindowHtml(s);
      break;
    case 'home':
      body.innerHTML = homePanel(s);
      break;
    case 'quests':
      body.innerHTML = questWindowHtml(dailyQuests(), s.level);
      break;
    case 'hbank':
      body.innerHTML = bankWindowHtml(s);
      break;
    case 'hrepair':
      body.innerHTML = repairWindowHtml(s);
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
        wireParty(body, closePanel, () => {
          lastPartyHtml = '';
          renderPanel();
        });
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
  if (panelName === 'bag') wireBagWindow(body, renderPanel);
  if (panelName.startsWith('shop:')) wireShopWindow(body, renderPanel);
  if (panelName === 'quests') {
    body.querySelectorAll<HTMLElement>('[data-claim]').forEach((b) =>
      b.addEventListener('click', () => {
        const r = claimDaily(Number(b.dataset.claim));
        if (!r) return;
        sfx('coin');
        toast(`รับรางวัลเควส: EXP ${r.exp.toLocaleString()} · ${r.gold.toLocaleString()} Gold`, 'good');
      }),
    );
    body.querySelector('[data-claim-bonus]')?.addEventListener('click', () => {
      if (!claimDailyBonus()) return;
      sfx('levelup');
      systemNotice('เควสรายวันครบทั้งหมด!', ['ได้รับแต้มสเตตัส +1 และยา HP ×3'], 'gold');
    });
  }
  if (panelName === 'char') {
    const on = (sel: string, fn: (el: HTMLElement) => void) =>
      body.querySelectorAll<HTMLElement>(sel).forEach((x) => x.addEventListener('click', () => fn(x)));
    on('[data-chartab]', (x) => {
      charTab = x.dataset.chartab as 'equip' | 'skill';
      renderPanel();
    });
    on('[data-skslot]', (x) => {
      const i = Number(x.dataset.skslot);
      skillSlot = skillSlot === i ? null : i;
      renderPanel();
    });
    on('[data-skpick]', (x) => {
      if (skillSlot === null) return;
      const slot = skillSlot;
      store.update((st) => (st.loadout = assignDeckSlot(effectiveLoadout(st), slot, x.dataset.skpick!, LOADOUT_SIZE)));
    });
    on('[data-skremove]', (x) => {
      store.update((st) => (st.loadout = clearDeckSlot(effectiveLoadout(st), Number(x.dataset.skremove))));
    });
    wireEquipWindow(
      body,
      (slot) => {
        charSlot = charSlot === slot ? null : slot;
        renderPanel();
      },
      () => paperdollOf(store.s),
    );
  }
}

/** Slot selected in the character panel's equipment window. */
let charSlot: EquipSlot | null = null;
/** Character panel tab (RO style: equipment / skill) and the selected skill-deck slot. */
let charTab: 'equip' | 'skill' = 'equip';
let skillSlot: number | null = 0;

function charSkillWindow(s: SaveData): string {
  const deck = effectiveLoadout(s);
  return skillWindowHtml({
    title: 'สกิล',
    tabs: charTabs('skill'),
    deck,
    pool: learnableSkills(s),
    selected: skillSlot,
    presets: (DECK_PRESETS[s.classId] ?? []).map((p) => ({
      id: p.id,
      nameTh: p.nameTh,
      description: p.description,
      on: p.deck.length === deck.length && p.deck.every((id) => deck.includes(id)),
    })),
  });
}

function charEquipWindow(s: SaveData): string {
  const slots = Object.fromEntries(
    (Object.keys(SLOT_NAME) as EquipSlot[]).map((slot) => {
      const eq = s.equipment[slot];
      return [slot, eq ? { itemId: eq.itemId, durability: eq.durability, max: EQUIPMENT[eq.itemId]?.maxDurability } : null];
    }),
  );
  let picker = '';
  if (charSlot) {
    const eq = s.equipment[charSlot];
    const worn = eq
      ? `<div class="pick on">${itemIcon(eq.itemId, 'pick-ico')}<span><b>${esc(EQUIPMENT[eq.itemId]?.nameTh ?? eq.itemId)}</b>
          <small>${statText(eq.itemId)} · ${eq.durability}/${EQUIPMENT[eq.itemId]?.maxDurability}${eq.durability <= 0 ? ' — พัง! (ไม่มีผล)' : ''}</small></span>
          <button type="button" class="mini" data-unequip="${charSlot}">ถอด</button></div>`
      : '';
    const bag = s.gearBag
      .map((g, i) => ({ g, i }))
      .filter(({ g }) => EQUIPMENT[g.itemId]?.slot === charSlot)
      .map(({ g, i }) => `<div class="pick">${itemIcon(g.itemId, 'pick-ico')}<span><b>${esc(EQUIPMENT[g.itemId]!.nameTh)}</b>
          <small>${statText(g.itemId)} · ${g.durability}/${EQUIPMENT[g.itemId]!.maxDurability}</small></span>
          <button type="button" class="mini" data-equip="${i}">สวม</button></div>`)
      .join('');
    picker = worn + (bag || `<p class="muted pick-empty">ไม่มี${SLOT_NAME[charSlot]}ในกระเป๋า — หาได้จากมอนสเตอร์หรือซื้อที่บ้าน</p>`);
  }
  const wornIds = Object.values(s.equipment).filter((e) => e && e.durability > 0).map((e) => e!.itemId);
  const d = derivedOf(s);
  return equipWindowHtml({
    title: 'ไอเทมที่สวมใส่',
    tabs: charTabs('equip'),
    slots,
    selected: charSlot,
    picker,
    stats: totalStats(s.allocated),
    bonus: gearStatBonus(wornIds),
    derived: d,
    statPoints: s.unspentPoints,
    extra: [['Drop', `×${d.dropRate.toFixed(2)}`]],
  });
}

function charPanel(s: SaveData): string {
  const mut = mutationOf(s);
  const prog = mutationProgress(s.allocated);
  const mutText = mut
    ? `<div class="mut-box on"><b>${esc(MUTATIONS[mut].titleTh)}</b> — ${esc(MUTATIONS[mut].passive)}<br>
        ✅ ${MUTATIONS[mut].upside.map(esc).join('<br>✅ ')}${MUTATIONS[mut].downside.length ? '<br>⚠️ ' + MUTATIONS[mut].downside.map(esc).join('<br>⚠️ ') : ''}</div>`
    : `<div class="mut-box">Extreme Mutation: ต้อง Lv.${MUTATION_MIN_LEVEL}+ และ Stat เดียว ≥ ${MUTATION_THRESHOLD * 100}%
        <div class="mut-prog">${bar(prog.share, MUTATION_THRESHOLD, 'mut')}<small>${prog.stat.toUpperCase()} ${(prog.share * 100).toFixed(0)}%</small></div></div>`;
  return `<h2>${esc(s.name)} <small>Lv.${s.level} ${esc(CLASSES[s.classId].nameTh)}</small></h2>
    <p class="muted">${esc(CLASSES[s.classId].passive.name)}: ${esc(mut ? 'ถูกแทนที่ด้วย Mutation' : CLASSES[s.classId].passive.description)}</p>
    ${charTab === 'skill' ? charSkillWindow(s) : charEquipWindow(s)}
    ${charTab === 'equip' ? `<p class="muted">แตะช่องอุปกรณ์เพื่อถอด/สวมของในกระเป๋า · ${s.unspentPoints ? `มี Status Point <b class="accent">${s.unspentPoints}</b> — กด + ที่ค่าสถานะ` : 'เก็บเลเวลเพื่อรับ Status Point'}</p>` : ''}
    ${mutText}
    <h3>สถิติ</h3>
    <div class="grid2">
      <span>ชนะ</span><b>${s.stats.battlesWon}</b><span>บอส</span><b>${s.stats.bossesKilled}</b>
    </div>
    ${s.level < CLASS_CHANGE_LEVEL && s.classId === 'NOVICE' ? `<p class="muted">ถึง Lv.${CLASS_CHANGE_LEVEL} แล้วไปสวนสาธารณะใหญ่เพื่อทำบททดสอบอาชีพ</p>` : ''}
    <button class="btn" data-act="respec">รีเซ็ต Stat (${respecCost(s) ? respecCost(s) + ' Gold' : 'ฟรีก่อน Lv.10'})</button>`;
}

function homePanel(s: SaveData): string {
  const pos = walk.position;
  const here = pos && nearHome(s, pos.lat, pos.lng);
  if (!s.home || !here) {
    const canSet = !s.home || Date.now() - s.home.setAt >= 30 * 86400_000;
    return `<h2>${uiIcon('home')}Home Base</h2>
      <p>บ้านใช้ฝากเงิน (ปลอดภัยเมื่อตาย), พักฟื้นเต็ม, ซ่อมราคาครึ่งเดียว และซื้อของ</p>
      <p class="muted">รอบบ้าน 200 ม. เป็นเขตปลอดภัย — คนอื่นจะไม่เห็นตัวละครคุณบนเรดาร์</p>
      ${s.home ? '<p>คุณอยู่ไกลจากบ้าน — เดินกลับไปที่ไอคอนบ้านบนแผนที่</p>' : ''}
      ${canSet ? `<button class="btn primary" data-act="sethome">ตั้งบ้านที่ตำแหน่งนี้</button>` : `<p class="muted">ย้ายบ้านได้อีกครั้งใน ${Math.ceil((s.home!.setAt + 30 * 86400_000 - Date.now()) / 86400_000)} วัน</p>`}`;
  }
  return `<h2>${uiIcon('home')}บ้านของคุณ</h2>
    <p>คุณอยู่ที่บ้านแล้ว</p>
    <button class="btn primary" data-act="enterhome">${uiIcon('home', true)}เข้าบ้าน</button>`;
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
  return `<h2>${uiIcon('star')}วิหารแห่งการทดสอบ</h2>
    <p>เลือกอาชีพได้ <b>ครั้งเดียวตลอดไป</b> — ชนะบททดสอบแล้วจะเปลี่ยนอาชีพทันที</p>
    <div class="choices">${list}</div>`;
}

function settingsPanel(): string {
  return `<h2>${uiIcon('settings')}ตั้งค่า</h2>
    <button class="btn primary" data-act="arena">${uiIcon('swords', true)}สนามทดสอบการต่อสู้</button>
    ${audioRows()}
    <div class="row"><b>โหมดจำลองการเดิน</b><span class="spacer"></span>
      ${walk.simulated ? '<span class="good">เปิดอยู่</span>' : '<button class="btn" data-act="sim">เปิด (สำหรับทดสอบบนคอม)</button>'}</div>
    <p class="muted">คอมพิวเตอร์: ใช้ปุ่ม WASD / ลูกศร เดิน, กด Shift ค้างเพื่อวิ่งเร็ว (เร็วเกิน 20 กม./ชม. จะต่อสู้ไม่ได้)</p>
    <p class="muted">ข้อมูลแผนที่ © OpenStreetMap contributors (ODbL)</p>
    <button class="btn danger" data-act="reset">ลบเซฟและเริ่มใหม่</button>`;
}

function audioRows(): string {
  const a = audioSettings();
  const row = (key: 'music' | 'sfx', label: string, vol: number) => `<div class="row audio-row"><b>${label}</b><span class="spacer"></span>
    <input type="range" min="0" max="100" step="5" value="${Math.round(vol * 100)}" data-vol="${key}" ${a[key] ? '' : 'disabled'} aria-label="ระดับ${label}" />
    <button class="btn ${a[key] ? 'primary' : ''}" data-audio="${key}">${a[key] ? 'เปิด' : 'ปิด'}</button></div>`;
  return row('music', 'เพลง', a.musicVol) + row('sfx', 'เสียงเอฟเฟกต์', a.sfxVol);
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
  on('[data-act="respec"]', () => {
    if (confirm('คืนแต้ม Stat ทั้งหมด?') && !respec()) toast('Gold ไม่พอ', 'bad');
  });
  on('[data-equip]', (x) => {
    const i = Number(x.dataset.equip);
    const def = EQUIPMENT[store.s.gearBag[i]?.itemId ?? ''];
    if (!equip(i) && def) toast(`${def.nameTh} ต้อง Lv.${def.level ?? 1} ขึ้นไป`, 'bad');
  });
  on('[data-unequip]', (x) => unequip(x.dataset.unequip as EquipSlot));
  on('[data-sell]', (x) => {
    toast(`ขายได้ ${sellGear(Number(x.dataset.sell))} Gold`, 'good');
    sfx('coin');
  });
  on('[data-use]', (x) => {
    usePotion(x.dataset.use!);
    sfx('heal');
  });
  on('[data-buy]', (x) => {
    const qty = Number(x.dataset.qty ?? 1);
    if (!buy(x.dataset.buy!, qty)) return toast('Gold ไม่พอ', 'bad');
    sfx('coin');
    toast(`ซื้อ ${itemName(x.dataset.buy!)}${qty > 1 ? ` ×${qty}` : ''} แล้ว`, 'good');
  });
  on('[data-bank]', (x) => {
    const v = x.dataset.bank!;
    bank(v === 'all' ? store.s.gold : v === '-all' ? -store.s.bankGold : Number(v));
    sfx('coin');
  });
  on('[data-act="enterhome"]', () => enterHome());
  on('[data-act="rest"]', () => {
    restAtHome();
    toast('พักผ่อนเต็มที่แล้ว', 'good');
  });
  on('[data-act="repairhome"]', () => {
    if (!repairAll(true)) return toast('Gold ไม่พอ', 'bad');
    sfx('block');
    toast('ซ่อมเสร็จ อุปกรณ์กลับมาใหม่เอี่ยม!', 'good');
  });
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
  on('[data-audio]', (x) => {
    const key = x.dataset.audio as 'music' | 'sfx';
    setAudio({ [key]: !audioSettings()[key] });
    renderPanel();
  });
  body.querySelectorAll<HTMLInputElement>('[data-vol]').forEach((r) =>
    r.addEventListener('change', () => {
      setAudio(r.dataset.vol === 'music' ? { musicVol: Number(r.value) / 100 } : { sfxVol: Number(r.value) / 100 });
      if (r.dataset.vol === 'sfx') sfx('coin');
    }),
  );
  on('[data-act="equipwin"]', () => openPanel('char'));
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
