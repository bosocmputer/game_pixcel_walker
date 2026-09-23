/**
 * MMORPG-style inventory: tabs, an item grid (icons, stack counts, durability), a detail box for
 * the selected item with its actions, equipped strip on top and currency at the bottom.
 * Buttons reuse the panel's data-* actions (data-equip / data-unequip / data-use / data-sell).
 */
import { CONSUMABLES, EQUIPMENT, EQUIP_SLOTS, type EquipSlot, type Rarity } from '@pw/shared';
import type { SaveData } from '../state/store';
import { esc } from './dom';
import { itemIcon, SLOT_NAME, statText } from './equipWindow';
import { uiIcon } from './pixel';

export type BagTab = 'all' | 'gear' | 'use';
export const bagState: { tab: BagTab; sel: string | null } = { tab: 'all', sel: null };

const MIN_CELLS = 20;
const RARITY_TH: Record<Rarity, string> = { COMMON: 'ธรรมดา', UNCOMMON: 'ดี', RARE: 'หายาก', EPIC: 'มหากาพย์', LEGENDARY: 'ตำนาน' };
const RARITY_CSS: Record<Rarity, string> = { COMMON: '#9c8f73', UNCOMMON: '#3aa06a', RARE: '#2f86d6', EPIC: '#9a4fd0', LEGENDARY: '#e08a10' };
const USE_TH: Record<string, (n: number) => string> = {
  HEAL_HP: (n) => `ฟื้นฟู HP +${n}`,
  HEAL_MP: (n) => `ฟื้นฟู MP +${n}`,
  REPAIR: (n) => (n >= 1 ? 'ซ่อมอุปกรณ์ที่สวมทุกชิ้นให้เต็ม (รวมชิ้นที่พัง)' : `ซ่อมอุปกรณ์ที่สวม +${Math.round(n * 100)}%`),
};

interface Cell {
  key: string;
  id: string;
  qty?: number;
  dur?: [number, number];
}

function cells(s: SaveData, tab: BagTab): Cell[] {
  const gear: Cell[] = s.gearBag.map((g, i) => ({ key: `g:${i}`, id: g.itemId, dur: [g.durability, EQUIPMENT[g.itemId]?.maxDurability ?? 100] }));
  const use: Cell[] = Object.entries(s.bag)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ key: `c:${id}`, id, qty: n }));
  return tab === 'gear' ? gear : tab === 'use' ? use : [...gear, ...use];
}

function cellHtml(c: Cell | null, sel: string | null): string {
  if (!c) return '<div class="bg-cell empty"></div>';
  const def = EQUIPMENT[c.id];
  const rar = def ? RARITY_CSS[def.rarity] : '#9c8f73';
  const broken = c.dur && c.dur[0] <= 0;
  const dur = c.dur ? `<i class="bg-dur"><b style="width:${Math.max(0, Math.round((c.dur[0] / c.dur[1]) * 100))}%"></b></i>` : '';
  return `<button type="button" class="bg-cell ${c.key === sel ? 'sel' : ''} ${broken ? 'broken' : ''}" data-bagsel="${c.key}" style="--rar:${rar}">
    ${itemIcon(c.id, 'bg-ico')}${c.qty ? `<span class="bg-qty">${c.qty}</span>` : ''}${dur}</button>`;
}

function detail(s: SaveData, key: string): string {
  const [kind, ref] = [key.slice(0, 1), key.slice(2)];
  let id = '';
  let dur: [number, number] | null = null;
  let actions = '';
  let qty = 0;
  if (kind === 'e') {
    const eq = s.equipment[ref as EquipSlot];
    if (!eq) return '';
    id = eq.itemId;
    dur = [eq.durability, EQUIPMENT[id]?.maxDurability ?? 100];
    actions = `<button type="button" class="btn" data-unequip="${ref}">ถอด</button>`;
  } else if (kind === 'g') {
    const g = s.gearBag[Number(ref)];
    if (!g) return '';
    id = g.itemId;
    dur = [g.durability, EQUIPMENT[id]?.maxDurability ?? 100];
    const price = Math.floor((EQUIPMENT[id]?.price ?? 0) * 0.3);
    actions = `<button type="button" class="btn primary" data-equip="${ref}">สวมใส่</button>
      <button type="button" class="btn danger" data-sell="${ref}">ขาย ${uiIcon('coin', true)}${price}</button>`;
  } else {
    id = ref;
    qty = s.bag[id] ?? 0;
    if (!qty) return '';
    actions = `<button type="button" class="btn primary" data-use="${id}">ใช้ 1 ชิ้น</button>`;
  }
  const def = EQUIPMENT[id];
  const con = CONSUMABLES[id];
  const name = def?.nameTh ?? con?.nameTh ?? id;
  const sub = def
    ? `${SLOT_NAME[def.slot]} · <span style="color:${RARITY_CSS[def.rarity]}">${RARITY_TH[def.rarity]}</span>`
    : `ของใช้ · มี ${qty} ชิ้น`;
  const lines: string[] = [];
  if (def) {
    const stats = statText(id);
    if (stats) lines.push(`<b class="bd-stat">${esc(stats)}</b>`);
    for (const [k, v] of Object.entries(def.modifiers.pct ?? {})) lines.push(`<b class="bd-stat">${k} +${Math.round((v as number) * 100)}%</b>`);
    if (def.effect) lines.push(`<span>${esc(def.effect)}</span>`);
  }
  if (con) {
    lines.push(`<b class="bd-stat">${esc(USE_TH[con.kind]?.(con.amount) ?? '')}</b>`);
    lines.push(`<span class="muted">หาได้จาก: ${esc(con.source)}</span>`);
  }
  const durHtml = dur
    ? `<div class="bd-dur"><span>ความทนทาน</span><i class="bar ${dur[0] <= 0 ? 'mut' : 'hp'}"><i style="width:${Math.max(0, Math.round((dur[0] / dur[1]) * 100))}%"></i></i><small>${dur[0] <= 0 ? 'พัง! ไม่มีผล' : `${dur[0]}/${dur[1]}`}</small></div>`
    : '';
  return `<div class="bag-detail">
    <div class="bd-head">${itemIcon(id, 'bd-ico')}<div><b class="bd-name" style="color:${def ? RARITY_CSS[def.rarity] : 'inherit'}">${esc(name)}</b><small>${sub}</small></div></div>
    <div class="bd-lines">${lines.join('')}</div>${durHtml}
    <div class="bd-actions">${actions}</div>
  </div>`;
}

