/**
 * Character creator: name, appearance and starter gear on one page, with a live, rotating,
 * walking preview wearing the chosen gear. Unspent starter budget becomes Gold (MASTER_SPEC §5).
 */
import {
  EQUIPMENT,
  STARTER_BUDGET,
  STARTER_FULL,
  STARTER_GEAR,
  STARTER_NAKED,
  STARTER_POTIONS,
  CONSUMABLES,
  starterGold,
  starterPotionCost,
  type EquipSlot,
  type StarterLoadout,
} from '@pw/shared';
import {
  DEFAULT_APPEARANCE,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  SKIN_TONES,
  heroCanvas,
  type Appearance,
  type Facing,
  type Gender,
} from '../game/art';
import {
  getDefaultStyleForGender,
  getHairSwatchColors,
  getSkinSwatchColors,
  getStylesForGender,
  isAvatarPackLoaded,
  USE_AVATAR_PACK,
} from '../game/avatar';
import { el, esc } from './dom';

const HAIR_TH: Record<string, string> = { short: 'สั้น', spiky: 'ชี้ฟู', long: 'ยาว', bun: 'มวย' };
const SLOT_TH: Partial<Record<EquipSlot, string>> = { helmet: 'หัว', chest: 'ตัว', weapon: 'อาวุธ', boots: 'เท้า' };

/** "+2 DEF" style summary of an item's flat bonuses. */
function statText(id: string): string {
  const flat = EQUIPMENT[id]?.modifiers.flat ?? {};
  return Object.entries(flat)
    .map(([k, v]) => `${k.toUpperCase()}+${v}`)
    .join(' ');
}
const SPIN: { facing: Facing; flip: boolean }[] = [
  { facing: 'down', flip: false },
  { facing: 'side', flip: false },
  { facing: 'up', flip: false },
  { facing: 'side', flip: true },
];

