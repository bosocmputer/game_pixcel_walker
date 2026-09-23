/**
 * Party window (MMORPG style): tab "ปาร์ตี้" = party frame with member cards + nearby players to
 * invite; tab "ดันเจี้ยน" = dungeon cards with the boss portrait. Solo players can run dungeons too.
 */
import {
  CLASSES,
  DUNGEON_BY_ID,
  DUNGEONS,
  MONSTERS,
  PARTY_MAX,
  PARTY_RANGE_M,
  haversine,
  type DungeonDef,
  type PlayerPresence,
  type RunTarget,
} from '@pw/shared';
import { bus, toast } from '../game/bus';
import { net } from '../game/net';
import { walk } from '../game/walk';
import { autoHunt } from '../game/autohunt';
import { paperdollOf } from '../game/paperdoll';
import { store } from '../state/store';
import { el, esc } from './dom';
import { uiIcon } from './pixel';
import { dollFromLook, portraitImg } from './portrait';

let tab: 'party' | 'dungeon' = 'party';

function distanceTo(p: { lat: number; lng: number }): number {
  const me = walk.position;
  return me ? haversine(me, p) : Infinity;
}

const fmtDist = (m: number) => (!Number.isFinite(m) ? '—' : m < 1000 ? `${Math.round(m)} ม.` : `${(m / 1000).toFixed(1)} กม.`);

function memberCard(opts: {
  portrait: string;
  name: string;
  level: number;
  classId: string;
  leader: boolean;
  me: boolean;
  chips: string[];
  action?: string;
}): string {
  return `<div class="pt-card ${opts.me ? 'me' : ''}">
    ${opts.portrait}
    <div class="pt-info">
      <b>${opts.leader ? uiIcon('star', true) : ''}${esc(opts.name)}${opts.me ? ' <small>(คุณ)</small>' : ''}</b>
      <small>Lv.${opts.level} · ${esc(CLASSES[opts.classId as keyof typeof CLASSES]?.nameTh ?? opts.classId)}</small>
      <span class="pt-chips">${opts.chips.join('')}</span>
    </div>
    ${opts.action ?? ''}
  </div>`;
}

const chip = (text: string, kind = '') => `<i class="pt-chip ${kind ? `c-${kind}` : ''}">${text}</i>`;

function partyTab(): string {
  const s = store.s;
  const party = net.party;
  const byId = new Map<string, PlayerPresence>(net.players.map((p) => [p.id, p]));
  const full = !!party && party.members.length >= PARTY_MAX;
  const canInvite = net.connected && net.isLeader && !full;

  // Party frame: always PARTY_MAX slots so the size of the group is obvious.
  const members = party
    ? party.members.map((m) => {
        const isMe = m.id === net.id;
        const pres = byId.get(m.id);
        const d = isMe ? 0 : pres ? distanceTo(pres) : Infinity;
        const chips = [
          m.online ? chip('ออนไลน์', 'on') : chip('ออฟไลน์', 'off'),
          pres?.busy ? chip('กำลังสู้', 'busy') : '',
          !isMe ? chip(d <= PARTY_RANGE_M ? `ใกล้ ${fmtDist(d)}` : `ไกล ${fmtDist(d)}`, d <= PARTY_RANGE_M ? 'near' : 'far') : '',
        ];
        const doll = isMe ? paperdollOf(s) : pres ? dollFromLook(pres.look) : null;
        const kick = net.isLeader && !isMe ? `<button type="button" class="mini danger-mini" data-kick="${esc(m.id)}">เชิญออก</button>` : '';
        return memberCard({ portrait: portraitImg(doll, 'pt-ico'), name: m.name, level: m.level, classId: m.classId, leader: m.id === party.leader, me: isMe, chips, action: kick });
      })
    : [memberCard({ portrait: portraitImg(paperdollOf(s), 'pt-ico'), name: s.name, level: s.level, classId: s.classId, leader: false, me: true, chips: [chip(net.connected ? 'ออนไลน์' : 'ออฟไลน์', net.connected ? 'on' : 'off')] })];
  while (members.length < PARTY_MAX) members.push(`<div class="pt-card empty"><span class="pt-ico pt-none">+</span><div class="pt-info"><b>ว่าง</b><small>ชวนผู้เล่นที่อยู่ใกล้ ๆ ด้านล่าง</small></div></div>`);

  const inParty = new Set(party?.members.map((m) => m.id) ?? []);
  const others = net.players
    .filter((p) => !inParty.has(p.id))
    .map((p) => ({ p, d: distanceTo(p) }))
    .sort((a, b) => a.d - b.d);
  const nearby = others.length
    ? others
        .map(({ p, d }) => {
          const near = d <= PARTY_RANGE_M;
          const why = !near ? 'ไกลเกิน' : !net.isLeader ? 'หัวหน้าชวน' : full ? 'ปาร์ตี้เต็ม' : '';
          const btn = canInvite && near ? `<button type="button" class="mini" data-invite="${esc(p.id)}">ชวน</button>` : `<small class="muted">${why}</small>`;
          return `<div class="pt-row">${portraitImg(dollFromLook(p.look), 'pt-ico sm')}
            <div class="pt-info"><b>${esc(p.name)}</b><small>Lv.${p.level} · ${esc(CLASSES[p.look.classId]?.nameTh ?? '')} · ${fmtDist(d)}${p.busy ? ' · กำลังสู้' : ''}</small></div>${btn}</div>`;
        })
        .join('')
    : `<p class="muted pt-empty">${net.connected ? 'ยังไม่มีผู้เล่นอื่นในระยะ 2 กม.' : 'ออฟไลน์ — เปิดเซิร์ฟเวอร์ด้วย npm run dev:all'}</p>`;

  return `<div class="pt-frame">${members.join('')}</div>
    ${party ? '<button type="button" class="btn danger pt-leave" data-party-leave>ออกจากปาร์ตี้</button>' : ''}
    <div class="ro-eq-sub">▲ ผู้เล่นใกล้ ๆ (ชวนได้ในระยะ ${PARTY_RANGE_M} ม.)</div>
    <div class="pt-list">${nearby}</div>
    <p class="muted pt-help">ตีมอนบนแผนที่ สมาชิกที่อยู่ใกล้เข้าสู้ด้วยกันอัตโนมัติ · ห่างทุกคนเกิน ${PARTY_RANGE_M} ม. นาน 10 วิ = หลุดปาร์ตี้</p>`;
}

