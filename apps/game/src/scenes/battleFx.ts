/**
 * Battle effects: pixel sprite-sheet animations (pixel-art/fx) + chiptune sounds for combat
 * events. BattleScene calls these; everything here is presentation only.
 */
import Phaser from 'phaser';
import { SKILLS, type Element, type StatusId, type WeaponType } from '@pw/shared';
import { sfx, type Sfx } from '../game/audio';

export const FX_SHEETS = [
  'slash', 'slash_red', 'impact', 'crit', 'fire', 'water', 'lightning', 'ice', 'earth', 'holy', 'shadow',
  'poison', 'heal', 'mana', 'shield', 'buff', 'debuff', 'stun', 'cast', 'cast_holy', 'cast_fire', 'smoke',
];
export const PROJECTILES = ['fireball', 'orb_water', 'orb_holy', 'orb_shadow', 'spark', 'arrow', 'rock'];

export function preloadFx(scene: Phaser.Scene) {
  for (const n of FX_SHEETS) {
    if (!scene.textures.exists(`fx_${n}`)) scene.load.spritesheet(`fx_${n}`, `/assets/fx/${n}.png`, { frameWidth: 48, frameHeight: 48 });
  }
  for (const n of PROJECTILES) {
    if (!scene.textures.exists(`p_${n}`)) scene.load.spritesheet(`p_${n}`, `/assets/fx/p_${n}.png`, { frameWidth: 16, frameHeight: 16 });
  }
}

export function createFxAnims(scene: Phaser.Scene) {
  for (const n of FX_SHEETS) {
    if (scene.anims.exists(`fx_${n}`) || !scene.textures.exists(`fx_${n}`)) continue;
    scene.anims.create({ key: `fx_${n}`, frames: scene.anims.generateFrameNumbers(`fx_${n}`), frameRate: 16, repeat: 0 });
  }
  for (const n of PROJECTILES) {
    if (scene.anims.exists(`p_${n}`) || !scene.textures.exists(`p_${n}`)) continue;
    scene.anims.create({ key: `p_${n}`, frames: scene.anims.generateFrameNumbers(`p_${n}`), frameRate: 10, repeat: -1 });
  }
}

const ELEMENT_FX: Record<Element, string> = {
  NEUTRAL: 'impact', FIRE: 'fire', WATER: 'water', LIGHTNING: 'lightning', EARTH: 'earth', HOLY: 'holy', SHADOW: 'shadow',
};
const ELEMENT_SFX: Record<Element, Sfx> = {
  NEUTRAL: 'hit', FIRE: 'fire', WATER: 'water', LIGHTNING: 'thunder', EARTH: 'earth', HOLY: 'holy', SHADOW: 'shadow',
};
const ELEMENT_BOLT: Record<Element, string> = {
  NEUTRAL: 'arrow', FIRE: 'fireball', WATER: 'orb_water', LIGHTNING: 'spark', EARTH: 'rock', HOLY: 'orb_holy', SHADOW: 'orb_shadow',
};
const STATUS_FX: Partial<Record<StatusId, [string, Sfx]>> = {
  STUN: ['stun', 'stun'], FREEZE: ['ice', 'ice'], POISON: ['poison', 'poison'], BURN: ['fire', 'fire'],
  BLEED: ['slash_red', 'slash'], SLOW: ['debuff', 'debuff'], ROOT: ['debuff', 'debuff'], TAUNTING: ['buff', 'buff'],
};

export interface FxAnchor {
  x: number;
  y: number;
  /** On-screen body height (effects are centred on the body). */
  h: number;
}

/** Plays one effect animation at a unit; `px` = screen pixels per art pixel (matches the sprites). */
export function playFx(scene: Phaser.Scene, key: string, at: FxAnchor, px: number, opts: { delay?: number; ground?: boolean; scale?: number } = {}) {
  if (!scene.anims.exists(`fx_${key}`)) return;
  scene.time.delayedCall(opts.delay ?? 0, () => {
    const y = opts.ground ? at.y - 20 * px : at.y - at.h * 0.5;
    const spr = scene.add.sprite(at.x, y, `fx_${key}`).setScale(px * (opts.scale ?? 1)).setDepth(opts.ground ? 9 : 25);
    spr.play(`fx_${key}`);
    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy());
  });
}

