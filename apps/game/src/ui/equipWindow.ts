/**
 * RO-classic style equipment window ("ไอเทมที่สวมใส่"): equipment slots on both sides of an
 * animated hero, a picker strip for the selected slot, and the status block underneath.
 * Used by the character creator (starter gear) and the in-game character panel.
 * Icons are pixel art from pixel-art/item-icons (served at /assets/items/<id>.png).
 */
import { EQUIPMENT, STAT_KEYS, type DerivedStats, type EquipSlot, type StatKey, type Stats } from '@pw/shared';
import type { Paperdoll } from '../game/art';
import { startHeroPreview } from './heroPreview';
import { esc } from './dom';

export const LEFT_SLOTS: EquipSlot[] = ['helmet', 'weapon', 'accessory'];
export const RIGHT_SLOTS: EquipSlot[] = ['chest', 'offhand', 'boots'];

export const SLOT_NAME: Record<EquipSlot, string> = {
  helmet: 'หัว',
  chest: 'ชุด',
  weapon: 'อาวุธ',
  offhand: 'มือรอง',
  boots: 'รองเท้า',
  accessory: 'เครื่องประดับ',
};

export function itemIcon(id: string, cls = 'eq-ico'): string {
  return `<img class="${cls}" src="/assets/items/${esc(id)}.png" alt="" draggable="false" />`;
}

export function slotGhost(slot: EquipSlot, cls = 'eq-ico'): string {
  return `<img class="${cls} ghost" src="/assets/items/slot_${slot}.png" alt="" draggable="false" />`;
}

export interface SlotItem {
  itemId: string;
  durability?: number;
  max?: number;
}

export interface EquipWindowModel {
  title: string;
  slots: Partial<Record<EquipSlot, SlotItem | null>>;
  /** Slots that can't be used here (shown dimmed, not selectable). */
  locked?: EquipSlot[];
  selected: EquipSlot | null;
  /** Picker strip HTML for the selected slot (options / bag items). */
  picker: string;
  stats: Stats;
  /** Flat stat bonus from gear, shown as "base + bonus". */
  bonus: Partial<Stats>;
  derived: DerivedStats;
  /** Show [+] allocation buttons (wired by the host through data-alloc). */
  statPoints?: number;
  /** Extra rows at the bottom of the right column, e.g. ["Gold", "50"]. */
  extra?: [string, string][];
}

function slotButton(slot: EquipSlot, side: 'l' | 'r', m: EquipWindowModel): string {
  const it = m.slots[slot];
  const def = it ? EQUIPMENT[it.itemId] : undefined;
  const locked = m.locked?.includes(slot);
  const broken = !!it && it.durability !== undefined && it.durability <= 0;
  const dur = it && it.max ? `<small class="eq-dur ${broken ? 'bad' : ''}">${broken ? 'พัง' : `${it.durability}/${it.max}`}</small>` : '';
  const name = def ? `<span class="eq-name">${esc(def.nameTh)}</span>${dur}` : `<span class="eq-name ghost">${SLOT_NAME[slot]}</span>`;
  const cls = ['eq-slot', side, m.selected === slot ? 'sel' : '', def ? '' : 'empty', broken ? 'broken' : '', locked ? 'locked' : ''].join(' ');
  return `<button type="button" class="${cls}" data-eqslot="${slot}" ${locked ? 'disabled' : ''}>
    ${def ? itemIcon(def.id) : slotGhost(slot)}<span class="eq-txt">${name}</span></button>`;
}

const STAT_LABEL: Record<StatKey, string> = { str: 'Str', agi: 'Agi', vit: 'Vit', int: 'Int', dex: 'Dex', luk: 'Luk' };

export function equipWindowHtml(m: EquipWindowModel): string {
  const d = m.derived;
  const pts = m.statPoints ?? 0;
  const statRows = STAT_KEYS.map((k) => {
    const b = m.bonus[k] ?? 0;
    const plus = m.statPoints !== undefined ? `<button type="button" class="ro-plus" data-alloc="${k}" ${pts ? '' : 'disabled'}>+</button>` : '';
    return `<span>${STAT_LABEL[k]}</span><b>${m.stats[k]}${b ? `<i> + ${b}</i>` : ''}</b>${plus || '<em></em>'}`;
  }).join('');
  const right: [string, string][] = [
    ['Atk', String(d.atk)],
    ['Matk', String(d.matk)],
    ['Def', String(d.def)],
    ['Mdef', String(d.mdef)],
    ['Critical', `${(d.crit * 100).toFixed(1)}%`],
    ['Flee', `${(d.evasion * 100).toFixed(1)}%`],
    ['Speed', d.speed.toFixed(1)],
    ['HP / SP', `${d.maxHp} / ${d.maxMp}`],
    ...(m.statPoints !== undefined ? ([['Status Point', String(pts)]] as [string, string][]) : []),
    ...(m.extra ?? []),
  ];
  return `<div class="ro-equip">
    <div class="ro-eq-title"><span>${esc(m.title)}</span><span class="ro-eq-tab">equipment</span></div>
    <div class="ro-eq-body">
      <div class="eq-col">${LEFT_SLOTS.map((s) => slotButton(s, 'l', m)).join('')}</div>
      <div class="eq-hero"><canvas width="96" height="128"></canvas></div>
      <div class="eq-col">${RIGHT_SLOTS.map((s) => slotButton(s, 'r', m)).join('')}</div>
    </div>
    ${m.selected ? `<div class="eq-picker"><div class="eq-picker-h">${SLOT_NAME[m.selected]}</div>${m.picker}</div>` : ''}
    <div class="ro-eq-sub">▲ สถานะ</div>
    <div class="ro-eq-stats">
      <div class="st-left">${statRows}</div>
      <div class="st-right">${right.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join('')}</div>
    </div>
  </div>`;
}

/** Wires slot selection and starts the hero preview inside an already-rendered window. */
export function wireEquipWindow(host: HTMLElement, onSelect: (slot: EquipSlot) => void, getDoll: () => Paperdoll) {
  host.querySelectorAll<HTMLElement>('[data-eqslot]').forEach((b) => b.addEventListener('click', () => onSelect(b.dataset.eqslot as EquipSlot)));
  const canvas = host.querySelector<HTMLCanvasElement>('.eq-hero canvas');
  if (canvas) startHeroPreview(canvas, getDoll);
}

/** Sum of flat primary-stat bonuses from a list of equipped item ids. */
export function gearStatBonus(itemIds: string[]): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const id of itemIds) {
    const flat = EQUIPMENT[id]?.modifiers.flat ?? {};
    for (const k of STAT_KEYS) if (flat[k]) out[k] = (out[k] ?? 0) + flat[k]!;
  }
  return out;
}

/** "+2 DEF" style summary of an item's flat bonuses. */
export function statText(id: string): string {
  const flat = EQUIPMENT[id]?.modifiers.flat ?? {};
  return Object.entries(flat)
    .map(([k, v]) => `${k.toUpperCase()}+${v}`)
    .join(' ');
}
