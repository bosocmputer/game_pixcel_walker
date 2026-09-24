import type { LandmarkKind } from '../types';

/**
 * Shops (MASTER_SPEC §14B). Map shops sit on landmarks and also buy the players' loot;
 * the shelf at home only sells basics, so selling junk means walking to a shop.
 */
export interface ShopDef {
  id: string;
  nameTh: string;
  /** Shopkeeper shown in the window title (fictional). */
  keeperTh: string;
  /** Landmark kind that hosts this shop on the map (none = home). */
  landmark?: LandmarkKind;
  /** Buys items from players (sell tab). */
  buys: boolean;
  /** Offers the repair service (full price; home is half). */
  repair?: boolean;
  /** Multiplier on what monster junk sells for here (markets pay more). */
  junkBonus?: number;
  /** Item ids for sale, in display order. */
  stock: string[];
}

/** Markets pay 20% more for monster junk. */
export const MARKET_JUNK_BONUS = 1.2;

export const SHOPS: Record<string, ShopDef> = {
  home: {
    id: 'home',
    nameTh: 'ชั้นวางของในบ้าน',
    keeperTh: 'ของใช้จำเป็น',
    buys: false,
    stock: ['red_potion', 'blue_elixir', 'leather_garb', 'training_sword', 'apprentice_staff', 'cloth_bandana', 'lucky_cord', 'farmer_straw_hat'],
  },
  general: {
    id: 'general',
    nameTh: 'ร้านของชำหน้าปากซอย',
    keeperTh: 'ป้าจันทร์',
    landmark: 'CONVENIENCE',
    buys: true,
    stock: ['red_potion', 'blue_elixir', 'whetstone', 'farmer_straw_hat', 'bamboo_spear', 'jasmine_garland', 'light_armor', 'lucky_cord'],
  },
  outfitter: {
    id: 'outfitter',
    nameTh: 'ร้านอุปกรณ์นักผจญภัย',
    keeperTh: 'คุณแก้วตา',
    landmark: 'MALL',
    buys: true,
    stock: ['leather_garb', 'light_armor', 'cloth_bandana', 'iron_helm', 'bronze_helm', 'jasmine_garland', 'runner_charm', 'elephant_amulet'],
  },
  market: {
    id: 'market',
    nameTh: 'ตลาดแลกของมิติ',
    keeperTh: 'แม่ค้าข้าวเหนียว',
    landmark: 'MARKET',
    buys: true,
    junkBonus: MARKET_JUNK_BONUS,
    stock: ['sticky_rice_pork', 'thai_iced_tea', 'red_potion', 'blue_elixir', 'whetstone'],
  },
  smith: {
    id: 'smith',
    nameTh: 'ร้านตีเหล็กข้างปั๊ม',
    keeperTh: 'ลุงหนานคำ',
    landmark: 'FUEL',
    buys: true,
    repair: true,
    stock: ['whetstone', 'master_repair_kit', 'training_sword', 'bamboo_spear', 'lanna_dagger', 'naga_staff', 'moat_guard_sword', 'pixel_broadsword', 'iron_helm', 'bronze_helm'],
  },
};

export function shopForLandmark(kind: LandmarkKind): ShopDef | undefined {
  return Object.values(SHOPS).find((s) => s.landmark === kind);
}
