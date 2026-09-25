/**
 * Admin tools (MASTER_SPEC §10): the "PIN" button on the map opens this window — choose a kind
 * (gate / shop / service), name it, then tap the map (or use your own spot) to place it. The list
 * below shows every pin with delete. The admin key is entered in Settings. State: game/admin.ts.
 */
import { MONSTERS, PIN_KINDS, PIN_KIND_BY_ID, PIN_LABEL_MAX, gateLayer, gateRank, haversine, shopForLandmark, type LandmarkKind, LANDMARK_BOSS } from '@pw/shared';
import { admin } from '../game/admin';
import { bus } from '../game/bus';
import { walk } from '../game/walk';
import { esc, el } from './dom';
import { uiIcon } from './pixel';

let kind: LandmarkKind = 'CONVENIENCE';
let label = '';

/** Small pin preview from the landmark art (first frame of an open-gate strip). */
function pinArt(k: LandmarkKind): string {
  if (gateLayer(k)) return `<i class="ad-art rift" style="background-image:url(/assets/landmarks/gate_${k}.png)"></i>`;
  return `<i class="ad-art" style="background-image:url(/assets/landmarks/${k}.png)"></i>`;
}

/** What placing this kind creates, in one line. */
function kindInfo(k: LandmarkKind): string {
  const parts: string[] = [];
  const boss = LANDMARK_BOSS[k] ? MONSTERS[LANDMARK_BOSS[k]!] : undefined;
  if (boss) parts.push(`ประตู ${gateRank(k)} · ${boss.nameTh} Lv.${boss.level}`);
  const shop = shopForLandmark(k);
  if (shop) parts.push(`ร้าน: ${shop.nameTh}`);
  if (k === 'HOSPITAL') parts.push('จุดรักษา HP/MP');
  if (k === 'SANCTUARY') parts.push('เขตศักดิ์สิทธิ์ · พักใจ');
  return parts.join(' · ');
}

const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} ม.` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} กม.`);

export function adminWindowHtml(): string {
  if (!admin.isAdmin) return `<h2>${uiIcon('pin')}หมุดแผนที่</h2><p class="muted">ต้องเข้าโหมดแอดมินก่อน (ตั้งค่า → โหมดแอดมิน)</p>`;
  const def = PIN_KIND_BY_ID[kind]!;
  const pick = (k: (typeof PIN_KINDS)[number]) => `<button type="button" class="pick ad-kind ${k.kind === kind ? 'on' : ''}" data-adkind="${k.kind}">
      ${pinArt(k.kind)}<b>${esc(k.nameTh)}</b></button>`;
  const here = walk.position;
  const list = [...admin.pins]
    .map((p) => ({ p, d: here ? haversine(here, p) : 0 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 100);
  return `<h2>${uiIcon('pin')}หมุดแผนที่ <small class="sys-tag">ADMIN</small></h2>
    <p class="muted">หมุดทุกอันบนแผนที่มาจากแอดมินเท่านั้น — ผู้เล่นทุกคนเห็นทันทีที่วาง</p>
    <h3>ประตูมิติ (มีบอส${'/'}ร้านในตัว)</h3>
    <div class="ad-kinds">${PIN_KINDS.filter((k) => k.group === 'GATE').map(pick).join('')}</div>
    <h3>ร้านค้า / บริการ</h3>
    <div class="ad-kinds">${PIN_KINDS.filter((k) => k.group === 'SERVICE').map(pick).join('')}</div>
    <p class="ad-info">${pinArt(kind)}<span><b>${esc(def.nameTh)}</b><br><small>${esc(kindInfo(kind))}</small></span></p>
    <label class="ad-label">ชื่อที่ผู้เล่นเห็น
      <input type="text" data-adlabel maxlength="${PIN_LABEL_MAX}" placeholder="${esc(def.nameTh)}" value="${esc(label)}" autocomplete="off" />
    </label>
    <p class="muted">ห้ามใช้ชื่อแบรนด์จริง — ใช้ชื่อทั่วไป เช่น "ร้านสะดวกซื้อหน้าตลาด"</p>
    <div class="ad-actions">
      <button type="button" class="btn primary" data-adplace>${uiIcon('pin', true)}แตะบนแผนที่เพื่อวาง</button>
      <button type="button" class="btn" data-adhere ${here ? '' : 'disabled'}>วางตรงที่ฉันยืน</button>
    </div>
    <h3>หมุดทั้งหมด (${admin.pins.length})</h3>
    <div class="ad-list">${
      list.length
        ? list
            .map(
              ({ p, d }) => `<div class="row ad-row">${pinArt(p.kind)}<span><b>${esc(p.label)}</b><br><small class="muted">${esc(PIN_KIND_BY_ID[p.kind]?.nameTh ?? p.kind)}${here ? ` · ${fmtDist(d)}` : ''}</small></span>
          <span class="spacer"></span>
          ${walk.simulated ? `<button type="button" class="btn" data-adgo="${esc(p.id)}">วาร์ป</button>` : ''}
          <button type="button" class="btn danger" data-addel="${esc(p.id)}">ลบ</button></div>`,
            )
            .join('')
        : '<p class="muted">ยังไม่มีหมุด — เลือกประเภทแล้ววางอันแรกได้เลย</p>'
    }</div>`;
}

export function wireAdminWindow(body: HTMLElement, rerender: () => void, close: () => void) {
  const input = body.querySelector<HTMLInputElement>('[data-adlabel]');
  if (input) {
    for (const ev of ['keydown', 'keyup', 'keypress'] as const) input.addEventListener(ev, (e) => e.stopPropagation());
    input.addEventListener('input', () => (label = input.value));
  }
  body.querySelectorAll<HTMLElement>('[data-adkind]').forEach((b) =>
    b.addEventListener('click', () => {
      // A typed name belongs to one kind — don't carry it to the next.
      if (kind !== b.dataset.adkind) label = '';
      kind = b.dataset.adkind as LandmarkKind;
      rerender();
    }),
  );
  body.querySelector('[data-adplace]')?.addEventListener('click', () => {
    admin.beginPlacing(kind, label);
    label = '';
    close();
  });
  body.querySelector('[data-adhere]')?.addEventListener('click', () => {
    const p = walk.position;
    if (!p) return;
    admin.add(kind, label, p.lat, p.lng);
    label = '';
  });
  body.querySelectorAll<HTMLElement>('[data-addel]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = admin.pins.find((x) => x.id === b.dataset.addel);
      if (p && confirm(`ลบหมุด "${p.label}"? ผู้เล่นทุกคนจะไม่เห็นหมุดนี้อีก`)) admin.remove(p.id);
    }),
  );
  body.querySelectorAll<HTMLElement>('[data-adgo]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = admin.pins.find((x) => x.id === b.dataset.adgo);
      if (!p) return;
      walk.teleport(p.lat, p.lng);
      close();
    }),
  );
}