/** A directional slash at the attacker's weapon, separate from the impact effect on its target. */
export function meleeSwing(scene: Phaser.Scene, at: FxAnchor, px: number, direction: 1 | -1) {
  if (!scene.anims.exists('fx_slash')) return;
  const x = at.x + direction * at.h * 0.18;
  const y = at.y - at.h * 0.6;
  const spr = scene.add
    .sprite(x, y, 'fx_slash')
    .setScale(px * 1.3)
    .setFlipX(direction < 0)
    .setAngle(direction * -18)
    .setDepth(28);
  spr.play('fx_slash');
  spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy());

  // The sprite-sheet arc is intentionally delicate; these short gold trails make the actual
  // weapon swing readable over bright monsters and at faster battle speeds.
  const span = Math.max(18, at.h * 0.28);
  const trails = scene.add.graphics().setDepth(29);
  trails.lineStyle(Math.max(2, px * 0.8), 0xffec99, 1);
  for (const offset of [-0.22, 0, 0.22]) {
    trails.lineBetween(
      x - direction * span * 0.7,
      y + span * (0.5 + offset),
      x + direction * span * 0.7,
      y - span * (0.5 - offset),
    );
  }
  scene.tweens.add({ targets: trails, alpha: 0, duration: 190, ease: 'Quad.easeOut', onComplete: () => trails.destroy() });
}