function dungeonTab(): string {
  const s = store.s;
  const party = net.party;
  const card = (dg: DungeonDef) => {
    const last = dg.waves.at(-1)!;
    const bossId = last.boss ? last.monsterIds[0]! : last.monsterIds[0]!;
    const boss = MONSTERS[bossId];
    const locked = s.level < dg.minLevel;
    const btn = locked
      ? `<button type="button" class="btn" disabled>ต้อง Lv.${dg.minLevel}+</button>`
      : !party
        ? `<button type="button" class="btn primary" data-dungeon-go="${dg.id}">เข้าคนเดียว</button>`
        : net.isLeader
          ? `<button type="button" class="btn primary" data-dungeon-go="${dg.id}">พาปาร์ตี้เข้า</button>`
          : '<small class="muted">รอหัวหน้าเปิด</small>';
    return `<div class="dg-card ${locked ? 'locked' : ''}">
      <div class="dg-boss"><img src="/assets/monsters/${boss?.sprite ?? 'mob_slime'}.png" alt="" /></div>
      <div class="dg-info">
        <b>${dg.icon} ${esc(dg.nameTh)}</b>
        <small class="dg-meta">Lv.${dg.recLevel[0]}–${dg.recLevel[1]} · ${dg.waves.length} เวฟ · ท้ายสุด: ${esc(boss?.nameTh ?? '')}</small>
        <small class="muted">${esc(dg.descTh)}</small>
        <span class="dg-go">${btn}</span>
      </div>
    </div>`;
  };
  return `<p class="muted pt-help">${party ? 'ทั้งปาร์ตี้เข้าด้วยกัน ทุกคนต้องกด "ยอมรับ"' : 'ไม่มีปาร์ตี้ก็เข้าคนเดียวได้'} · บอสแกร่งขึ้นตามจำนวนคน แต่ไปหลายคนได้เปรียบกว่า · แต่ละคนใช้ยาและได้ของดรอปของตัวเอง</p>
    <div class="dg-list">${DUNGEONS.map(card).join('')}</div>`;
}

export function partyPanel(): string {
  const party = net.party;
  const t = (id: 'party' | 'dungeon', label: string) => `<button type="button" class="win-tab ${tab === id ? 'on' : ''}" data-ptab="${id}">${label}</button>`;
  return `<div class="ro-equip party-win">
    <div class="ro-eq-title"><span>${uiIcon('party', true)}ปาร์ตี้ ${party ? `${party.members.length}/${PARTY_MAX}` : ''}</span></div>
    <div class="win-tabs">${t('party', 'สมาชิก')}${t('dungeon', 'ดันเจี้ยน')}</div>
    ${tab === 'party' ? partyTab() : dungeonTab()}
  </div>`;
}

