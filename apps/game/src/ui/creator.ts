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
} from '../game/art';
import { el, esc } from './dom';

const HAIR_TH: Record<string, string> = { short: 'สั้น', spiky: 'ชี้ฟู', long: 'ยาว', bun: 'มวย' };
const SPIN: { facing: Facing; flip: boolean }[] = [
  { facing: 'down', flip: false },
  { facing: 'side', flip: false },
  { facing: 'up', flip: false },
  { facing: 'side', flip: true },
];

export function showCreator(root: HTMLElement, onDone: (name: string, ap: Appearance) => void) {
  const ap: Appearance = { ...DEFAULT_APPEARANCE, skin: Math.floor(Math.random() * SKIN_TONES.length) };
  const view = el(`<div class="onboard"><div class="card creator">
    <div class="logo">ก้าวข้ามมิติ</div>
    <div class="logo-sub">PIXEL WALKER</div>
    <div class="creator-grid">
      <div class="preview"><canvas width="72" height="104"></canvas><div class="preview-hint">หมุนโชว์ทุกทิศ</div></div>
      <div class="opts">
        <div class="opt-row"><span>ทรงผม</span><button class="arrow" data-k="hair" data-d="-1">◀</button><b data-v="hair"></b><button class="arrow" data-k="hair" data-d="1">▶</button></div>
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
  const palettes: Record<string, string[]> = { hairColor: HAIR_COLORS, skin: SKIN_TONES, outfit: OUTFIT_COLORS };

  const renderOpts = () => {
    view.querySelector('[data-v="hair"]')!.textContent = HAIR_TH[ap.hairStyle] ?? ap.hairStyle;
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

  view.querySelectorAll<HTMLElement>('.arrow').forEach((b) =>
    b.addEventListener('click', () => {
      const i = HAIR_STYLES.indexOf(ap.hairStyle);
      ap.hairStyle = HAIR_STYLES[(i + Number(b.dataset.d) + HAIR_STYLES.length) % HAIR_STYLES.length]!;
      renderOpts();
    }),
  );
  view.querySelector('[data-random]')!.addEventListener('click', () => {
    const r = (n: number) => Math.floor(Math.random() * n);
    ap.hairStyle = HAIR_STYLES[r(HAIR_STYLES.length)]!;
    ap.hairColor = r(HAIR_COLORS.length);
    ap.skin = r(SKIN_TONES.length);
    ap.outfit = r(OUTFIT_COLORS.length);
    renderOpts();
  });

  // Preview: cotton shirt + wooden sword so the outfit reads like the real game start.
  let tick = 0;
  const timer = window.setInterval(() => {
    tick++;
    const spin = SPIN[Math.floor(tick / 12) % SPIN.length]!;
    const frame = [1, 0, 2, 0][tick % 4]!;
    const sprite = heroCanvas({ classId: 'NOVICE', appearance: ap, chest: 'chest_cotton_01', weapon: 'weapon_wood_01' }, spin.facing, frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (spin.flip) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sprite, (canvas.width - sprite.width * 4) / 2, canvas.height - sprite.height * 4, sprite.width * 4, sprite.height * 4);
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
