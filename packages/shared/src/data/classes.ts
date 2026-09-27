import type { ClassId, Modifiers, StatKey } from '../types';
import type { ClassTraits } from '../combat/types';

export interface ClassDef {
  id: ClassId;
  nameTh: string;
  nameEn: string;
  role: string;
  mainStats: StatKey[];
  passive: { id: string; name: string; description: string; modifiers: Modifiers };
  skills: string[];
  /** Always-on combat traits of the class (shown with the passive). */
  traits?: ClassTraits;
  traitNote?: { name: string; nameTh: string; description: string };
}

export const CLASS_CHANGE_LEVEL = 10;

/** Ranged/caster classes stand in the back row (lower aggro weight). */
export const BACK_ROW_CLASSES: ClassId[] = ['SORCERER', 'CLERIC', 'RANGER', 'TIME_MAGE', 'SUMMONER', 'BARD', 'DANCER'];

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
      'power_smash', 'stone_throw', 'focus', 'counter_jab',
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
    // FFT Knight (owner's picks 2026-09-27): Rend Power/Magick/Speed + Parry, plus a taunt and Iron Blood
    skills: ['rend_power', 'rend_magick', 'rend_speed', 'taunt', 'parry'],
    traits: { allyTurnHeal: { vit: 0.2, capPct: 0.02 } },
    traitNote: {
      name: 'Iron Blood',
      nameTh: 'เลือดเหล็ก',
      description: 'ทุกครั้งที่ฝ่ายเราได้เทิร์น ฟื้น HP = VIT × 0.2 (สูงสุด 2% Max HP ต่อครั้ง)',
    },
  },
  // FFT Black Mage (owner's picks 2026-09-27). The id stays SORCERER so saves and parties keep working.
  SORCERER: {
    id: 'SORCERER',
    nameTh: 'นักเวทดำ',
    nameEn: 'Black Mage',
    role: 'Magic DPS / AOE Buster',
    mainStats: ['int'],
    passive: {
      id: 'arcane_strength',
      name: 'Arcane Strength',
      description: 'MATK +10%',
      modifiers: { pct: { matk: 0.1 } },
    },
    skills: ['fire', 'firaga', 'thunder', 'thundaga', 'blizzard', 'blizzaga', 'magick_counter'],
  },
  // FFT Thief (owner's picks 2026-09-27). The id stays ASSASSIN so saves and parties keep working.
  ASSASSIN: {
    id: 'ASSASSIN',
    nameTh: 'โจร',
    nameEn: 'Thief',
    role: 'Speed / Steal',
    mainStats: ['agi', 'str'],
    passive: {
      id: 'shadow_strike',
      name: 'Shadow Strike',
      description: 'Critical Rate +15% และเดินบนแผนที่เร็วขึ้น 20%',
      modifiers: { flat: { crit: 0.15 }, pct: { moveSpeed: 0.2 } },
    },
    skills: ['steal_gil', 'vanish', 'steal_heart', 'double_attack', 'perfect_dodge'],
    traits: { poach: 0.3 },
    traitNote: {
      name: 'Poach',
      nameTh: 'ล่าของ',
      description: 'ชนะแล้ว มอนสเตอร์แต่ละตัวมีโอกาส 30% ให้ของดรอป (ขยะมอนสเตอร์) เพิ่ม 1 ชิ้น',
    },
  },
  // FFT Monk (owner's picks 2026-09-27) — the first class with a brand-new id.
  MONK: {
    id: 'MONK',
    nameTh: 'นักพรต',
    nameEn: 'Monk',
    role: 'Melee Brawler / Self-sustain',
    mainStats: ['str', 'vit'],
    passive: {
      id: 'brawler',
      name: 'Brawler',
      description: 'ATK +10% (สายหมัด)',
      modifiers: { pct: { atk: 0.1 } },
    },
    skills: ['pummel', 'aurablast', 'chakra', 'purification', 'first_strike'],
    traits: { allyTurnHeal: { vit: 0.3, capPct: 0.025, ownTurnOnly: true } },
    traitNote: {
      name: 'Lifefont',
      nameTh: 'ธารชีวิต',
      description: 'ทุกครั้งที่ตัวเองได้เทิร์น ฟื้น HP = VIT × 0.3 (สูงสุด 2.5% Max HP ต่อครั้ง)',
    },
  },
  // FFT Dancer (owner's picks + notes 2026-09-27).
  DANCER: {
    id: 'DANCER',
    nameTh: 'นักระบำ',
    nameEn: 'Dancer',
    role: 'Party Debuffs / MP Support',
    mainStats: ['agi', 'int'],
    passive: {
      id: 'graceful_step',
      name: 'Graceful Step',
      description: 'ทุกเทิร์นของนักระบำ เพื่อนทั้งทีม (รวมตัวเอง) ฟื้น MP 3%',
      modifiers: {},
    },
    skills: ['mincing_minuet', 'polka', 'slow_dance', 'forbidden_dance', 'heartbreak'],
    traits: { turnMpAura: 0.03 },
  },
  // FFT Bard (owner's picks + notes 2026-09-27).
  BARD: {
    id: 'BARD',
    nameTh: 'กวีนักร้อง',
    nameEn: 'Bard',
    role: 'Party Songs / Support',
    mainStats: ['int', 'vit'],
    passive: {
      id: 'encore',
      name: 'Encore',
      description: 'พลังฟื้นฟู +15%',
      modifiers: { pct: { healPower: 0.15 } },
    },
    skills: ['seraph_song', 'lifes_anthem', 'rousing_melody', 'battle_chant', 'soothing_tune'],
  },
  // FFT Ninja (owner's picks + notes 2026-09-27).
  NINJA: {
    id: 'NINJA',
    nameTh: 'นินจา',
    nameEn: 'Ninja',
    role: 'Evasion / Speed',
    mainStats: ['agi', 'dex'],
    passive: {
      id: 'ninja_arts',
      name: 'Ninja Arts',
      description: 'หลบหลีก +10% และความเร็ว +15%',
      modifiers: { flat: { evasion: 0.1 }, pct: { speed: 0.15 } },
    },
    skills: ['shuriken', 'bomb', 'shadow_clone', 'ninja_vanish', 'kawarimi'],
  },
  // FFT Samurai (owner's picks + notes 2026-09-27).
  SAMURAI: {
    id: 'SAMURAI',
    nameTh: 'ซามูไร',
    nameEn: 'Samurai',
    role: 'Katana / Area Physical',
    mainStats: ['str', 'luk'],
    passive: {
      id: 'bushido',
      name: 'Bushido',
      description: 'วิถีซามูไร: ATK +3% ทุกเทิร์นของตัวเอง (สูงสุด +30%)',
      modifiers: {},
    },
    skills: ['kotetsu', 'osafune', 'ama_no_murakumo', 'shirahadori'],
    traits: { atkPerTurn: { per: 0.03, max: 0.3 } },
  },
  // FFT Dragoon (owner's picks + notes 2026-09-27).
  DRAGOON: {
    id: 'DRAGOON',
    nameTh: 'อัศวินมังกร',
    nameEn: 'Dragoon',
    role: 'Jump Burst / Lancer',
    mainStats: ['str', 'vit'],
    passive: {
      id: 'dragon_blood',
      name: 'Dragon Blood',
      description: 'พลังมังกร: ATK เพิ่มตาม HP ที่เสียไป (เสีย HP 50% = ATK +25%)',
      modifiers: {},
    },
    skills: ['jump', 'dragons_faith', 'dragonheart'],
    traits: { rageAtk: 0.5 },
  },
  // FFT Geomancer (owner's picks 2026-09-27).
  GEOMANCER: {
    id: 'GEOMANCER',
    nameTh: 'นักธรณี',
    nameEn: 'Geomancer',
    role: 'Hybrid / Nature Magic',
    mainStats: ['str', 'int'],
    passive: {
      id: 'attack_boost',
      name: 'Attack Boost',
      description: 'ATK +15%',
      modifiers: { pct: { atk: 0.15 } },
    },
    skills: ['tanglevine', 'sinkhole', 'sandstorm', 'snowstorm', 'wind_blast', 'natures_wrath'],
  },
  // FFT Summoner (owner's picks 2026-09-27).
  SUMMONER: {
    id: 'SUMMONER',
    nameTh: 'นักอัญเชิญ',
    nameEn: 'Summoner',
    role: 'Summons / Area Magic',
    mainStats: ['int', 'vit'],
    passive: {
      id: 'halve_mp',
      name: 'Halve MP',
      description: 'ใช้ MP แค่ครึ่งเดียวทุกสกิล',
      modifiers: {},
    },
    skills: ['moogle', 'shiva', 'ramuh', 'ifrit', 'bahamut', 'critical_recover_mp'],
    traits: { mpCostMult: 0.5 },
  },
  // FFT Time Mage (owner's picks 2026-09-27).
  TIME_MAGE: {
    id: 'TIME_MAGE',
    nameTh: 'นักเวทกาลเวลา',
    nameEn: 'Time Mage',
    role: 'Time Magic / Tempo Control',
    mainStats: ['int', 'agi'],
    passive: {
      id: 'swiftness',
      name: 'Swiftness',
      description: 'ความเร็ว +15% (ได้เล่นก่อน)',
      modifiers: { pct: { speed: 0.15 } },
    },
    skills: ['haste', 'hastega', 'slow', 'slowga', 'stop', 'quick', 'graviga'],
  },
  // FFT White Mage (owner's picks 2026-09-27). The id stays CLERIC so saves and parties keep working.
  CLERIC: {
    id: 'CLERIC',
    nameTh: 'นักเวทขาว',
    nameEn: 'White Mage',
    role: 'Healer / Revive / Support',
    mainStats: ['int', 'vit'],
    passive: {
      id: 'arcane_defense',
      name: 'Arcane Defense',
      description: 'MDEF +20% และการรักษา +30%',
      modifiers: { pct: { healPower: 0.3, mdef: 0.2 } },
    },
    skills: ['cure', 'curaga', 'raise', 'protect', 'esuna', 'holy', 'regenerate'],
  },
  // FFT Archer (owner's picks 2026-09-27). The id stays RANGER so saves and parties keep working.
  RANGER: {
    id: 'RANGER',
    nameTh: 'นักธนู',
    nameEn: 'Archer',
    role: 'Ranged Physical DPS',
    mainStats: ['dex'],
    passive: {
      id: 'concentration',
      name: 'Concentration',
      description: 'ความแม่นยำ +50% (ศัตรูหลบยากขึ้นมาก) · ATK ได้จาก DEX',
      modifiers: {},
    },
    skills: ['aim', 'arrow_rain', 'double_shot', 'adrenaline_rush'],
    traits: { hitBonus: 0.5 },
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
      id: 'starter', nameTh: '⚔️ ชุดเริ่มต้น', description: 'โจมตีหนัก ปาหิน เสริมพลังโจมตี และกระแทกสวน',
      deck: ['power_smash', 'stone_throw', 'focus', 'counter_jab'],
    },
  ],
};
