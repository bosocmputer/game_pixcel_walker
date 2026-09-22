import type { EquipSlot, Modifiers, Rarity } from '../types';

export const RARITY_BONUS_SLOTS: Record<Rarity, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: '#FFFFFF',
  UNCOMMON: '#4CAF50',
  RARE: '#29B6F6',
  EPIC: '#AB47BC',
  LEGENDARY: '#FFA726',
};

export interface EquipmentDef {
  id: string;
  name: string;
  nameTh: string;
  slot: EquipSlot;
  rarity: Rarity;
  twoHanded?: boolean;
  /** Paperdoll sprite key. */
  sprite: string;
  modifiers: Modifiers;
  effect?: string;
  maxDurability: number;
  price: number;
}

export interface ConsumableDef {
  id: string;
  name: string;
  nameTh: string;
  kind: 'HEAL_HP' | 'HEAL_MP' | 'REPAIR';
  amount: number;
  cooldown: number;
  price: number;
  source: string;
}

export const EQUIPMENT: Record<string, EquipmentDef> = {
  cotton_shirt: {
    id: 'cotton_shirt',
    name: 'Raw Cotton Shirt',
    nameTh: 'เสื้อผ้าฝ้ายดิบ',
    slot: 'chest',
    rarity: 'COMMON',
    sprite: 'chest_cotton_01',
    modifiers: { flat: { def: 2 } },
    maxDurability: 50,
    price: 20,
  },
  training_sword: {
    id: 'training_sword',
    name: 'Wooden Training Sword',
    nameTh: 'ดาบไม้ฝึกซ้อม',
    slot: 'weapon',
    rarity: 'COMMON',
    sprite: 'weapon_wood_01',
    modifiers: { flat: { atk: 3 } },
    maxDurability: 50,
    price: 20,
  },
  pixel_broadsword: {
    id: 'pixel_broadsword',
    name: 'Pixel Broadsword',
    nameTh: 'ดาบพิกเซลโบราณ',
    slot: 'weapon',
    rarity: 'RARE',
    sprite: 'weapon_broadsword_01',
    modifiers: { flat: { atk: 45, str: 5 } },
    effect: 'โจมตีมีโอกาส 5% ทำให้ศัตรูเลือดไหล',
    maxDurability: 120,
    price: 900,
  },
  convenience_club: {
    id: 'convenience_club',
    name: 'Convenience Club',
    nameTh: 'กระบองโบโลน่า',
    slot: 'weapon',
    rarity: 'EPIC',
    sprite: 'weapon_club_01',
    modifiers: { flat: { atk: 80, maxHp: 200 } },
    effect: 'ดูดเลือด 3% จากดาเมจ',
    maxDurability: 160,
    price: 2500,
  },
  starlight_staff: {
    id: 'starlight_staff',
    name: 'Archmage Starlight Staff',
    nameTh: 'คทาละอองดาว',
    slot: 'weapon',
    rarity: 'LEGENDARY',
    twoHanded: true,
    sprite: 'weapon_staff_star_01',
    modifiers: { flat: { matk: 150, int: 18 } },
    effect: 'ลดเวลาร่ายเวท 20%',
    maxDurability: 250,
    price: 12000,
  },
  aegis_shield: {
    id: 'aegis_shield',
    name: 'Aegis Shield',
    nameTh: 'โล่อีจีส',
    slot: 'offhand',
    rarity: 'EPIC',
    sprite: 'shield_aegis_99',
    modifiers: { flat: { def: 40, vit: 6 } },
    maxDurability: 180,
    price: 3000,
  },
  iron_helm: {
    id: 'iron_helm',
    name: 'Iron Helm',
    nameTh: 'หมวกเหล็ก',
    slot: 'helmet',
    rarity: 'UNCOMMON',
    sprite: 'helm_iron_02',
    modifiers: { flat: { def: 12 } },
    maxDurability: 100,
    price: 300,
  },
  fuel_plate: {
    id: 'fuel_plate',
    name: 'Gas Station Fuel Plate',
    nameTh: 'เกราะหัวจ่ายน้ำมัน',
    slot: 'chest',
    rarity: 'EPIC',
    sprite: 'plate_fuel_01',
    modifiers: { flat: { def: 65, vit: 12 } },
    effect: 'เมื่อถูกโจมตี มีโอกาสระเบิดไฟใส่ศัตรูรอบตัว',
    maxDurability: 200,
    price: 3500,
  },
  runner_sneakers: {
    id: 'runner_sneakers',
    name: 'Runner Speed Sneakers',
    nameTh: 'รองเท้าวิ่งพิกเซล',
    slot: 'boots',
    rarity: 'UNCOMMON',
    sprite: 'boots_runner_01',
    modifiers: { flat: { agi: 8 }, pct: { moveSpeed: 0.1 } },
    effect: 'ลดการเสีย Durability ขณะเดิน',
    maxDurability: 100,
    price: 400,
  },
  golden_luck_ring: {
    id: 'golden_luck_ring',
    name: 'Ring of Golden Luck',
    nameTh: 'แหวนทองโชคลาภ',
    slot: 'accessory',
    rarity: 'LEGENDARY',
    sprite: 'ring_gold_01',
    modifiers: { flat: { luk: 25 }, pct: { dropRate: 0.3 } },
    effect: 'สุ่มได้คูปองไอเทมพิเศษเมื่อเดินครบ 10,000 ก้าว',
    maxDurability: 300,
    price: 12000,
  },
};

export const CONSUMABLES: Record<string, ConsumableDef> = {
  red_potion: {
    id: 'red_potion',
    name: 'Red Pixel Potion',
    nameTh: 'ยา HP',
    kind: 'HEAL_HP',
    amount: 200,
    cooldown: 3,
    price: 10,
    source: 'ร้านค้า',
  },
  blue_elixir: {
    id: 'blue_elixir',
    name: 'Blue Mana Elixir',
    nameTh: 'ยา MP',
    kind: 'HEAL_MP',
    amount: 150,
    cooldown: 5,
    price: 15,
    source: 'ร้านค้า',
  },
  whetstone: {
    id: 'whetstone',
    name: 'Whetstone',
    nameTh: 'หินลับมีด',
    kind: 'REPAIR',
    amount: 0.25,
    cooldown: 0,
    price: 40,
    source: 'คราฟต์จากเศษแร่ปั๊มน้ำมัน',
  },
  master_repair_kit: {
    id: 'master_repair_kit',
    name: 'Master Repair Kit',
    nameTh: 'กล่องเครื่องมือช่าง',
    kind: 'REPAIR',
    amount: 1,
    cooldown: 0,
    price: 250,
    source: 'ร้านตีเหล็ก (ปั๊มน้ำมัน)',
  },
};

export const STARTER_KITS = {
  STANDARD: {
    equipment: ['cotton_shirt', 'training_sword'],
    consumables: { red_potion: 5 },
    gold: 50,
  },
  NAKED: {
    equipment: [] as string[],
    consumables: {},
    gold: 500,
  },
} as const;
