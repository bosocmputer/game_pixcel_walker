/**
 * Shop window (MMORPG style): "ซื้อ" = item cards with grade colour, level badge and price, a
 * detail box with stats + item history; "ขาย" = sell monster junk (one tap for everything),
 * potions and spare gear. Map shops buy; the shelf at home only sells. Rules: shared/rules/shop.ts.
 */
import { CONSUMABLES, EQUIPMENT, MATERIALS, SHOPS, itemInfo, junkValue, meetsLevel, sellPrice } from '@pw/shared';
import { repairAll, repairAllCost, sellAllJunk, sellItem } from '../game/rules';
import { sfx } from '../game/audio';
import { toast } from '../game/bus';
import type { SaveData } from '../state/store';
import { RARITY_CSS, RARITY_TH } from './bagWindow';
import { esc } from './dom';
import { itemIcon, SLOT_NAME, statText } from './equipWindow';
import { uiIcon } from './pixel';

export const shopState: { shopId: string; tab: 'buy' | 'sell'; sel: string | null } = { shopId: 'home', tab: 'buy', sel: null };

export function openShopState(shopId: string) {
  shopState.shopId = shopId;
  shopState.tab = 'buy';
  shopState.sel = null;
}

const coins = (n: number) => `${uiIcon('coin', true)}<b>${n.toLocaleString()}</b>`;

function kindLabel(id: string): string {
  const e = EQUIPMENT[id];
  if (e) return SLOT_NAME[e.slot];
  return CONSUMABLES[id] ? 'ของใช้' : 'ของดรอป';
}

function buyCard(s: SaveData, id: string): string {
  const info = itemInfo(id)!;
  const lvOk = meetsLevel(id, s.level);
  return `<button type="button" class="hs-card ${shopState.sel === id ? 'sel' : ''}" data-shopsel="${id}" style="--rar:${RARITY_CSS[info.rarity]}">
    ${info.level > 1 ? `<i class="hs-lv ${lvOk ? '' : 'no'}">Lv.${info.level}</i>` : ''}
    ${itemIcon(id, 'hs-ico')}
    <b style="color:${RARITY_CSS[info.rarity]}">${esc(info.nameTh)}</b>
    <small class="muted">${kindLabel(id)}</small>
    <span class="hs-price ${s.gold >= info.price ? '' : 'short'}">${coins(info.price)}</span>
  </button>`;
}

function detail(s: SaveData, id: string): string {
  const info = itemInfo(id);
  if (!info) return '';
  const e = EQUIPMENT[id];
  const c = CONSUMABLES[id];
  const lines: string[] = [];
  if (e) {
    const stats = statText(id);
    if (stats) lines.push(`<b class="bd-stat">${esc(stats)}</b>`);
    for (const [k, v] of Object.entries(e.modifiers.pct ?? {})) lines.push(`<b class="bd-stat">${k} +${Math.round((v as number) * 100)}%</b>`);
    if (e.effect) lines.push(`<span>${esc(e.effect)}</span>`);
    lines.push(`<span class="${meetsLevel(id, s.level) ? '' : 'bad'}">ต้องการ Lv.${info.level}${meetsLevel(id, s.level) ? '' : ` (ตอนนี้ Lv.${s.level})`}</span>`);
  }
  if (c) lines.push(`<b class="bd-stat">${c.kind === 'HEAL_HP' ? `ฟื้นฟู HP +${c.amount}` : c.kind === 'HEAL_MP' ? `ฟื้นฟู MP +${c.amount}` : 'ซ่อมอุปกรณ์ที่สวม'}</b>`);
  const owned = e ? s.gearBag.filter((g) => g.itemId === id).length : s.bag[id] ?? 0;
  const buyBtn = (qty: number) =>
    `<button type="button" class="btn ${qty === 1 ? 'primary' : ''}" data-buy="${id}" data-qty="${qty}" ${s.gold >= info.price * qty ? '' : 'disabled'}>ซื้อ${qty > 1 ? ` ×${qty}` : ''} ${coins(info.price * qty)}</button>`;
  return `<div class="bag-detail">
    <div class="bd-head">${itemIcon(id, 'bd-ico')}<div><b class="bd-name" style="color:${RARITY_CSS[info.rarity]}">${esc(info.nameTh)}</b>
      <small>${kindLabel(id)} · <span style="color:${RARITY_CSS[info.rarity]}">${RARITY_TH[info.rarity]}</span>${owned ? ` · มีอยู่ ${owned}` : ''}</small></div></div>
    <div class="bd-lines">${lines.join('')}</div>
    ${info.lore ? `<p class="bd-lore">“${esc(info.lore)}”</p>` : ''}
    <div class="bd-actions">${buyBtn(1)}${c ? buyBtn(5) + buyBtn(10) : ''}</div>
  </div>`;
}

function buyTab(s: SaveData): string {
  const shop = SHOPS[shopState.shopId]!;
  const repair = shop.repair ? repairAllCost(s, false) : 0;
  return `${shop.repair ? `<div class="sh-repair"><span>${uiIcon('swords', true)}ซ่อมอุปกรณ์ที่สวมทั้งหมด <small class="muted">(ที่บ้านถูกกว่าครึ่ง)</small></span>
      <button type="button" class="btn" data-shop-repair ${repair && s.gold >= repair ? '' : 'disabled'}>${repair ? coins(repair) : 'ไม่ต้องซ่อม'}</button></div>` : ''}
    <div class="hs-grid">${shop.stock.map((id) => buyCard(s, id)).join('')}</div>
    ${shopState.sel ? detail(s, shopState.sel) : '<p class="muted bag-hint">แตะสินค้าเพื่อดูค่าสถานะ ประวัติ และกดซื้อ</p>'}`;
}

