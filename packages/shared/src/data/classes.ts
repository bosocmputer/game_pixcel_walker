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
      description: 'EXP จากการเดิน +10% จนถึง Lv.10',
      modifiers: {},
    },
    skills: ['basic_attack', 'quick_strike', 'first_aid'],
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
    skills: ['basic_attack', 'shield_bash', 'taunt', 'iron_wall'],
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
    skills: ['basic_attack', 'fireball', 'chain_lightning', 'mana_shield'],
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
    skills: ['basic_attack', 'shadow_step', 'poison_blade', 'evasion_mastery'],
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
    skills: ['basic_attack', 'holy_heal', 'blessing_of_light'],
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
    skills: ['basic_attack', 'snipe_shot'],
  },
};
