import type { ClassId, Modifiers, StatKey } from '../types';

export interface ClassDef {
  id: ClassId;
  nameTh: string;
  nameEn: string;
  role: string;
  mainStats: StatKey[];
  passive: { id: string; name: string; description: string; modifiers: Modifiers };
  skills: string[];
}

export const CLASS_CHANGE_LEVEL = 10;

/** Ranged/caster classes stand in the back row (lower aggro weight). */
export const BACK_ROW_CLASSES: ClassId[] = ['SORCERER', 'CLERIC', 'RANGER'];

/** Skills a class can put in its deck: Novice basics + its own kit. */
export function classSkillPool(classId: ClassId): string[] {
  const own = CLASSES[classId].skills;
  return classId === 'NOVICE' ? own : [...CLASSES.NOVICE.skills, ...own];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  NOVICE: {
    id: 'NOVICE',
    nameTh: 'ผู้เริ่มต้น',
    nameEn: 'Novice',
    role: 'Balanced / All-Rounder',
    mainStats: [],
    passive: {
      id: 'fresh_legs',
      name: 'Fresh Legs',
      description: 'EXP จากมอนสเตอร์ +10% จนถึง Lv.10',
      modifiers: {},
    },
    skills: [
      'quick_strike', 'power_smash', 'stone_throw', 'sweep_kick', 'dirty_trick', 'fire_spark', 'aqua_splash',
      'war_cry', 'focus', 'first_aid', 'guard_stance', 'counter_jab', 'lucky_dodge', 'second_wind',
    ],
  },
  KNIGHT: {
    id: 'KNIGHT',
    nameTh: 'อัศวิน',
    nameEn: 'Knight',
    role: 'Main Tank / Crowd Control',
    mainStats: ['vit'],
    passive: {
      id: 'shield_barrier',
      name: 'Shield Barrier',
      description: 'DEF +25% และ HP Max +20%',
      modifiers: { pct: { def: 0.25, maxHp: 0.2 } },
    },
    skills: ['shield_bash', 'taunt', 'guardian', 'iron_wall'],
  },
  SORCERER: {
    id: 'SORCERER',
    nameTh: 'จอมเวท',
    nameEn: 'Sorcerer',
    role: 'Magic DPS / AOE Buster',
    mainStats: ['int'],
    passive: {
      id: 'mana_affinity',
      name: 'Mana Affinity',
      description: 'สกิลเวทกว้างขึ้น 30% และร่ายเร็วขึ้น 15%',
      modifiers: {},
    },
    skills: ['fireball', 'chain_lightning', 'frost_nova', 'mana_shield'],
  },
  ASSASSIN: {
    id: 'ASSASSIN',
    nameTh: 'นักฆ่า',
    nameEn: 'Assassin',
    role: 'Physical Burst / Speed',
    mainStats: ['agi', 'str'],
    passive: {
      id: 'shadow_strike',
      name: 'Shadow Strike',
      description: 'Critical Rate +15% และเดินบนแผนที่เร็วขึ้น 20%',
      modifiers: { flat: { crit: 0.15 }, pct: { moveSpeed: 0.2 } },
    },
    skills: ['shadow_step', 'poison_blade', 'shadow_assist', 'evasion_mastery'],
  },
  CLERIC: {
    id: 'CLERIC',
    nameTh: 'นักบุญ',
    nameEn: 'Cleric',
    role: 'Healer / Buffer / Support',
    mainStats: ['int', 'vit'],
    passive: {
      id: 'divine_grace',
      name: 'Divine Grace',
      description: 'การรักษา +30% และปาร์ตี้ได้ MDEF +15%',
      modifiers: { pct: { healPower: 0.3, mdef: 0.15 } },
    },
    skills: ['holy_heal', 'blessing_of_light', 'smite', 'divine_grace'],
  },
  RANGER: {
    id: 'RANGER',
    nameTh: 'นายพราน',
    nameEn: 'Ranger',
    role: 'Ranged Physical DPS',
    mainStats: ['dex'],
    passive: {
      id: 'eagle_eye',
      name: 'Eagle Eye',
      description: 'ระยะโจมตี ×2 และมองเห็นจุดเกิดบอสบนแผนที่ไกลขึ้น',
      modifiers: {},
    },
    skills: ['snipe_shot', 'multi_shot', 'covering_fire', 'hunter_mark'],
  },
};

export interface DeckPreset {
  id: string;
  nameTh: string;
  description: string;
  deck: string[];
}

/** Ready-made starting decks per class (players can copy one and then tweak). */
export const DECK_PRESETS: Partial<Record<ClassId, DeckPreset[]>> = {
  NOVICE: [
    {
      id: 'balanced', nameTh: '⚖️ สายสมดุล', description: 'ตีต่อเนื่อง ฟื้นตัวเองได้ เหมาะกับมือใหม่',
      deck: ['quick_strike', 'power_smash', 'first_aid', 'guard_stance', 'counter_jab', 'second_wind'],
    },
    {
      id: 'berserker', nameTh: '⚔️ สายบุกหนัก', description: 'บัฟ ATK + Critical แล้วทุบแรง ๆ จบไว แต่บาง',
      deck: ['war_cry', 'focus', 'power_smash', 'quick_strike', 'sweep_kick', 'second_wind'],
    },
    {
      id: 'ironwall', nameTh: '🛡️ สายอึดสวนกลับ', description: 'ทนนาน สวนกลับ ฟื้น HP บ่อย เหมาะตีบอส',
      deck: ['guard_stance', 'first_aid', 'counter_jab', 'lucky_dodge', 'second_wind', 'quick_strike'],
    },
    {
      id: 'elemental', nameTh: '🔥 สายธาตุ', description: 'ใช้ไฟ/น้ำ + สถานะ เหมาะถ้าอัป INT',
      deck: ['fire_spark', 'aqua_splash', 'dirty_trick', 'first_aid', 'guard_stance', 'second_wind'],
    },
    {
      id: 'crowd', nameTh: '🌀 สายรุมหลายตัว', description: 'กวาดศัตรูหลายตัวพร้อมกัน เหมาะดันเจี้ยน',
      deck: ['sweep_kick', 'stone_throw', 'dirty_trick', 'quick_strike', 'guard_stance', 'counter_jab'],
    },
  ],
};
