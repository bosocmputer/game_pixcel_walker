/** Animated hero preview on a <canvas>: walks in place and turns to show every side. */
import { heroCanvas, type Facing, type Paperdoll } from '../game/art';
import { isAvatarPackLoaded, USE_AVATAR_PACK } from '../game/avatar';

const SPIN: { facing: Facing; flip: boolean }[] = [
  { facing: 'down', flip: false },
  { facing: 'side', flip: false },
  { facing: 'up', flip: false },
  { facing: 'side', flip: true },
];

/**
 * Starts the preview loop; it stops by itself once the canvas leaves the document
 * (panels re-render their HTML freely). Returns a stop function.
 */
export function startHeroPreview(canvas: HTMLCanvasElement, getDoll: () => Paperdoll): () => void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  let tick = 0;
  const draw = () => {
    const spin = SPIN[Math.floor(tick / 12) % SPIN.length]!;
    const pack = USE_AVATAR_PACK && isAvatarPackLoaded();
    const frame = pack ? tick % 4 : [1, 0, 2, 0][tick % 4]!;
    const hero = heroCanvas(getDoll(), spin.facing, frame);
    const scale = Math.max(1, Math.floor(Math.min(canvas.width / hero.width, canvas.height / hero.height)));
    const w = hero.width * scale, h = hero.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (spin.flip) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(hero, Math.round((canvas.width - w) / 2), canvas.height - h, w, h);
    ctx.restore();
    tick++;
  };
  draw();
  const timer = window.setInterval(() => {
    if (!canvas.isConnected) return window.clearInterval(timer);
    draw();
  }, 160);
  return () => window.clearInterval(timer);
}
