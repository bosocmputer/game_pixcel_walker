import type { MutationId, StatKey } from '../types';

export const MUTATION_MIN_LEVEL = 20;
/** Share of self-allocated points that must go into one stat. */
export const MUTATION_THRESHOLD = 0.8;

export interface MutationDef {
  id: MutationId;
  stat: StatKey;
  title: string;
  titleTh: string;
  passive: string;
  aura: string;
  upside: string[];
  downside: string[];
}

/**
 * Balanced from the source PDF (see docs/MASTER_SPEC.md §7).
 * Numeric effects are applied in rules/stats.ts (derived stats) and in the combat engine (flags).
 */
export const MUTATIONS: Record<MutationId, MutationDef> = {
  PURE_TANK: {
    id: 'PURE_TANK',
    stat: 'vit',
    title: 'Walking Fortress',
    titleTh: 'โล่ไร้พ่ายแห่งยุคสมัย',
    passive: 'Absolute Reflection',
    aura: 'aura_pure_vit',
    upside: ['ลดดาเมจกายภาพ 90%', 'สะท้อน 30% เป็น True Damage', 'บล็อกท่าไม้ตายบอสได้ 1 ครั้ง/การต่อสู้'],
    downside: ['ATK เหลือ 1'],
  },
  PURE_SPEED: {
    id: 'PURE_SPEED',
    stat: 'agi',
    title: 'Pixel Storm',
    titleTh: 'พายุพิกเซลความเร็วแสง',
    passive: 'Phantom Step',
    aura: 'aura_pure_agi',
    upside: ['Evasion 85% (สกิลบอส 50%)', 'ความเร็ว ATB ×2'],
    downside: ['HP Max เหลือ 20%'],
  },
  PURE_MAGE: {
    id: 'PURE_MAGE',
    stat: 'int',
    title: 'Hand of Ruin',
    titleTh: 'หัตถ์แห่งการทำลายล้าง',
    passive: 'Cataclysmic Apocalypse',
    aura: 'aura_pure_int',
    upside: ['ดาเมจเวท +400%', 'ไม่มี Cooldown'],
    downside: ['ใช้ MP ×3', 'DEF = 0', 'Evasion = 0'],
  },
  PURE_STRENGTH: {
    id: 'PURE_STRENGTH',
    stat: 'str',
    title: 'Titan Fist',
    titleTh: 'อสูรกายจอมพลัง',
    passive: 'One-Punch Obliteration',
    aura: 'aura_pure_str',
    upside: ['15% สังหารมอนสเตอร์ทั่วไปใน 1 hit (ไม่มีผลกับบอส)', 'น้ำหนักกระเป๋า +1,000 kg'],
    downside: ['ความเร็ว ATB -50%', 'ใช้ MP ×2'],
  },
  PURE_LUCK: {
    id: 'PURE_LUCK',
    stat: 'luk',
    title: "Dimension's Favorite",
    titleTh: 'ลูกรักพระเจ้าประจำมิติ',
    passive: 'Golden Fortune & Miracle Dodge',
    aura: 'aura_pure_luk',
    upside: ['Rare Drop ×5', '50% รอดตายที่ HP 1 + อมตะ 3 วินาที (1 ครั้ง/การต่อสู้)'],
    downside: [],
  },
  PURE_DEX: {
    id: 'PURE_DEX',
    stat: 'dex',
    title: 'Hawkeye',
    titleTh: 'เนตรเหยี่ยวไร้พลาด',
    passive: 'Perfect Shot',
    aura: 'aura_pure_dex',
    upside: ['Critical 100% เมื่อโจมตีระยะไกล'],
    downside: ['ดาเมจระยะประชิดเหลือ 1'],
  },
};