/** Settings row: enter / leave admin mode. */
export function adminSettingsHtml(): string {
  if (admin.isAdmin) {
    return `<div class="row"><b>โหมดแอดมิน</b><span class="spacer"></span><span class="good">เปิดอยู่</span>
      <button class="btn" data-adlogout>ออก</button></div>`;
  }
  return `<form class="row ad-login" data-adlogin autocomplete="off"><b>โหมดแอดมิน</b><span class="spacer"></span>
    <input type="password" placeholder="รหัสแอดมิน" aria-label="รหัสแอดมิน" />
    <button type="submit" class="btn">เข้า</button></form>`;
}

export function wireAdminSettings(body: HTMLElement) {
  const form = body.querySelector<HTMLFormElement>('[data-adlogin]');
  if (form) {
    const input = form.querySelector('input')!;
    for (const ev of ['keydown', 'keyup', 'keypress'] as const) input.addEventListener(ev, (e) => e.stopPropagation());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) admin.login(input.value);
    });
  }
  body.querySelector('[data-adlogout]')?.addEventListener('click', () => admin.logout());
}

/** Map HUD bits: shows the PIN button for admins and the "tap the map" banner while placing. */
export function mountAdminHud(hud: HTMLElement) {
  const bar = el(`<div class="ad-bar hidden"><span></span><button type="button" class="btn" data-adcancel>ยกเลิก</button></div>`);
  hud.appendChild(bar);
  bar.querySelector('[data-adcancel]')!.addEventListener('click', () => admin.cancelPlacing());
  const render = () => {
    hud.querySelector('[data-admin]')?.classList.toggle('hidden', !admin.isAdmin);
    const p = admin.placing;
    bar.classList.toggle('hidden', !p);
    if (p) bar.querySelector('span')!.textContent = `แตะบนแผนที่เพื่อวาง "${p.label || PIN_KIND_BY_ID[p.kind]?.nameTh}"`;
  };
  bus.on('admin:changed', render);
  render();
}