export function bagWindowHtml(s: SaveData): string {
  const st = bagState;
  const list = cells(s, st.tab);
  // Keep the selection only while it still points at something.
  const valid = st.sel && (st.sel.startsWith('e:') ? !!s.equipment[st.sel.slice(2) as EquipSlot] : list.some((c) => c.key === st.sel) || cells(s, 'all').some((c) => c.key === st.sel));
  if (!valid) st.sel = null;
  const grid = [...list.map((c) => cellHtml(c, st.sel)), ...Array.from({ length: Math.max(0, MIN_CELLS - list.length) }, () => cellHtml(null, null))].join('');
  const worn = EQUIP_SLOTS.map((slot) => {
    const eq = s.equipment[slot];
    const key = `e:${slot}`;
    return eq
      ? `<button type="button" class="bg-cell worn ${key === st.sel ? 'sel' : ''} ${eq.durability <= 0 ? 'broken' : ''}" data-bagsel="${key}" title="${SLOT_NAME[slot]}" style="--rar:${RARITY_CSS[EQUIPMENT[eq.itemId]?.rarity ?? 'COMMON']}">${itemIcon(eq.itemId, 'bg-ico')}</button>`
      : `<div class="bg-cell worn empty" title="${SLOT_NAME[slot]}"><span class="bg-slot-lbl">${SLOT_NAME[slot]}</span></div>`;
  }).join('');
  const tab = (id: BagTab, label: string, n: number) => `<button type="button" class="win-tab ${st.tab === id ? 'on' : ''}" data-bagtab="${id}">${label} <b>${n}</b></button>`;
  const all = cells(s, 'all');
  return `<div class="ro-equip bag-win">
    <div class="ro-eq-title"><span>${uiIcon('bag', true)}กระเป๋า</span></div>
    <div class="bag-worn">${worn}<button type="button" class="mini" data-act="equipwin" title="หน้าต่างตัวละคร">${uiIcon('char')}</button></div>
    <div class="win-tabs">${tab('all', 'ทั้งหมด', all.length)}${tab('gear', 'อุปกรณ์', s.gearBag.length)}${tab('use', 'ของใช้', all.length - s.gearBag.length)}</div>
    <div class="bag-grid">${grid}</div>
    ${st.sel ? detail(s, st.sel) : '<p class="muted bag-hint">แตะไอเทมเพื่อดูรายละเอียด · สวมใส่ · ใช้ · ขาย</p>'}
    <div class="bag-foot"><span>${uiIcon('coin', true)}<b>${s.gold.toLocaleString()}</b> Gold</span><span class="muted">ฝากไว้ที่บ้าน ${s.bankGold.toLocaleString()}</span></div>
  </div>`;
}

export function wireBagWindow(body: HTMLElement, rerender: () => void) {
  // Equip/sell/unequip shift bag indices: drop the selection before the action re-renders the panel.
  body.querySelectorAll<HTMLElement>('.bag-detail [data-equip], .bag-detail [data-sell], .bag-detail [data-unequip]').forEach((b) =>
    b.addEventListener('click', () => (bagState.sel = null), { capture: true }),
  );
  body.querySelectorAll<HTMLElement>('[data-bagtab]').forEach((b) =>
    b.addEventListener('click', () => {
      bagState.tab = b.dataset.bagtab as BagTab;
      rerender();
    }),
  );
  body.querySelectorAll<HTMLElement>('[data-bagsel]').forEach((b) =>
    b.addEventListener('click', () => {
      bagState.sel = bagState.sel === b.dataset.bagsel ? null : b.dataset.bagsel!;
      rerender();
    }),
  );
}
