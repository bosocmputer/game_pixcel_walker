/**
 * Windows opened from furniture inside the house (scenes/HomeScene.ts): treasure chest = bank,
 * workbench = repair at half price, shelf = shop. Buttons reuse the panel's data-* actions
 * (data-bank / data-act="repairhome" / data-buy) wired in hud.ts.
 */
import { CONSUMABLES, EQUIPMENT, EQUIP_SLOTS, repairCost } from '@pw/shared';
import type { SaveData } from '../state/store';
import { esc } from './dom';
import { itemIcon, SLOT_NAME } from './equipWindow';
import { uiIcon } from './pixel';

export const HOME_SHOP = ['red_potion', 'blue_elixir', 'cotton_shirt', 'training_sword', 'apprentice_staff', 'cloth_bandana', 'lucky_cord', 'iron_helm', 'runner_charm'];

const coins = (n: number) => `${uiIcon('coin', true)}<b>${n.toLocaleString()}</b>`;

export function bankWindowHtml(s: SaveData): string {
  const btn = (amount: number | 'all' | '-all', label: string, ok: boolean) =>
    `<button type="button" class="btn ${amount === 'all' || amount === '-all' ? 'primary' : ''}" data-bank="${amount}" ${ok ? '' : 'disabled'}>${label}</button>`;
  return `<div class="ro-equip home-win">
    <div class="ro-eq-title"><span>${uiIcon('coin', true)}หีบสมบัติ · ธนาคาร</span></div>
    <div class="hb-vault">
      <div class="hb-box"><small>ถืออยู่</small><span>${coins(s.gold)}</span><small class="muted">แพ้แล้วเสียบางส่วน</small></div>
      <div class="hb-arrow">⇄</div>
      <div class="hb-box safe"><small>ในหีบ</small><span>${coins(s.bankGold)}</span><small class="muted">ปลอดภัย ไม่หายเมื่อแพ้</small></div>
    </div>
    <div class="ro-eq-sub">▼ ฝากเข้าหีบ</div>
    <div class="hb-row">${btn(100, '100', s.gold >= 100)}${btn(1000, '1,000', s.gold >= 1000)}${btn('all', 'ทั้งหมด', s.gold > 0)}</div>
    <div class="ro-eq-sub">▲ ถอนออกมา</div>
    <div class="hb-row">${btn(-100, '100', s.bankGold >= 100)}${btn(-1000, '1,000', s.bankGold >= 1000)}${btn('-all', 'ทั้งหมด', s.bankGold > 0)}</div>
  </div>`;
}

export function repairWindowHtml(s: SaveData): string {
  let total = 0;
  const rows = EQUIP_SLOTS.map((slot) => {
    const eq = s.equipment[slot];
    const def = eq && EQUIPMENT[eq.itemId];
    if (!eq || !def) return `<div class="hr-row empty"><span class="hr-slot">${SLOT_NAME[slot]}</span><span class="muted">— ว่าง —</span></div>`;
    const pct = Math.max(0, Math.round((eq.durability / def.maxDurability) * 100));
    const cost = repairCost(def.price, 1 - eq.durability / def.maxDurability, true);
    total += cost;
    return `<div class="hr-row">${itemIcon(eq.itemId, 'hr-ico')}
      <div class="hr-info"><b>${esc(def.nameTh)}</b>
        <i class="bar ${eq.durability <= 0 ? 'mut' : 'hp'}"><i style="width:${pct}%"></i></i>
        <small>${eq.durability <= 0 ? 'พัง! ไม่มีผล' : `${eq.durability}/${def.maxDurability}`}</small></div>
      <span class="hr-cost">${cost ? coins(cost) : '<small class="good">ใหม่เอี่ยม</small>'}</span></div>`;
  }).join('');
  return `<div class="ro-equip home-win">
    <div class="ro-eq-title"><span>${uiIcon('swords', true)}โต๊ะช่าง · ซ่อมอุปกรณ์</span></div>
    <div class="hr-list">${rows}</div>
    <button type="button" class="btn primary hr-go" data-act="repairhome" ${total && s.gold >= total ? '' : 'disabled'}>ซ่อมทั้งหมด ${coins(total)}</button>
    <p class="muted pt-help">ซ่อมที่บ้านถูกกว่าร้านตีเหล็ก (ปั๊ม) ครึ่งหนึ่ง${total > s.gold ? ' · Gold ไม่พอ ถอนจากหีบก่อน' : ''}</p>
  </div>`;
}

export function shopWindowHtml(s: SaveData): string {
  const cards = HOME_SHOP.map((id) => {
    const def = EQUIPMENT[id];
    const con = CONSUMABLES[id];
    const price = def?.price ?? con?.price ?? 0;
    const have = def ? s.gearBag.filter((g) => g.itemId === id).length : s.bag[id] ?? 0;
    return `<div class="hs-card">${itemIcon(id, 'hs-ico')}
      <b>${esc(def?.nameTh ?? con?.nameTh ?? id)}</b>
      <small class="muted">${def ? SLOT_NAME[def.slot] : 'ของใช้'}${have ? ` · มี ${have}` : ''}</small>
      <button type="button" class="mini" data-buy="${id}" data-price="${price}" ${s.gold >= price ? '' : 'disabled'}>${coins(price)}</button></div>`;
  }).join('');
  return `<div class="ro-equip home-win">
    <div class="ro-eq-title"><span>${uiIcon('bag', true)}ชั้นวางของ · ร้านค้า</span></div>
    <div class="hs-grid">${cards}</div>
    <div class="bag-foot"><span>${coins(s.gold)} Gold</span><span class="muted">ในหีบ ${s.bankGold.toLocaleString()}</span></div>
  </div>`;
}
