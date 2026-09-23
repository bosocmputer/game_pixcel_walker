/** Test arena: pick any monsters (or a full boss dungeon), scale them, and fight without rewards/penalties. */
import { MONSTERS, landmarkWaves, type WaveDef } from '@pw/shared';
import { bus, toast } from '../game/bus';
import { esc } from './dom';
import { uiIcon } from './pixel';

const MAX_LINEUP = 5;

const state = {
  lineup: [] as string[],
  hpMult: 1,
  atkMult: 1,
  modifiers: false,
  dummyRounds: 20,
  dummyCount: 1,
};

const ELEMENT_ICON: Record<string, string> = { NEUTRAL: '', FIRE: '🔥', WATER: '💧', LIGHTNING: '⚡', EARTH: '🪨', HOLY: '✨', SHADOW: '🌑' };

export function arenaPanel(): string {
  const field = Object.values(MONSTERS).filter((m) => !m.boss && !m.passive).sort((a, b) => a.level - b.level);
  const bosses = Object.values(MONSTERS).filter((m) => m.boss).sort((a, b) => a.level - b.level);
  const chip = (group: 'hp' | 'atk', v: number, label: string) =>
    `<button class="chip-btn ${(group === 'hp' ? state.hpMult : state.atkMult) === v ? 'on' : ''}" data-mult="${group}:${v}">${label}</button>`;
  const lineup = state.lineup.length
    ? state.lineup.map((id, i) => `<button class="tag lineup" data-remove="${i}">${esc(MONSTERS[id]!.nameTh)} ✕</button>`).join(' ')
    : '<span class="muted">ยังไม่ได้เลือก — กด "+" ที่มอนสเตอร์ด้านล่าง</span>';
  const row = (id: string, extra = '') => {
    const m = MONSTERS[id]!;
    return `<div class="row"><div><b>${ELEMENT_ICON[m.element] ?? ''} ${esc(m.nameTh)}</b> <span class="tag">Lv.${m.level}</span>
      <br><small class="muted">HP ${m.hp.toLocaleString()} · ATK ${m.atk} · DEF ${m.def}${m.row === 'BACK' ? ' · แถวหลัง' : ''}${m.deck?.length ? ` · สกิล ${m.deck.length}` : ''}</small></div>
      <span class="spacer"></span>${extra}</div>`;
  };
  return `<h2>${uiIcon('swords')}สนามทดสอบการต่อสู้</h2>
    <p class="muted">เลือกมอนสเตอร์มาลองชุดสกิล — เริ่ม HP/MP เต็มทุกครั้ง ใช้ยาทดสอบ (HP 5 · MP 5) ไม่แตะของในกระเป๋า ไม่ได้รางวัล ไม่มีบทลงโทษ</p>
    <h3>🎯 หุ่นไม้ฝึกซ้อม (ไม่ตีกลับ)</h3>
    <p class="muted">ตีได้เรื่อย ๆ จนครบจำนวนรอบ ใช้ดูดาเมจต่อรอบและความถี่ของสกิล</p>
    <div class="row">จำนวนรอบ ${[10, 20, 50].map((n) => `<button class="chip-btn ${state.dummyRounds === n ? 'on' : ''}" data-drounds="${n}">${n}</button>`).join('')}</div>
    <div class="row">จำนวนหุ่น ${[1, 3].map((n) => `<button class="chip-btn ${state.dummyCount === n ? 'on' : ''}" data-dcount="${n}">${n} ตัว</button>`).join('')}</div>
    <button class="btn primary" data-dummy="training_dummy">🪵 หุ่นไม้ (DEF 0)</button>
    <button class="btn" data-dummy="armored_dummy">🛡️ หุ่นเกราะ (DEF/MDEF 100)</button>
    <h3>ทีมศัตรู (${state.lineup.length}/${MAX_LINEUP})</h3>
    <div class="deck-now">${lineup}</div>
    <h4>ความโหด</h4>
    <div class="row">HP ${chip('hp', 1, '×1')}${chip('hp', 3, '×3')}${chip('hp', 10, '×10')}</div>
    <div class="row">ATK ${chip('atk', 1, '×1')}${chip('atk', 2, '×2')}${chip('atk', 3, '×3')}</div>
    <div class="row"><label><input type="checkbox" data-mods ${state.modifiers ? 'checked' : ''}> สุ่มสภาพแวดล้อม (Wave Modifier)</label></div>
    <button class="btn primary" data-arena-go ${state.lineup.length ? '' : 'disabled'}>⚔️ เริ่มทดสอบ</button>
    <button class="btn" data-arena-clear>ล้างทีม</button>
    <h3>ดันเจี้ยนบอส (เต็มรูปแบบ)</h3>
    ${bosses.map((m) => row(m.id, `<button class="mini" data-dungeon="${m.id}">${m.boss?.worldBoss ? 'สู้บอส' : `${landmarkWaves(m.id).length} เวฟ`}</button>`)).join('')}
    <h3>มอนสเตอร์ทั่วไป</h3>
    ${field.map((m) => row(m.id, `<button class="mini" data-add="${m.id}">+</button>`)).join('')}`;
}

/** Wires the arena panel; `rerender` redraws it after state changes, `close` hides the sheet. */
export function wireArena(body: HTMLElement, rerender: () => void, close: () => void) {
  const on = (sel: string, fn: (el: HTMLElement) => void) =>
    body.querySelectorAll<HTMLElement>(sel).forEach((x) => x.addEventListener('click', () => fn(x)));
  on('[data-add]', (x) => {
    if (state.lineup.length >= MAX_LINEUP) return toast(`ทีมศัตรูเต็มแล้ว (สูงสุด ${MAX_LINEUP})`, 'bad');
    state.lineup.push(x.dataset.add!);
    rerender();
  });
  on('[data-remove]', (x) => {
    state.lineup.splice(Number(x.dataset.remove), 1);
    rerender();
  });
  on('[data-mult]', (x) => {
    const [g, v] = x.dataset.mult!.split(':');
    if (g === 'hp') state.hpMult = Number(v);
    else state.atkMult = Number(v);
    rerender();
  });
  body.querySelector<HTMLInputElement>('[data-mods]')?.addEventListener('change', (e) => {
    state.modifiers = (e.target as HTMLInputElement).checked;
  });
  on('[data-arena-clear]', () => {
    state.lineup = [];
    rerender();
  });
  const start = (waves: WaveDef[], maxRounds?: number, dummy = false) => {
    close();
    bus.emit('battle:start', {
      kind: 'TEST',
      monsterIds: waves[0]!.monsterIds,
      test: dummy
        ? { waves, hpMult: 1, atkMult: 1, modifiers: false, maxRounds }
        : { waves, hpMult: state.hpMult, atkMult: state.atkMult, modifiers: state.modifiers },
    });
  };
  on('[data-drounds]', (x) => {
    state.dummyRounds = Number(x.dataset.drounds);
    rerender();
  });
  on('[data-dcount]', (x) => {
    state.dummyCount = Number(x.dataset.dcount);
    rerender();
  });
  on('[data-dummy]', (x) => {
    const id = x.dataset.dummy!;
    start([{ monsterIds: Array.from({ length: state.dummyCount }, () => id) }], state.dummyRounds, true);
  });
  on('[data-arena-go]', () => state.lineup.length && start([{ monsterIds: [...state.lineup] }]));
  on('[data-dungeon]', (x) => {
    const id = x.dataset.dungeon!;
    start(MONSTERS[id]?.boss?.worldBoss ? [{ monsterIds: [id], boss: true }] : landmarkWaves(id));
  });
}
