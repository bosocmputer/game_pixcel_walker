export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export type ClassId = 'NOVICE' | 'KNIGHT' | 'SORCERER' | 'ASSASSIN' | 'CLERIC' | 'RANGER';

export type MutationId =
  | 'PURE_TANK'
  | 'PURE_SPEED'
  | 'PURE_MAGE'
  | 'PURE_STRENGTH'
  | 'PURE_LUCK'
  | 'PURE_DEX';

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

/** Wearable slots (MASTER_SPEC §5): outfit, head, accessory, weapon. Outfits include their footwear. */
export type EquipSlot = 'chest' | 'helmet' | 'accessory' | 'weapon';
/** How a weapon attacks in battle (presentation: swing, reach, impact). */
export type WeaponType = 'SWORD' | 'DAGGER' | 'SPEAR' | 'CLUB' | 'STAFF';
export const EQUIP_SLOTS: EquipSlot[] = ['chest', 'helmet', 'accessory', 'weapon'];

/** Additive and multiplicative modifiers applied on top of base derived stats. */
export interface Modifiers {
  flat?: Partial<DerivedStats & Stats>;
  /** Multipliers, e.g. { def: 0.25 } means DEF +25%. */
  pct?: Partial<Record<keyof DerivedStats, number>>;
}

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  /** 0..1 */
  crit: number;
  /** 0..1 */
  evasion: number;
  /** ATB gauge fill per second (gauge full at 100). */
  speed: number;
  /** Multiplier on map/walking related bonuses. */
  moveSpeed: number;
  /** Multiplier on healing done. */
  healPower: number;
  /** Multiplier on drop chance. */
  dropRate: number;
  /** kg */
  carryWeight: number;
}

export type Element = 'NEUTRAL' | 'FIRE' | 'WATER' | 'LIGHTNING' | 'EARTH' | 'HOLY' | 'SHADOW';

/**
 * Map places that matter to the game (docs/STORY.md §4). Gates (with a boss): CONVENIENCE, MALL, FUEL,
 * STATION, TEMPLE (guardian trial), MUSEUM, PARK. Services: HOSPITAL, MARKET, SANCTUARY (other faiths).
 */
export type LandmarkKind =
  | 'CONVENIENCE'
  | 'MALL'
  | 'FUEL'
  | 'STATION'
  | 'TEMPLE'
  | 'MUSEUM'
  | 'PARK'
  | 'HOSPITAL'
  | 'MARKET'
  | 'SANCTUARY'
  | 'CITY';