/** A projectile flying from caster to target; resolves after `ms`. */
export function shootProjectile(scene: Phaser.Scene, kind: string, from: FxAnchor, to: FxAnchor, px: number, ms: number) {
  if (!scene.anims.exists(`p_${kind}`)) return;
  const y0 = from.y - from.h * 0.55;
  const y1 = to.y - to.h * 0.5;
  const p = scene.add.sprite(from.x, y0, `p_${kind}`).setScale(px).setDepth(26);
  p.setFlipX(to.x < from.x);
  p.play(`p_${kind}`);
  scene.tweens.add({ targets: p, x: to.x, y: y1, duration: ms, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
}

export interface SkillLook {
  cast: string | null;
  bolt: string | null;
  melee: boolean;
}

/** How a skill looks when cast: a magic circle for spells, a projectile for ranged/magic attacks. */
export function skillLook(skillId: string): SkillLook {
  const sk = SKILLS[skillId];
  if (!sk || skillId === 'basic_attack') return { cast: null, bolt: null, melee: true };
  const magic = sk.effects.some((e) => e.kind === 'DAMAGE' && e.type === 'MAGIC');
  const offensive = sk.effects.some((e) => e.kind === 'DAMAGE');
  const cast = sk.kind === 'REACTIVE' ? null : sk.element === 'HOLY' ? 'cast_holy' : sk.element === 'FIRE' ? 'cast_fire' : magic || !offensive ? 'cast' : null;
  const bolt = offensive && (magic || sk.ranged) ? (sk.ranged && !magic ? 'arrow' : ELEMENT_BOLT[sk.element]) : null;
  return { cast, bolt, melee: offensive && !magic && !sk.ranged };
}

/** Hit effect + sound for a damage event. */
export function hitFx(
  scene: Phaser.Scene,
  at: FxAnchor,
  px: number,
  o: { element: Element; crit: boolean; block: boolean; melee: boolean; delay: number; weapon?: WeaponType | 'FIST' },
) {
  // Melee hits look like the weapon that landed them: blades cut, blunt things and fists thump.
  const blade = !o.weapon || o.weapon === 'SWORD' || o.weapon === 'DAGGER';
  const key = o.element === 'NEUTRAL' ? (o.melee ? (blade ? 'slash' : 'impact') : 'impact') : ELEMENT_FX[o.element];
  playFx(scene, key, at, px, { delay: o.delay, ground: ['fire', 'water', 'lightning', 'ice', 'earth', 'holy', 'poison'].includes(key) });
  if (o.crit) playFx(scene, 'crit', at, px, { delay: o.delay + 40 });
  if (o.block) playFx(scene, 'shield', at, px, { delay: o.delay, scale: 0.7 });
  scene.time.delayedCall(o.delay, () => {
    sfx(o.crit ? 'crit' : o.block ? 'block' : o.element === 'NEUTRAL' ? (o.melee ? 'slash' : 'hit') : ELEMENT_SFX[o.element]);
  });
}

export function statusFx(scene: Phaser.Scene, at: FxAnchor, px: number, status: StatusId, delay: number) {
  const f = STATUS_FX[status];
  if (!f) return;
  playFx(scene, f[0], at, px, { delay, ground: ['fire', 'ice', 'poison'].includes(f[0]), scale: status === 'BURN' || status === 'POISON' ? 0.7 : 1 });
  scene.time.delayedCall(delay, () => sfx(f[1]));
}

const TRAIL: Record<Element, number> = {
  NEUTRAL: 0xffec99, FIRE: 0xff9a4a, WATER: 0x6ad0ff, LIGHTNING: 0xffe45a, EARTH: 0xd8b070, HOLY: 0xfff2a8, SHADOW: 0xc890ff,
};

/**
 * The hero's swing, drawn from the weapon actually equipped (ROADMAP ⚔️ — effects follow the gear):
 * SWORD arc · DAGGER two quick cuts · SPEAR straight thrust · CLUB overhead smash + dust ·
 * STAFF bonk + sparkles in the staff's element · FIST punch burst. `at` = the landing spot.
 */
export function weaponSwing(scene: Phaser.Scene, at: FxAnchor, px: number, direction: 1 | -1, weapon: WeaponType | 'FIST', element: Element) {
  const color = TRAIL[element];
  const x = at.x + direction * at.h * 0.18;
  const y = at.y - at.h * 0.55;
  const span = Math.max(18, at.h * 0.28);
  const g = scene.add.graphics().setDepth(29);
  const fade = (ms: number) => scene.tweens.add({ targets: g, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  switch (weapon) {
    case 'SWORD':
      g.destroy();
      if (element !== 'NEUTRAL') {
        const tint = scene.add.graphics().setDepth(29);
        tint.lineStyle(Math.max(2, px * 0.8), color, 1);
        for (const o of [-0.2, 0, 0.2]) tint.lineBetween(x - direction * span * 0.7, y + span * (0.5 + o), x + direction * span * 0.7, y - span * (0.5 - o));
        scene.tweens.add({ targets: tint, alpha: 0, duration: 200, onComplete: () => tint.destroy() });
      }
      return meleeSwing(scene, at, px, direction);
    case 'DAGGER': {
      // Two fast, short cuts in an X — each with a small slash sprite.
      const cut = (flip: boolean) => {
        g.lineStyle(Math.max(3, px), color, 1);
        g.lineBetween(x - direction * span * 0.5, y + (flip ? 1 : -1) * span * 0.4, x + direction * span * 0.5, y - (flip ? 1 : -1) * span * 0.4);
        g.lineStyle(Math.max(1, px * 0.4), 0xffffff, 1);
        g.lineBetween(x - direction * span * 0.4, y + (flip ? 1 : -1) * span * 0.32, x + direction * span * 0.4, y - (flip ? 1 : -1) * span * 0.32);
        const spr = scene.add.sprite(x, y, 'fx_slash').setScale(px * 0.8).setFlipX(direction < 0).setAngle(flip ? 40 : -40).setDepth(28);
        spr.play('fx_slash');
        spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy());
      };
      cut(false);
      scene.time.delayedCall(70, () => g.active && cut(true));
      return fade(260);
    }
    case 'SPEAR': {
      // A long straight streak that narrows to a bright tip.
      const len = span * 2.8;
      const tip = x + direction * span * 0.4;
      for (let i = 0; i < 4; i++) {
        g.lineStyle(Math.max(2, px * (1.8 - i * 0.35)), i ? 0xffffff : color, 1 - i * 0.15);
        g.lineBetween(tip - direction * len * (1 - i * 0.18), y + (i - 1.5) * px, tip, y);
      }
      g.fillStyle(0xffffff, 1).fillTriangle(tip, y - px * 2, tip, y + px * 2, tip + direction * px * 4, y);
      if (scene.anims.exists('fx_impact')) {
        const hit = scene.add.sprite(tip + direction * px * 2, y, 'fx_impact').setScale(px * 0.7).setDepth(28);
        hit.play('fx_impact');
        hit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => hit.destroy());
      }
      return fade(240);
    }
    case 'CLUB': {
      // Overhead smash: a heavy downward arc, a thump and dust at the feet.
      g.lineStyle(Math.max(5, px * 1.6), element === 'NEUTRAL' ? 0xffb060 : color, 1);
      g.beginPath();
      g.arc(x - direction * span * 0.2, y + span * 0.2, span, direction > 0 ? -2.4 : -0.74, direction > 0 ? -0.2 : -2.94, direction < 0);
      g.strokePath();
      g.lineStyle(Math.max(2, px * 0.5), 0xffffff, 1);
      g.beginPath();
      g.arc(x - direction * span * 0.2, y + span * 0.2, span * 0.85, direction > 0 ? -2.2 : -0.94, direction > 0 ? -0.3 : -2.84, direction < 0);
      g.strokePath();
      playFx(scene, 'impact', { x: x + direction * span * 0.6, y: y + span * 0.9, h: at.h * 0.4 }, px, { scale: 1.1 });
      playFx(scene, 'smoke', { x: at.x + direction * span * 0.6, y: at.y, h: at.h }, px, { ground: true, scale: 0.7 });
      return fade(280);
    }
    case 'STAFF': {
      // A bonk plus a burst of sparkles and a small spell flash in the staff's own element.
      g.lineStyle(Math.max(3, px), color, 1);
      g.beginPath();
      g.arc(x, y, span * 0.7, direction > 0 ? -1.6 : -1.54, direction > 0 ? 0.2 : -3.34, direction < 0);
      g.strokePath();
      const sx0 = x + direction * span * 0.6;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const size = Math.max(3, Math.round(px * 1.3));
        const spark = scene.add.rectangle(sx0, y, size, size, i % 2 ? color : 0xffffff).setDepth(30);
        scene.tweens.add({ targets: spark, x: sx0 + Math.cos(a) * span * 0.9, y: y + Math.sin(a) * span * 0.9, alpha: 0, duration: 320, onComplete: () => spark.destroy() });
      }
      const key = element === 'NEUTRAL' ? 'mana' : ELEMENT_FX[element];
      playFx(scene, key, { x: sx0, y: y + at.h * 0.3, h: at.h * 0.6 }, px, { scale: 0.7 });
      return fade(260);
    }
    default: {
      // Bare fists: a round punch burst with speed lines.
      const px0 = x + direction * span * 0.5;
      g.lineStyle(Math.max(3, px), 0xffffff, 1).strokeCircle(px0, y, span * 0.3);
      g.lineStyle(Math.max(2, px * 0.6), 0xffec99, 1).strokeCircle(px0, y, span * 0.55);
      for (let i = 0; i < 3; i++) g.lineStyle(Math.max(1, px * 0.5), 0xffffff, 0.9).lineBetween(px0 - direction * span * (1 + i * 0.25), y + (i - 1) * px * 2, px0 - direction * span * 0.45, y + (i - 1) * px * 2);
      playFx(scene, 'impact', { x: px0, y: y + at.h * 0.3, h: at.h * 0.6 }, px, { scale: 0.8 });
      return fade(200);
    }
  }
}
