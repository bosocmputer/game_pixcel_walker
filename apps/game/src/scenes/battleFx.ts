/**
 * Battle effects: pixel sprite-sheet animations (pixel-art/fx) + chiptune sounds for combat
 * events. BattleScene calls these; everything here is presentation only.
 */
import Phaser from 'phaser';
import { SKILLS, type Element, type StatusId } from '@pw/shared';
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
export function hitFx(scene: Phaser.Scene, at: FxAnchor, px: number, o: { element: Element; crit: boolean; block: boolean; melee: boolean; delay: number }) {
  const key = o.element === 'NEUTRAL' ? (o.melee ? 'slash' : 'impact') : ELEMENT_FX[o.element];
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