function sellRow(icon: string, name: string, sub: string, price: number, actions: string): string {
  return `<div class="sl-row">${icon}<div class="sl-info"><b>${name}</b><small class="muted">${sub}</small></div>
    <span class="sl-price">${coins(price)}</span><span class="sl-act">${actions}</span></div>`;
}

function sellTab(s: SaveData): string {
  const shop = SHOPS[shopState.shopId]!;
  if (!shop.buys) {
    return `<p class="muted bag-hint">ชั้นวางในบ้านไม่รับซื้อของ — เอาของดรอปไปขายที่ร้านบนแผนที่
      (ร้านของชำ · ห้าง · ปั๊มน้ำมัน) แล้วเอาเงินมาซื้อของใหม่</p>`;
  }
  const junk = Object.entries(s.bag).filter(([id, n]) => MATERIALS[id] && n > 0);
  const uses = Object.entries(s.bag).filter(([id, n]) => CONSUMABLES[id] && n > 0);
  const total = junkValue(s.bag);
  const stack = ([id, n]: [string, number]) => {
    const info = itemInfo(id)!;
    return sellRow(
      itemIcon(id, 'sl-ico'),
      `<span style="color:${RARITY_CSS[info.rarity]}">${esc(info.nameTh)}</span> ×${n}`,
      `ชิ้นละ ${sellPrice(id).toLocaleString()} G`,
      sellPrice(id) * n,
      `<button type="button" class="mini" data-sellitem="${id}" data-qty="1">ขาย 1</button><button type="button" class="mini" data-sellitem="${id}" data-qty="${n}">หมด</button>`,
    );
  };
  const gear = s.gearBag.map((g, i) => {
    const e = EQUIPMENT[g.itemId];
    if (!e) return '';
    return sellRow(
      itemIcon(g.itemId, 'sl-ico'),
      `<span style="color:${RARITY_CSS[e.rarity]}">${esc(e.nameTh)}</span>`,
      g.durability <= 0 ? 'พัง — ขายได้ครึ่งราคา' : `ความทนทาน ${g.durability}/${e.maxDurability}`,
      sellPrice(g.itemId, g.durability),
      `<button type="button" class="mini" data-sell="${i}">ขาย</button>`,
    );
  });
  const section = (title: string, rows: string[]) => (rows.filter(Boolean).length ? `<div class="ro-eq-sub">${title}</div><div class="sl-list">${rows.join('')}</div>` : '');
  const empty = !junk.length && !uses.length && !gear.filter(Boolean).length;
  return `<button type="button" class="btn primary sl-all" data-sellalljunk ${total ? '' : 'disabled'}>ขายของดรอปทั้งหมด ${coins(total)}</button>
    ${section('▼ ของดรอปจากมอนสเตอร์', junk.map(stack))}
    ${section('▼ ของใช้ (รับซื้อ 25%)', uses.map(stack))}
    ${section('▼ อุปกรณ์ในกระเป๋า (รับซื้อ 30%)', gear)}
    ${empty ? '<p class="muted bag-hint">ยังไม่มีของให้ขาย — ออกไปล่ามอนสเตอร์ก่อน ของดรอปขายได้ทุกชิ้น</p>' : ''}`;
}

export function shopWindowHtml(s: SaveData): string {
  const shop = SHOPS[shopState.shopId] ?? SHOPS.home!;
  const tab = (id: 'buy' | 'sell', label: string) => `<button type="button" class="win-tab ${shopState.tab === id ? 'on' : ''}" data-shoptab="${id}">${label}</button>`;
  return `<div class="ro-equip shop-win">
    <div class="ro-eq-title"><span>${uiIcon('bag', true)}${esc(shop.nameTh)}</span><small class="sh-keeper">${esc(shop.keeperTh)}</small></div>
    <div class="win-tabs">${tab('buy', 'ซื้อ')}${tab('sell', shop.buys ? 'ขาย' : 'ขาย (ไม่รับ)')}</div>
    ${shopState.tab === 'buy' ? buyTab(s) : sellTab(s)}
    <div class="bag-foot"><span>${coins(s.gold)} Gold</span><span class="muted">Lv.${s.level}</span></div>
  </div>`;
}

export function wireShopWindow(body: HTMLElement, rerender: () => void) {
  const on = (sel: string, fn: (el: HTMLElement) => void) =>
    body.querySelectorAll<HTMLElement>(sel).forEach((x) => x.addEventListener('click', () => fn(x)));
  on('[data-shoptab]', (x) => {
    shopState.tab = x.dataset.shoptab as 'buy' | 'sell';
    rerender();
  });
  on('[data-shopsel]', (x) => {
    shopState.sel = shopState.sel === x.dataset.shopsel ? null : x.dataset.shopsel!;
    rerender();
  });
  on('[data-sellitem]', (x) => {
    const gold = sellItem(x.dataset.sellitem!, Number(x.dataset.qty));
    if (gold) {
      sfx('coin');
      toast(`ขายได้ ${gold.toLocaleString()} Gold`, 'good');
    }
  });
  on('[data-sellalljunk]', () => {
    const gold = sellAllJunk();
    if (gold) {
      sfx('coin');
      toast(`ขายของดรอปทั้งหมด ได้ ${gold.toLocaleString()} Gold`, 'good');
    }
  });
  on('[data-shop-repair]', () => {
    if (!repairAll(false)) return toast('Gold ไม่พอ', 'bad');
    sfx('block');
    toast('ซ่อมเสร็จ อุปกรณ์กลับมาใหม่เอี่ยม!', 'good');
  });
}
