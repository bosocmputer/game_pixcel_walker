/**
 * Character creator: name, appearance and starter gear on one page. Gear is picked in an
 * RO-style equipment window with a live walking preview; unspent starter budget becomes Gold
 * (MASTER_SPEC §5).
 */
import {
  CONSUMABLES,
  EQUIPMENT,
  STARTER_BUDGET,
  STARTER_FULL,
  STARTER_GEAR,
  STARTER_NAKED,
  STARTER_POTIONS,
  computeDerived,
  starterGold,
  starterPotionCost,
  totalStats,
  type EquipSlot,
  type StarterLoadout,
  type Stats,
} from '@pw/shared';
import { DEFAULT_APPEARANCE, HAIR_COLORS, HAIR_STYLES, OUTFIT_COLORS, SKIN_TONES, type Appearance, type Gender, type Paperdoll } from '../game/art';
import { getDefaultStyleForGender, getHairSwatchColors, getSkinSwatchColors, getStylesForGender, isAvatarPackLoaded, USE_AVATAR_PACK } from '../game/avatar';
import { el, esc } from './dom';
import { uiIcon } from './pixel';
import { equipWindowHtml, gearStatBonus, itemIcon, statText, wireEquipWindow, LEFT_SLOTS, RIGHT_SLOTS } from './equipWindow';

const HAIR_TH: Record<string, string> = { short: 'สั้น', spiky: 'ชี้ฟู', long: 'ยาว', bun: 'มวย' };
const ZERO: Stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };

