/** Party panel: members, invite nearby players, and open instanced dungeons (solo or as a party). */
import { CLASSES, DUNGEON_BY_ID, DUNGEONS, MONSTERS, PARTY_MAX, PARTY_RANGE_M, haversine, type DungeonDef, type RunTarget } from '@pw/shared';
import { bus, toast } from '../game/bus';
import { net } from '../game/net';
import { walk } from '../game/walk';
import { autoHunt } from '../game/autohunt';
import { store } from '../state/store';
import { el, esc } from './dom';

function distanceTo(lat: number, lng: number): number {
  const p = walk.position;
  return p ? haversine(p, { lat, lng }) : Infinity;
}

const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} ม.` : `${(m / 1000).toFixed(1)} กม.`);

export function partyPanel(): string {
  const s = store.s;
  const party = net.party;
  const full = !!party && party.members.length >= PARTY_MAX;
  const canInvite = net.connected && net.isLeader && !full;

  const members = party
    ? party.members
        .map((m) => {
          const isMe = m.id === net.id;
          const kick = net.isLeader && !isMe ? `<button class="mini" data-kick="${esc(m.id)}">เชิญออก</button>` : '';
          return `<div class="row"><div>${m.id === party.leader ? '👑 ' : ''}<b>${esc(m.name)}</b>${isMe ? ' (คุณ)' : ''}
            <span class="tag">Lv.${m.level}</span> <small class="muted">${esc(CLASSES[m.classId]?.nameTh ?? m.classId)}${m.online ? '' : ' · ออฟไลน์'}</small></div>
            <span class="spacer"></span>${kick}</div>`;
        })
        .join('')
    : '<p class="muted">ยังไม่มีปาร์ตี้ — ชวนผู้เล่นที่อยู่ใกล้ ๆ ด้านล่าง (สูงสุด 3 คน)</p>';

  const inParty = new Set(party?.members.map((m) => m.id) ?? []);
  const others = net.players
    .filter((p) => !inParty.has(p.id))
    .map((p) => ({ p, d: distanceTo(p.lat, p.lng) }))
    .sort((a, b) => a.d - b.d);
  const nearby = others.length
    ? others
        .map(({ p, d }) => {
          const near = d <= PARTY_RANGE_M;
          const btn = near && canInvite ? `<button class="mini" data-invite="${esc(p.id)}">ชวน</button>` : `<small class="muted">${near ? '' : 'ไกลเกิน'}</small>`;
          return `<div class="row"><div><b>${esc(p.name)}</b> <span class="tag">Lv.${p.level}</span>
            <small class="muted">${fmtDist(d)}${p.busy ? ' · ⚔️ กำลังสู้' : ''}</small></div><span class="spacer"></span>${btn}</div>`;
        })
        .join('')
    : `<p class="muted">${net.connected ? 'ยังไม่มีผู้เล่นอื่นในระยะ 2 กม.' : 'ออฟไลน์ — เปิดเซิร์ฟเวอร์ด้วย npm run dev:all'}</p>`;

  const dungeon = (dg: DungeonDef) => {
    const boss = dg.waves.at(-1)!;
    const bossName = boss.boss ? MONSTERS[boss.monsterIds[0]!]?.nameTh : 'ฝูงหัวหน้า';
    const locked = s.level < dg.minLevel;
    const btn = locked
      ? `<button class="mini" disabled>Lv.${dg.minLevel}+</button>`
      : !party
        ? `<button class="mini" data-dungeon-go="${dg.id}">เข้าคนเดียว</button>`
        : net.isLeader
          ? `<button class="mini primary" data-dungeon-go="${dg.id}">พาปาร์ตี้เข้า</button>`
          : '<small class="muted">รอหัวหน้าเปิด</small>';
    return `<div class="row dungeon-row"><div><b>${dg.icon} ${esc(dg.nameTh)}</b> <span class="tag">Lv.${dg.recLevel[0]}–${dg.recLevel[1]}</span>
      <br><small class="muted">${esc(dg.descTh)}</small>
      <br><small>${dg.waves.length} เวฟ · ท้ายสุด: ${esc(bossName ?? '')}</small></div>
      <span class="spacer"></span>${btn}</div>`;
  };

  return `<h2>👥 ปาร์ตี้ & ดันเจี้ยน</h2>
    <h3>ปาร์ตี้ ${party ? `(${party.members.length}/${PARTY_MAX})` : ''}</h3>
    ${members}
    ${party ? '<button class="btn" data-party-leave>ออกจากปาร์ตี้</button>' : ''}
    <h3>ผู้เล่นใกล้ ๆ</h3>
    <p class="muted">ชวนได้เมื่ออยู่ห่างกันไม่เกิน ${PARTY_RANGE_M} ม. · เดินห่างจากทุกคนในปาร์ตี้เกิน ${PARTY_RANGE_M} ม. นาน 10 วิ = หลุดปาร์ตี้
      · ตีมอนบนแผนที่ สมาชิกที่อยู่ใกล้จะเข้าสู้ด้วยกันอัตโนมัติ</p>
    ${nearby}
    <h3>ดันเจี้ยน</h3>
    <p class="muted">ทั้งปาร์ตี้เข้าด้วยกัน ทุกคนต้องกด "ยอมรับ" · บอสแกร่งขึ้นตามจำนวนคน แต่ไปหลายคนได้เปรียบกว่า
      · แต่ละคนใช้ยาของตัวเอง และได้ EXP/ของดรอปของตัวเอง</p>
    ${DUNGEONS.map(dungeon).join('')}`;
}

export function wireParty(body: HTMLElement, close: () => void) {
  const on = (sel: string, fn: (el: HTMLElement) => void) =>
    body.querySelectorAll<HTMLElement>(sel).forEach((x) => x.addEventListener('click', () => fn(x)));
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
