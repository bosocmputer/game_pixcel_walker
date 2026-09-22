import type { DerivedStats, Element } from '../types';

export type Target = 'ENEMY' | 'ALL_ENEMIES' | 'SELF' | 'ALL_ALLIES';

export type StatusId = 'STUN' | 'SLOW' | 'POISON' | 'ROOT' | 'TAUNT' | 'BLEED';

export type SkillEffect =
  | {
      kind: 'DAMAGE';
      type: 'PHYSICAL' | 'MAGIC' | 'TRUE';
      element?: Element;
      /** Damage = sum(scaling[stat] * attacker[stat]) + flat */
      scaling: Partial<Record<keyof DerivedStats, number>>;
      flat?: number;
      /** Extra jumps; each jump deals (1 - falloff*n) damage. */
      chain?: { jumps: number; falloff: number };
      /** Guaranteed critical hit. */
      forceCrit?: boolean;
    }
  | { kind: 'HEAL'; scaling: Partial<Record<keyof DerivedStats, number>>; flat?: number }
  | { kind: 'STATUS'; status: StatusId; seconds: number; chance?: number; potency?: number }
  | { kind: 'BUFF'; pct: Partial<Record<keyof DerivedStats, number>>; seconds: number }
  | { kind: 'MANA_SHIELD'; ratio: number; seconds: number };

export interface SkillDef {
  id: string;
  name: string;
  nameTh: string;
  kind: 'ACTIVE' | 'PASSIVE';
  mp: number;
  cooldown: number;
  target: Target;
  effects: SkillEffect[];
  description: string;
}

export const SKILLS: Record<string, SkillDef> = {
  basic_attack: {
    id: 'basic_attack',
    name: 'Attack',
    nameTh: 'โจมตี',
    kind: 'ACTIVE',
    mp: 0,
    cooldown: 0,
    target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } }],
    description: 'โจมตีธรรมดา 100% ATK',
  },

  // Knight
  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    nameTh: 'กระแทกโล่',
    kind: 'ACTIVE',
    mp: 10,
    cooldown: 6,
    target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.2, def: 1.5 } },
      { kind: 'STATUS', status: 'STUN', seconds: 2 },
    ],
    description: '120% ATK + DEF×1.5 และ Stun 2 วินาที',
  },
  taunt: {
    id: 'taunt',
    name: 'Taunt',
    nameTh: 'คำรามดึงความสนใจ',
    kind: 'ACTIVE',
    mp: 15,
    cooldown: 12,
    target: 'SELF',
    effects: [
      { kind: 'STATUS', status: 'TAUNT', seconds: 5 },
      { kind: 'BUFF', pct: { def: 0.3 }, seconds: 5 },
    ],
    description: 'ดึงศัตรูทั้งหมดมาโจมตีตัวเอง 5 วินาที และ DEF +30%',
  },
  iron_wall: {
    id: 'iron_wall',
    name: 'Iron Wall',
    nameTh: 'ปราการเหล็กกล้า',
    kind: 'PASSIVE',
    mp: 0,
    cooldown: 0,
    target: 'SELF',
    effects: [],
    description: 'เมื่อ HP ต่ำกว่า 30% ได้เกราะดูดซับ 50% Max HP นาน 8 วินาที (1 ครั้ง/การต่อสู้)',
  },

  // Sorcerer
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    nameTh: 'ลูกไฟทำลายล้าง',
    kind: 'ACTIVE',
    mp: 25,
    cooldown: 4,
    target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', element: 'FIRE', scaling: { matk: 2.2 } }],
    description: 'ลูกไฟ 220% MATK ใส่ศัตรูรอบเป้าหมาย',
  },
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    nameTh: 'สายฟ้าต่อเนื่อง',
    kind: 'ACTIVE',
    mp: 40,
    cooldown: 8,
    target: 'ENEMY',
    effects: [
      {
        kind: 'DAMAGE',
        type: 'MAGIC',
        element: 'LIGHTNING',
        scaling: { matk: 1.8 },
        chain: { jumps: 4, falloff: 0.1 },
      },
    ],
    description: '180% MATK ชิ่งได้สูงสุด 4 ตัว (ลด 10% ต่อเป้า)',
  },
  mana_shield: {
    id: 'mana_shield',
    name: 'Mana Shield',
    nameTh: 'โล่มานาคุ้มกัน',
    kind: 'ACTIVE',
    mp: 20,
    cooldown: 30,
    target: 'SELF',
    effects: [{ kind: 'MANA_SHIELD', ratio: 0.7, seconds: 10 }],
    description: 'ดาเมจ 70% ไปหักจาก MP แทน HP นาน 10 วินาที',
  },

  // Assassin
  shadow_step: {
    id: 'shadow_step',
    name: 'Shadow Step',
    nameTh: 'ก้าวผ่านเงา',
    kind: 'ACTIVE',
    mp: 15,
    cooldown: 7,
    target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.5 }, forceCrit: true }],
    description: 'วาร์ปไปหลังเป้าหมาย โจมตี Critical แน่นอน 150%',
  },
  poison_blade: {
    id: 'poison_blade',
    name: 'Poison Blade',
    nameTh: 'คมดาบยาพิษ',
    kind: 'ACTIVE',
    mp: 20,
    cooldown: 15,
    target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } },
      { kind: 'STATUS', status: 'POISON', seconds: 6, potency: 0.05 },
    ],
    description: 'ติดพิษเสีย 5% Max HP/วินาที นาน 6 วินาที (บอสรับผล 1%)',
  },
  evasion_mastery: {
    id: 'evasion_mastery',
    name: 'Evasion Mastery',
    nameTh: 'หลบหลีกเชี่ยวชาญ',
    kind: 'PASSIVE',
    mp: 0,
    cooldown: 0,
    target: 'SELF',
    effects: [],
    description: 'หลบสำเร็จ → AGI +10 นาน 5 วินาที (สะสม 5 สแตก)',
  },

  // Cleric
  holy_heal: {
    id: 'holy_heal',
    name: 'Holy Heal',
    nameTh: 'ละอองแสงเยียวยา',
    kind: 'ACTIVE',
    mp: 30,
    cooldown: 5,
    target: 'ALL_ALLIES',
    effects: [{ kind: 'HEAL', scaling: { matk: 1.5 }, flat: 500 }],
    description: 'ฟื้นฟู HP ทั้งปาร์ตี้ 150% MATK + 500',
  },
  blessing_of_light: {
    id: 'blessing_of_light',
    name: 'Blessing of Light',
    nameTh: 'พรแห่งแสง',
    kind: 'ACTIVE',
    mp: 50,
    cooldown: 60,
    target: 'ALL_ALLIES',
    effects: [{ kind: 'BUFF', pct: { atk: 0.2, def: 0.2, speed: 0.2 }, seconds: 30 }],
    description: 'ATK, DEF, Speed +20% ทั้งปาร์ตี้ 30 วินาที',
  },

  // Ranger
  snipe_shot: {
    id: 'snipe_shot',
    name: 'Snipe Shot',
    nameTh: 'ศรเพชฌฆาต',
    kind: 'ACTIVE',
    mp: 35,
    cooldown: 10,
    target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 3.5 } }],
    description: 'ยิงระยะไกล 350% ATK',
  },
};