export function showCreator(root: HTMLElement, onDone: (name: string, ap: Appearance, loadout: StarterLoadout) => void) {
  const pack = () => USE_AVATAR_PACK && isAvatarPackLoaded();
  const initialGender: Gender = 'male';
  const ap: Appearance = {
    ...DEFAULT_APPEARANCE,
    gender: initialGender,
    hairStyle: pack() ? getDefaultStyleForGender(initialGender) : 'short',
    skin: Math.floor(Math.random() * (pack() ? getSkinSwatchColors().length : SKIN_TONES.length)),
  };
  let loadout: StarterLoadout = { gear: { ...STARTER_FULL.gear }, potions: STARTER_FULL.potions };
  const offered = new Map(STARTER_GEAR.map((g) => [g.slot, g.items]));
  let selected: EquipSlot = 'weapon';

  const view = el(`<div class="onboard"><div class="card creator">
    <div class="logo">ก้าวข้ามมิติ</div>
    <div class="logo-sub">PIXEL WALKER</div>
    <div class="opts">
      <div class="opt-row gender-row">
        <span>เพศ</span>
        <div class="gender-btns">
          <button type="button" class="gender-btn on" data-gender="male">ชาย</button>
          <button type="button" class="gender-btn" data-gender="female">หญิง</button>
        </div>
      </div>
      <div class="opt-row hair-row">
        <span>ทรงผม</span>
        <button class="arrow" data-k="hair" data-d="-1">◀</button>
        <b data-v="hair"></b>
        <button class="arrow" data-k="hair" data-d="1">▶</button>
      </div>
      <div class="opt-row"><span>สีผม</span><div class="swatches" data-sw="hairColor"></div></div>
      <div class="opt-row"><span>สีผิว</span><div class="swatches" data-sw="skin"></div></div>
      <div class="opt-row outfit-row"><span>สีเสื้อ</span><div class="swatches" data-sw="outfit"></div></div>
      <button class="btn" data-random>${uiIcon('star', true)}สุ่มหน้าตา</button>
    </div>
    <div class="starter">
      <div class="starter-head"><b>${uiIcon('bag', true)}อุปกรณ์เริ่มต้น</b><span class="starter-gold">${uiIcon('coin', true)}เริ่มด้วย <b data-gold></b> Gold</span></div>
      <p class="muted">งบ ${STARTER_BUDGET} Gold — แตะช่องอุปกรณ์แล้วเลือกของ ชิ้นที่ไม่ใส่เก็บเป็นทองไว้ซื้อทีหลัง (ราคาเท่ากับร้านที่บ้าน)</p>
      <div class="starter-presets">
        <button type="button" class="chip-btn" data-preset="full">ใส่ครบชุด</button>
        <button type="button" class="chip-btn" data-preset="naked">ตัวเปล่า · ${STARTER_BUDGET} G</button>
      </div>
      <div data-equip></div>
      <div class="starter-potion" data-potion></div>
    </div>
    <label>ชื่อนักเดินทาง<input id="name" maxlength="16" placeholder="เช่น Somchai_Tank" autocomplete="off" /></label>
    <div class="err"></div>
    <p class="warn">! ระวังรถเสมอ อย่าเล่นขณะขับขี่ และอย่าเข้าพื้นที่ส่วนบุคคล</p>
    <button class="btn primary" id="next">สร้างตัวละคร</button>
  </div></div>`);
  root.appendChild(view);

  const doll = (): Paperdoll => {
    const sprite = (slot: EquipSlot) => {
      const id = loadout.gear[slot];
      return id ? EQUIPMENT[id]?.sprite : undefined;
    };
    return { classId: 'NOVICE', appearance: ap, helmet: sprite('helmet'), chest: sprite('chest'), weapon: sprite('weapon'), accessory: sprite('accessory') };
  };

  // --- Equipment window ----------------------------------------------------------------------
  const renderEquip = () => {
    const worn = Object.values(loadout.gear).filter((x): x is string => !!x);
    const stats = totalStats(ZERO);
    const derived = computeDerived({ level: 1, classId: 'NOVICE', mutation: null, stats, gear: worn.map((id) => EQUIPMENT[id]!.modifiers) });
    const options = offered.get(selected) ?? [];
    const cur = loadout.gear[selected] ?? null;
    const opt = (on: boolean, id: string | null) =>
      `<button type="button" class="pick ${on ? 'on' : ''}" data-pick="${id ?? ''}">
        ${id ? itemIcon(id, 'pick-ico') : '<span class="pick-none">✕</span>'}
        <span><b>${id ? esc(EQUIPMENT[id]!.nameTh) : 'ไม่ใส่'}</b>${id ? `<small>${statText(id)} · ${EQUIPMENT[id]!.price} G</small>` : '<small>เก็บเป็นทอง</small>'}</span>
      </button>`;
    const picker = [opt(!cur, null), ...options.map((id) => opt(cur === id, id))].join('');
    const box = view.querySelector<HTMLElement>('[data-equip]')!;
    box.innerHTML = equipWindowHtml({
      title: 'ไอเทมที่สวมใส่',
      slots: Object.fromEntries([...LEFT_SLOTS, ...RIGHT_SLOTS].map((s) => [s, loadout.gear[s] ? { itemId: loadout.gear[s]! } : null])),
      locked: [...LEFT_SLOTS, ...RIGHT_SLOTS].filter((s) => !offered.has(s)),
      selected,
      picker,
      stats,
      bonus: gearStatBonus(worn),
      derived,
      extra: [['Gold', String(starterGold(loadout))]],
    });
    wireEquipWindow(
      box,
      (slot) => {
        selected = slot;
        renderEquip();
      },
      doll,
    );
    box.querySelectorAll<HTMLElement>('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        loadout.gear[selected] = b.dataset.pick || null;
        renderAll();
      }),
    );

    const potion = CONSUMABLES[STARTER_POTIONS.itemId];
    const pbox = view.querySelector<HTMLElement>('[data-potion]')!;
    pbox.innerHTML = `<span class="sp-label">ของใช้</span>
      <button type="button" class="pick ${loadout.potions ? '' : 'on'}" data-potions="0"><span class="pick-none">✕</span><span><b>ไม่เอา</b></span></button>
      <button type="button" class="pick ${loadout.potions ? 'on' : ''}" data-potions="1">${itemIcon(STARTER_POTIONS.itemId, 'pick-ico')}
        <span><b>${esc(potion?.nameTh ?? 'ยา')} ×${STARTER_POTIONS.count}</b><small>${starterPotionCost()} G</small></span></button>`;
    pbox.querySelectorAll<HTMLElement>('[data-potions]').forEach((b) =>
      b.addEventListener('click', () => {
        loadout.potions = b.dataset.potions === '1';
        renderAll();
      }),
    );
    view.querySelector('[data-gold]')!.textContent = String(starterGold(loadout));
    // The shirt dye only matters when wearing a cloth top.
    view.querySelector('.outfit-row')!.classList.toggle('off', loadout.gear.chest !== 'cotton_shirt');
  };

  // --- Appearance ----------------------------------------------------------------------------
  const palettes = (): Record<string, string[]> =>
    pack()
      ? { hairColor: getHairSwatchColors(), skin: getSkinSwatchColors(), outfit: OUTFIT_COLORS }
      : { hairColor: HAIR_COLORS, skin: SKIN_TONES, outfit: OUTFIT_COLORS };

  const renderLooks = () => {
    const gender = ap.gender ?? 'male';
    view.querySelectorAll<HTMLButtonElement>('.gender-btn').forEach((b) => b.classList.toggle('on', b.dataset.gender === gender));
    const hairLabel = pack()
      ? (getStylesForGender(gender).find((s) => s.id === ap.hairStyle)?.label_th ?? ap.hairStyle)
      : (HAIR_TH[ap.hairStyle] ?? ap.hairStyle);
    view.querySelector('[data-v="hair"]')!.textContent = hairLabel;
    for (const [key, colors] of Object.entries(palettes())) {
      const box = view.querySelector(`[data-sw="${key}"]`)!;
      box.innerHTML = colors
        .map((c, i) => `<button class="sw ${ap[key as keyof Appearance] === i ? 'on' : ''}" style="background:${esc(c)}" data-i="${i}" aria-label="สี ${i + 1}"></button>`)
        .join('');
      box.querySelectorAll<HTMLElement>('.sw').forEach((b) =>
        b.addEventListener('click', () => {
          (ap as unknown as Record<string, number>)[key] = Number(b.dataset.i);
          renderLooks();
        }),
      );
    }
  };

  const renderAll = () => {
    renderLooks();
    renderEquip();
  };

  view.querySelectorAll<HTMLButtonElement>('.gender-btn').forEach((b) =>
    b.addEventListener('click', () => {
      const g = b.dataset.gender as Gender;
      if (ap.gender === g) return;
      ap.gender = g;
      if (pack()) ap.hairStyle = getDefaultStyleForGender(g);
      renderLooks();
    }),
  );

  view.querySelectorAll<HTMLElement>('.arrow').forEach((b) =>
    b.addEventListener('click', () => {
      const delta = Number(b.dataset.d);
      if (pack()) {
        const styles = getStylesForGender(ap.gender ?? 'male');
        if (!styles.length) return;
        const i = Math.max(0, styles.findIndex((s) => s.id === ap.hairStyle));
        ap.hairStyle = styles[(i + delta + styles.length) % styles.length]!.id;
      } else {
        const i = HAIR_STYLES.indexOf(ap.hairStyle);
        ap.hairStyle = HAIR_STYLES[(i + delta + HAIR_STYLES.length) % HAIR_STYLES.length]!;
      }
      renderLooks();
    }),
  );

  view.querySelector('[data-random]')!.addEventListener('click', () => {
    const r = (n: number) => Math.floor(Math.random() * n);
    ap.gender = Math.random() < 0.5 ? 'male' : 'female';
    if (pack()) {
      const styles = getStylesForGender(ap.gender);
      ap.hairStyle = styles[r(styles.length)]?.id ?? getDefaultStyleForGender(ap.gender);
      ap.hairColor = r(getHairSwatchColors().length);
      ap.skin = r(getSkinSwatchColors().length);
    } else {
      ap.hairStyle = HAIR_STYLES[r(HAIR_STYLES.length)]!;
      ap.hairColor = r(HAIR_COLORS.length);
      ap.skin = r(SKIN_TONES.length);
    }
    ap.outfit = r(OUTFIT_COLORS.length);
    renderLooks();
  });

  view.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      const preset = b.dataset.preset === 'naked' ? STARTER_NAKED : STARTER_FULL;
      loadout = { gear: { ...preset.gear }, potions: preset.potions };
      renderEquip();
    }),
  );

  const input = view.querySelector<HTMLInputElement>('#name')!;
  const submit = () => {
    const name = input.value.trim();
    if (name.length < 2) {
      view.querySelector('.err')!.textContent = 'ใส่ชื่ออย่างน้อย 2 ตัวอักษร';
      input.focus();
      return;
    }
    view.remove();
    onDone(name, { ...ap }, loadout);
  };
  view.querySelector('#next')!.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
  renderAll();
}