export function showCreator(root: HTMLElement, onDone: (name: string, ap: Appearance, loadout: StarterLoadout) => void) {
  const isPack = USE_AVATAR_PACK && isAvatarPackLoaded();
  const initialGender: Gender = 'male';
  const initialHair = isPack ? getDefaultStyleForGender(initialGender) : 'short';
  const skinCount = isPack ? getSkinSwatchColors().length : SKIN_TONES.length;

  const ap: Appearance = {
    ...DEFAULT_APPEARANCE,
    gender: initialGender,
    hairStyle: initialHair,
    skin: Math.floor(Math.random() * skinCount),
  };
  let loadout: StarterLoadout = { gear: { ...STARTER_FULL.gear }, potions: STARTER_FULL.potions };

  const view = el(`<div class="onboard"><div class="card creator">
    <div class="logo">ก้าวข้ามมิติ</div>
    <div class="logo-sub">PIXEL WALKER</div>
    <div class="creator-grid">
      <div class="preview"><canvas width="96" height="128"></canvas><div class="preview-hint">หมุนโชว์ทุกทิศ</div></div>
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
        <button class="btn" data-random>🎲 สุ่ม</button>
      </div>
    </div>
    <div class="starter">
      <div class="starter-head"><b>🎒 อุปกรณ์เริ่มต้น</b><span class="starter-gold">💰 เริ่มด้วย <b data-gold></b> Gold</span></div>
      <p class="muted">งบ ${STARTER_BUDGET} Gold — ใส่ชิ้นไหนหักราคาชิ้นนั้น ชิ้นที่ไม่ใส่เก็บเป็นทองไว้ซื้อทีหลัง (ราคาเท่ากับร้านที่บ้าน)</p>
      <div class="starter-presets">
        <button type="button" class="chip-btn" data-preset="full">ใส่ครบชุด</button>
        <button type="button" class="chip-btn" data-preset="naked">ตัวเปล่า · ${STARTER_BUDGET} G</button>
      </div>
      <div data-slots></div>
    </div>
    <label>ชื่อนักเดินทาง<input id="name" maxlength="16" placeholder="เช่น Somchai_Tank" autocomplete="off" /></label>
    <div class="err"></div>
    <p class="warn">⚠️ ระวังรถเสมอ อย่าเล่นขณะขับขี่ และอย่าเข้าพื้นที่ส่วนบุคคล</p>
    <button class="btn primary" id="next">สร้างตัวละคร</button>
  </div></div>`);
  root.appendChild(view);

  const canvas = view.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const getPalettes = (): Record<string, string[]> => {
    if (USE_AVATAR_PACK && isAvatarPackLoaded()) {
      return {
        hairColor: getHairSwatchColors(),
        skin: getSkinSwatchColors(),
        outfit: OUTFIT_COLORS,
      };
    }
    return { hairColor: HAIR_COLORS, skin: SKIN_TONES, outfit: OUTFIT_COLORS };
  };

  const renderStarter = () => {
    const chip = (on: boolean, attrs: string, label: string, sub = '') =>
      `<button type="button" class="chip-btn ${on ? 'on' : ''}" ${attrs}>${label}${sub ? ` <small>${sub}</small>` : ''}</button>`;
    const rows = STARTER_GEAR.map(({ slot, items }) => {
      const cur = loadout.gear[slot] ?? null;
      const opts = [chip(!cur, `data-slot="${slot}" data-item=""`, 'ไม่ใส่')]
        .concat(items.map((id) => chip(cur === id, `data-slot="${slot}" data-item="${id}"`, esc(EQUIPMENT[id]!.nameTh), `${statText(id)} · ${EQUIPMENT[id]!.price}G`)))
        .join('');
      return `<div class="opt-row starter-row"><span>${SLOT_TH[slot] ?? slot}</span><div class="chips">${opts}</div></div>`;
    });
    const potionName = CONSUMABLES[STARTER_POTIONS.itemId]?.nameTh ?? 'ยา';
    rows.push(`<div class="opt-row starter-row"><span>ของใช้</span><div class="chips">${chip(!loadout.potions, 'data-potions="0"', 'ไม่เอา')}${chip(loadout.potions, 'data-potions="1"', `${esc(potionName)} ×${STARTER_POTIONS.count}`, `${starterPotionCost()}G`)}</div></div>`);
    const box = view.querySelector<HTMLElement>('[data-slots]')!;
    box.innerHTML = rows.join('');
    view.querySelector('[data-gold]')!.textContent = String(starterGold(loadout));
    box.querySelectorAll<HTMLElement>('[data-slot]').forEach((b) =>
      b.addEventListener('click', () => {
        loadout.gear[b.dataset.slot as EquipSlot] = b.dataset.item || null;
        renderOpts();
      }),
    );
    box.querySelectorAll<HTMLElement>('[data-potions]').forEach((b) =>
      b.addEventListener('click', () => {
        loadout.potions = b.dataset.potions === '1';
        renderOpts();
      }),
    );
    // The shirt dye only matters when wearing a cloth top.
    const dyeable = loadout.gear.chest === 'cotton_shirt';
    view.querySelector('.outfit-row')!.classList.toggle('off', !dyeable);
  };

  const renderOpts = () => {
    const usingPack = USE_AVATAR_PACK && isAvatarPackLoaded();
    const gender = ap.gender ?? 'male';
    renderStarter();

    // Update gender toggle buttons
    view.querySelectorAll<HTMLButtonElement>('.gender-btn').forEach((b) => {
      b.classList.toggle('on', b.dataset.gender === gender);
    });

    // Update hair label
    if (usingPack) {
      const styles = getStylesForGender(gender);
      const cur = styles.find((s) => s.id === ap.hairStyle);
      view.querySelector('[data-v="hair"]')!.textContent = cur?.label_th ?? cur?.id ?? ap.hairStyle;
    } else {
      view.querySelector('[data-v="hair"]')!.textContent = HAIR_TH[ap.hairStyle] ?? ap.hairStyle;
    }

    // Render color swatches
    const palettes = getPalettes();
    for (const [key, colors] of Object.entries(palettes)) {
      const box = view.querySelector(`[data-sw="${key}"]`)!;
      box.innerHTML = colors
        .map((c, i) => `<button class="sw ${ap[key as keyof Appearance] === i ? 'on' : ''}" style="background:${esc(c)}" data-i="${i}" aria-label="สี ${i + 1}"></button>`)
        .join('');
      box.querySelectorAll<HTMLElement>('.sw').forEach((b) =>
        b.addEventListener('click', () => {
          (ap as unknown as Record<string, number>)[key] = Number(b.dataset.i);
          renderOpts();
        }),
      );
    }
  };

  // Gender toggle listener
  view.querySelectorAll<HTMLButtonElement>('.gender-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const targetGender = b.dataset.gender as Gender;
      if (ap.gender === targetGender) return;
      ap.gender = targetGender;
      if (USE_AVATAR_PACK && isAvatarPackLoaded()) {
        ap.hairStyle = getDefaultStyleForGender(targetGender);
      }
      renderOpts();
    });
  });

  // Hairstyle arrow buttons
  view.querySelectorAll<HTMLElement>('.arrow').forEach((b) =>
    b.addEventListener('click', () => {
      const delta = Number(b.dataset.d);
      if (USE_AVATAR_PACK && isAvatarPackLoaded()) {
        const styles = getStylesForGender(ap.gender ?? 'male');
        if (styles.length === 0) return;
        const idx = styles.findIndex((s) => s.id === ap.hairStyle);
        const curIdx = idx >= 0 ? idx : 0;
        const nextIdx = (curIdx + delta + styles.length) % styles.length;
        ap.hairStyle = styles[nextIdx]!.id;
      } else {
        const i = HAIR_STYLES.indexOf(ap.hairStyle);
        ap.hairStyle = HAIR_STYLES[(i + delta + HAIR_STYLES.length) % HAIR_STYLES.length]!;
      }
      renderOpts();
    }),
  );

  // Randomize button
  view.querySelector('[data-random]')!.addEventListener('click', () => {
    const r = (n: number) => Math.floor(Math.random() * n);
    ap.gender = Math.random() < 0.5 ? 'male' : 'female';
    if (USE_AVATAR_PACK && isAvatarPackLoaded()) {
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
    renderOpts();
  });

  view.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      const preset = b.dataset.preset === 'naked' ? STARTER_NAKED : STARTER_FULL;
      loadout = { gear: { ...preset.gear }, potions: preset.potions };
      renderOpts();
    }),
  );
  const sprite = (slot: EquipSlot) => {
    const id = loadout.gear[slot];
    return id ? EQUIPMENT[id]?.sprite : undefined;
  };

  // Preview animation timer
  let tick = 0;
  const timer = window.setInterval(() => {
    tick++;
    const spin = SPIN[Math.floor(tick / 12) % SPIN.length]!;
    const isPackActive = USE_AVATAR_PACK && isAvatarPackLoaded();
    const frame = isPackActive ? tick % 4 : [1, 0, 2, 0][tick % 4]!;
    const hero = heroCanvas(
      { classId: 'NOVICE', appearance: ap, helmet: sprite('helmet'), chest: sprite('chest'), weapon: sprite('weapon'), boots: sprite('boots') },
      spin.facing,
      frame,
    );

    const scale = isPackActive ? 2 : 4;
    const sw = hero.width * scale;
    const sh = hero.height * scale;
    const dx = (canvas.width - sw) / 2;
    const dy = canvas.height - sh;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (spin.flip) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(hero, dx, dy, sw, sh);
    ctx.restore();
  }, 160);

  const input = view.querySelector<HTMLInputElement>('#name')!;
  const submit = () => {
    const name = input.value.trim();
    if (name.length < 2) {
      view.querySelector('.err')!.textContent = 'ใส่ชื่ออย่างน้อย 2 ตัวอักษร';
      input.focus();
      return;
    }
    window.clearInterval(timer);
    view.remove();
    onDone(name, { ...ap }, loadout);
  };
  view.querySelector('#next')!.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
  renderOpts();
}
