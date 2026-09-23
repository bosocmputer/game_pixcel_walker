/** Character creator: name + appearance with a live, rotating, walking 16-bit preview. */
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
const SPIN: { facing: Facing; flip: boolean }[] = [
  { facing: 'down', flip: false },
  { facing: 'side', flip: false },
  { facing: 'up', flip: false },
  { facing: 'side', flip: true },
];

export function showCreator(root: HTMLElement, onDone: (name: string, ap: Appearance) => void) {
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
        <div class="opt-row"><span>สีชุด</span><div class="swatches" data-sw="outfit"></div></div>
        <button class="btn" data-random>🎲 สุ่ม</button>
      </div>
    </div>
    <label>ชื่อนักเดินทาง<input id="name" maxlength="16" placeholder="เช่น Somchai_Tank" autocomplete="off" /></label>
    <div class="err"></div>
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

  const renderOpts = () => {
    const usingPack = USE_AVATAR_PACK && isAvatarPackLoaded();
    const gender = ap.gender ?? 'male';

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

  // Preview animation timer
  let tick = 0;
  const timer = window.setInterval(() => {
    tick++;
    const spin = SPIN[Math.floor(tick / 12) % SPIN.length]!;
    const isPackActive = USE_AVATAR_PACK && isAvatarPackLoaded();
    const frame = isPackActive ? tick % 4 : [1, 0, 2, 0][tick % 4]!;
    const sprite = heroCanvas({ classId: 'NOVICE', appearance: ap, chest: 'chest_cotton_01', weapon: 'weapon_wood_01' }, spin.facing, frame);

    const scale = isPackActive ? 2 : 4;
    const sw = sprite.width * scale;
    const sh = sprite.height * scale;
    const dx = (canvas.width - sw) / 2;
    const dy = canvas.height - sh;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (spin.flip) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sprite, dx, dy, sw, sh);
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
    onDone(name, { ...ap });
  };
  view.querySelector('#next')!.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
  renderOpts();
}