export function wireParty(body: HTMLElement, close: () => void, rerender?: () => void) {
  const on = (sel: string, fn: (el: HTMLElement) => void) =>
    body.querySelectorAll<HTMLElement>(sel).forEach((x) => x.addEventListener('click', () => fn(x)));
  on('[data-ptab]', (x) => {
    tab = x.dataset.ptab as 'party' | 'dungeon';
    rerender?.();
  });
  on('[data-invite]', (x) => net.invite(x.dataset.invite!));
  on('[data-kick]', (x) => net.kick(x.dataset.kick!));
  on('[data-party-leave]', () => net.leaveParty());
  on('[data-dungeon-go]', (x) => {
    const id = x.dataset.dungeonGo!;
    close();
    if (net.inParty) return net.openRun({ kind: 'DUNGEON', dungeonId: id });
    // Solo: no server needed — run it locally.
    autoHunt.stop();
    const target = { kind: 'DUNGEON' as const, dungeonId: id };
    bus.emit('battle:start', { kind: 'DUNGEON', monsterIds: [], run: { target, seed: (Math.random() * 2 ** 31) | 0, entrants: [net.entrant()], meId: net.id } });
  });
}

/** Incoming invite prompt. */
export function showInvite(from: string, name: string, level: number) {
  const modal = el(`<div class="modal-backdrop"><div class="modal">
    <h2>👥 คำชวนเข้าปาร์ตี้</h2>
    <p><b>${esc(name)}</b> (Lv.${level}) ชวนคุณเข้าปาร์ตี้</p>
    <button class="btn primary" data-yes>เข้าร่วม</button>
    <button class="btn" data-no>ปฏิเสธ</button></div></div>`);
  document.getElementById('ui')!.appendChild(modal);
  let done = false;
  const answer = (accept: boolean) => {
    if (done) return;
    done = true;
    modal.remove();
    net.answerInvite(from, accept);
  };
  modal.querySelector('[data-yes]')!.addEventListener('click', () => answer(true));
  modal.querySelector('[data-no]')!.addEventListener('click', () => answer(false));
  window.setTimeout(() => {
    if (!done) {
      done = true;
      modal.remove();
      toast('คำชวนหมดอายุ');
    }
  }, 30_000);
}

/** Dungeon ready check: everyone in the party must accept before the run starts. */
export function showReadyCheck(runId: string, target: RunTarget, openedBy: string, timeoutMs: number, mine: boolean) {
  const dg = DUNGEON_BY_ID[target.dungeonId ?? ''];
  if (!dg) return;
  document.querySelector('.modal-backdrop.ready-check')?.remove();
  const modal = el(`<div class="modal-backdrop ready-check"><div class="modal">
    <h2>${dg.icon} ${esc(dg.nameTh)}</h2>
    <p>${mine ? 'รอสมาชิกทุกคนกดยอมรับ…' : `<b>${esc(openedBy)}</b> ชวนปาร์ตี้ลงดันเจี้ยน`}</p>
    <p class="muted" data-status></p>
    <p class="muted">เหลือเวลา <b data-left>${Math.round(timeoutMs / 1000)}</b> วิ · ทุกคนต้องยอมรับ ไม่งั้นยกเลิก</p>
    ${mine ? '' : '<button class="btn primary" data-yes>✅ ยอมรับ</button><button class="btn" data-no>ปฏิเสธ</button>'}
  </div></div>`);
  document.getElementById('ui')!.appendChild(modal);
  const end = Date.now() + timeoutMs;
  const timer = window.setInterval(() => {
    const left = modal.querySelector('[data-left]');
    if (left) left.textContent = String(Math.max(0, Math.round((end - Date.now()) / 1000)));
  }, 500);
  const offs = [
    bus.on('run:status', (st) => {
      if (st.runId !== runId) return;
      const status = modal.querySelector('[data-status]')!;
      status.innerHTML = `✅ ${st.accepted.map(esc).join(', ') || '-'}${st.waiting.length ? `<br>⏳ รอ: ${st.waiting.map(esc).join(', ')}` : ''}`;
    }),
    bus.on('run:end', (e) => {
      if (e.runId === runId) close();
    }),
  ];
  function close() {
    window.clearInterval(timer);
    offs.forEach((off) => off());
    modal.remove();
  }
  const answer = (accept: boolean) => {
    net.answerRun(runId, accept);
    const btns = modal.querySelectorAll<HTMLButtonElement>('[data-yes],[data-no]');
    btns.forEach((b) => b.remove());
    if (accept) modal.querySelector('.modal > p')!.textContent = 'ยอมรับแล้ว — รอคนอื่น…';
  };
  modal.querySelector('[data-yes]')?.addEventListener('click', () => answer(true));
  modal.querySelector('[data-no]')?.addEventListener('click', () => answer(false));
}
