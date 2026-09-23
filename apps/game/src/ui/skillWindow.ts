/**
 * RO-style skill window (tab "skill" next to "equipment" in the character panel): the 6-slot
 * skill deck as pixel slots, a picker for the selected slot, and deck presets.
 * Icons are pixel art from pixel-art/skill-icons (served at /assets/skills/<id>.png).
 */
import { DECK_SIZE, SKILLS, type SkillDef } from '@pw/shared';
import { esc } from './dom';

const TRIGGER_TH: Record<string, string> = {
  COVER: 'รับแทนเพื่อน', ASSIST: 'ตามตีซ้ำ', COUNTER: 'สวนกลับ', ON_DODGE: 'เมื่อหลบได้', ON_LOW_HP: 'เมื่อ HP ต่ำ', ON_ALLY_DEATH: 'เมื่อเพื่อนตาย',
};
export const ELEMENT_TH: Record<string, string> = {
  NEUTRAL: 'ไม่มีธาตุ', FIRE: 'ไฟ', WATER: 'น้ำ', LIGHTNING: 'สายฟ้า', EARTH: 'ดิน', HOLY: 'ศักดิ์สิทธิ์', SHADOW: 'เงา',
};

export function skillIcon(id: string, cls = 'sk-ico'): string {
  return `<img class="${cls}" src="/assets/skills/${esc(id)}.png" alt="" draggable="false" />`;
}

/** "35% · CD 1 · 8 MP" or "ตอบโต้: สวนกลับ · 25%". */
export function skillMeta(sk: SkillDef): string {
  return sk.kind === 'REACTIVE'
    ? `ตอบโต้: ${TRIGGER_TH[sk.trigger ?? ''] ?? ''} · ${sk.rate}%`
    : `${sk.rate}% · CD ${sk.cooldown} · ${sk.mp} MP`;
}

/** Tab strip for the character window title bar. */
export function charTabs(active: 'equip' | 'skill'): string {
  return `<span class="ro-tabs">
    <button type="button" class="ro-eq-tab ${active === 'equip' ? 'on' : ''}" data-chartab="equip">equipment</button>
    <button type="button" class="ro-eq-tab ${active === 'skill' ? 'on' : ''}" data-chartab="skill">skill</button></span>`;
}

export interface SkillWindowModel {
  title: string;
  tabs: string;
  deck: string[];
  pool: string[];
  selected: number | null;
  presets: { id: string; nameTh: string; description: string; on: boolean }[];
}

export function skillWindowHtml(m: SkillWindowModel): string {
  const slots = Array.from({ length: DECK_SIZE }, (_, i) => {
    const id = m.deck[i];
    const sk = id ? SKILLS[id] : undefined;
    const cls = ['sk-slot', m.selected === i ? 'sel' : '', sk ? '' : 'empty', sk?.kind === 'REACTIVE' ? 'reactive' : ''].join(' ');
    return `<button type="button" class="${cls}" data-skslot="${i}">
      ${sk ? skillIcon(sk.id) : '<span class="eq-empty">+</span>'}
      <span class="eq-txt"><span class="eq-name">${sk ? esc(sk.nameTh) : `ช่อง ${i + 1}`}</span>${sk ? `<small class="eq-dur">${sk.rate}%</small>` : ''}</span>
    </button>`;
  }).join('');

  let picker = '';
  if (m.selected !== null) {
    const cur = m.deck[m.selected];
    const row = (id: string) => {
      const sk = SKILLS[id]!;
      const inDeck = m.deck.includes(id);
      return `<button type="button" class="pick sk-pick ${id === cur ? 'on' : ''}" data-skpick="${id}">
        ${skillIcon(id, 'pick-ico')}
        <span><b>${esc(sk.nameTh)}${inDeck && id !== cur ? ' <em class="in-deck">ในชุด</em>' : ''}</b>
          <small>${esc(skillMeta(sk))} · ${ELEMENT_TH[sk.element] ?? sk.element}</small>
          <small class="desc">${esc(sk.description)}</small></span>
      </button>`;
    };
    const active = m.pool.filter((id) => SKILLS[id]?.kind === 'ACTIVE').map(row).join('');
    const reactive = m.pool.filter((id) => SKILLS[id]?.kind === 'REACTIVE').map(row).join('');
    picker = `<div class="eq-picker sk-picker">
      <div class="eq-picker-h">ช่อง ${m.selected + 1}${cur ? ` <button type="button" class="mini" data-skremove="${m.selected}">เอาออก</button>` : ''}</div>
      <div class="sk-group">สกิลใช้งาน (ทอยทุกเทิร์น)</div>${active}
      <div class="sk-group">สกิลตอบโต้ (ทำงานเมื่อเกิดเหตุการณ์)</div>${reactive}
    </div>`;
  }

  const presets = m.presets.length
    ? `<div class="ro-eq-sub">▲ ชุดแนะนำ</div><div class="sk-presets">${m.presets
        .map((p) => `<button type="button" class="preset ${p.on ? 'on' : ''}" data-preset="${p.id}"><b>${esc(p.nameTh)}</b><small>${esc(p.description)}</small></button>`)
        .join('')}</div>`
    : '';

  return `<div class="ro-equip ro-skill">
    <div class="ro-eq-title"><span>${esc(m.title)}</span>${m.tabs}</div>
    <div class="sk-head">ชุดสกิล (Skill Deck) <b>${m.deck.length}/${DECK_SIZE}</b> · แตะช่องเพื่อเปลี่ยนสกิล</div>
    <div class="sk-grid">${slots}</div>
    ${picker}
    ${presets}
    <p class="muted sk-help">ทุกเทิร์นระบบทอย % ของสกิลใช้งานตามลำดับความสำคัญ ไม่ติดเลย = โจมตีธรรมดา ·
      สกิลตอบโต้ (มีตราสายฟ้าทอง) ทำงานเมื่อเกิดเหตุการณ์ · สีกรอบไอคอน = ธาตุ</p>
  </div>`;
}
