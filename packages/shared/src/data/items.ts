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
  /** Paperdoll sprite key. */
  sprite: string;
  modifiers: Modifiers;
  effect?: string;
  maxDurability: number;
  price: number;
  /** Character level needed to wear it (default 1). */
  level?: number;
  /** A line or two of item history shown in the bag / shop. */
  lore?: string;
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
  lore?: string;
}

/**
 * Monster drops with no use except selling ("ขยะ"/trophies): the main way new players earn Gold
 * besides the coins monsters carry. `price` is what shops pay for one.
 */
export interface MaterialDef {
  id: string;
  name: string;
  nameTh: string;
  rarity: Rarity;
  price: number;
  source: string;
  lore: string;
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
    price: 150,
    level: 1,
    lore: 'ทอจากฝ้ายดิบริมแม่ปิง หยาบแต่ทน เป็นเสื้อตัวแรกของนักเดินทางแทบทุกคน',
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
    price: 150,
    level: 1,
    lore: 'ดาบไม้ที่สำนักดาบในคูเมืองใช้สอนเด็ก ๆ ตีทีไรเจ็บมือมากกว่าเจ็บศัตรู',
  },
  apprentice_staff: {
    id: 'apprentice_staff',
    name: 'Apprentice Staff',
    nameTh: 'ไม้เท้าฝึกหัด',
    slot: 'weapon',
    rarity: 'COMMON',
    sprite: 'weapon_staff_wood_01',
    modifiers: { flat: { matk: 5 } },
    maxDurability: 50,
    price: 150,
    level: 1,
    lore: 'กิ่งมะขามแห้งที่ศิษย์หมอเวทใช้ฝึกรวมพลัง ปลายยังมีรอยไหม้จากเวทครั้งแรก',
  },
  cloth_bandana: {
    id: 'cloth_bandana',
    name: 'Cloth Bandana',
    nameTh: 'ผ้าโพกหัว',
    slot: 'helmet',
    rarity: 'COMMON',
    sprite: 'head_bandana_01',
    modifiers: { flat: { def: 1 } },
    maxDurability: 40,
    price: 50,
    level: 1,
    lore: 'ผ้าโพกลายจุดของคนส่งของรุ่นเก่า เชื่อกันว่าช่วยให้หาทางกลับบ้านเจอเสมอ',
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
    level: 12,
    lore: 'ดาบกว้างที่ร่วงลงมาจากรอยแยกมิติ คมดาบเป็นขั้นบันไดแบบพิกเซล ฟันอะไรก็ขาด',
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
    level: 20,
    lore: 'ตะบองไส้กรอกยักษ์จากคลังของพญาก็อบลิน แข็งกว่าเหล็กเพราะแช่แข็งมาสามปี',
  },
  starlight_staff: {
    id: 'starlight_staff',
    name: 'Archmage Starlight Staff',
    nameTh: 'คทาละอองดาว',
    slot: 'weapon',
    rarity: 'LEGENDARY',
    sprite: 'weapon_staff_star_01',
    modifiers: { flat: { matk: 150, int: 18 } },
    effect: 'ลดเวลาร่ายเวท 20%',
    maxDurability: 250,
    price: 12000,
    level: 30,
    lore: 'ไม้เท้าที่เก็บแสงดาวคืนลอยกระทงไว้ในคริสตัล จะเปล่งแสงเมื่อผู้ถือตั้งใจจริง',
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
    level: 5,
    lore: 'หมวกเหล็กของทหารยามประตูเมืองสมัยก่อน รอยบุบทุกรอยมีเรื่องเล่า',
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
    level: 22,
    lore: 'เกราะที่ตีจากถังของหุ่นยนต์หัวจ่ายน้ำมันผู้บ้าคลั่ง ยังได้กลิ่นน้ำมันจาง ๆ',
  },
  lucky_cord: {
    id: 'lucky_cord',
    name: 'Lucky Cord Bracelet',
    nameTh: 'สร้อยข้อมือเชือกนำโชค',
    slot: 'accessory',
    rarity: 'COMMON',
    sprite: 'acc_cord_01',
    modifiers: { flat: { luk: 1 } },
    maxDurability: 40,
    price: 50,
    level: 1,
    lore: 'สายสิญจน์แดงผูกลูกปัดทอง คุณยายผูกข้อมือให้ก่อนออกเดินทาง',
  },
  runner_charm: {
    id: 'runner_charm',
    name: 'Runner Charm',
    nameTh: 'เครื่องรางนักวิ่ง',
    slot: 'accessory',
    rarity: 'UNCOMMON',
    sprite: 'acc_runner_01',
    modifiers: { flat: { agi: 8 }, pct: { moveSpeed: 0.1 } },
    maxDurability: 100,
    price: 400,
    level: 6,
    lore: 'เครื่องรางรูปรองเท้ามีปีกของนักวิ่งส่งสารที่ไม่เคยมาสายสักครั้ง',
  },
  aegis_pendant: {
    id: 'aegis_pendant',
    name: 'Aegis Pendant',
    nameTh: 'จี้อีจีส',
    slot: 'accessory',
    rarity: 'EPIC',
    sprite: 'acc_aegis_01',
    modifiers: { flat: { def: 40, vit: 6 } },
    maxDurability: 150,
    price: 3000,
    level: 20,
    lore: 'จี้โล่สีครามของผู้พิทักษ์ประตูวัด มอบให้ผู้ผ่านบททดสอบด้วยใจบริสุทธิ์',
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
    level: 30,
    lore: 'แหวนหยกเขียวที่ใครสวมมักเจอของตกระหว่างทาง ไม่มีใครรู้ว่ามาจากไหน',
  },
  // --- Shop line-up (2026-09-23): one or two per slot for each stage of the early game ---
  bamboo_spear: {
    id: 'bamboo_spear',
    name: 'Bamboo Spear',
    nameTh: 'หอกไม้ไผ่',
    slot: 'weapon',
    rarity: 'COMMON',
    sprite: 'weapon_spear_bamboo_01',
    modifiers: { flat: { atk: 7, dex: 2 } },
    maxDurability: 60,
    price: 220,
    level: 3,
    lore: 'ลำไผ่รวกเหลาปลายแหลม ชาวนาใช้ไล่ฝูงหนูนาในหน้าเกี่ยว เบาและยาวจนศัตรูเข้าไม่ถึงตัว',
  },
  lanna_dagger: {
    id: 'lanna_dagger',
    name: 'Lanna Charm Knife',
    nameTh: 'มีดหมอล้านนา',
    slot: 'weapon',
    rarity: 'UNCOMMON',
    sprite: 'weapon_dagger_lanna_01',
    modifiers: { flat: { atk: 20, agi: 4, crit: 0.03 } },
    maxDurability: 80,
    price: 650,
    level: 8,
    lore: 'มีดหมอด้ามเขาควายของหมอพื้นบ้านเมืองเหนือ ใบมีดสลักอักขระธรรมล้านนา เชื่อกันว่าฟันผีได้',
  },
  naga_staff: {
    id: 'naga_staff',
    name: 'Naga River Staff',
    nameTh: 'ไม้เท้านาคาแม่ปิง',
    slot: 'weapon',
    rarity: 'RARE',
    sprite: 'weapon_staff_naga_01',
    modifiers: { flat: { matk: 55, int: 6, mdef: 8 } },
    maxDurability: 120,
    price: 1600,
    level: 14,
    lore: 'ไม้เท้าหัวนาคจากท่าน้ำริมแม่ปิง นาคผู้เฝ้าสายน้ำเลือกผู้ถือเอง และจะส่งเสียงขู่เมื่อมีภัยใกล้ตัว',
  },
  moat_guard_sword: {
    id: 'moat_guard_sword',
    name: 'Corner Bastion Sword',
    nameTh: 'ดาบยามแจ่งเมือง',
    slot: 'weapon',
    rarity: 'RARE',
    sprite: 'weapon_sword_guard_01',
    modifiers: { flat: { atk: 58, str: 4, def: 6 } },
    maxDurability: 140,
    price: 2200,
    level: 18,
    lore: 'ดาบของทหารยามประจำแจ่งมุมกำแพงเมือง ส่งต่อกันมาหลายรุ่น ด้ามถูกพันเชือกใหม่ทุกครั้งที่เปลี่ยนมือ',
  },
  indigo_farmer_shirt: {
    id: 'indigo_farmer_shirt',
    name: 'Indigo Farmer Shirt',
    nameTh: 'เสื้อม่อฮ่อม',
    slot: 'chest',
    rarity: 'UNCOMMON',
    sprite: 'chest_mohom_01',
    modifiers: { flat: { def: 8, maxHp: 40, agi: 2 } },
    maxDurability: 80,
    price: 420,
    level: 5,
    lore: 'เสื้อย้อมครามแบบคนเหนือ ยิ่งซักยิ่งนุ่ม ใส่ทำนาทั้งวันก็ไม่ร้อน ผ้าคาดเอวแดงผูกไว้กันหลงทาง',
  },
  rattan_armor: {
    id: 'rattan_armor',
    name: 'Woven Rattan Armor',
    nameTh: 'เกราะหวายสาน',
    slot: 'chest',
    rarity: 'RARE',
    sprite: 'chest_rattan_01',
    modifiers: { flat: { def: 26, vit: 4, maxHp: 60 } },
    maxDurability: 150,
    price: 1400,
    level: 12,
    lore: 'เกราะหวายสานแน่นหลายชั้นแบบทหารเมืองโบราณ เบากว่าเหล็กครึ่งหนึ่งแต่รับคมดาบได้ดีไม่แพ้กัน',
  },
  farmer_straw_hat: {
    id: 'farmer_straw_hat',
    name: 'Palm-leaf Farmer Hat',
    nameTh: 'งอบใบลาน',
    slot: 'helmet',
    rarity: 'COMMON',
    sprite: 'head_ngob_01',
    modifiers: { flat: { def: 3, maxHp: 20 } },
    maxDurability: 50,
    price: 120,
    level: 2,
    lore: 'งอบสานมือกันแดดกันฝน ชาวนาบอกว่าใส่แล้วใจเย็นลงเยอะ ศัตรูก็เลยดูน่ากลัวน้อยลง',
  },
  bronze_helm: {
    id: 'bronze_helm',
    name: 'Old Wall Bronze Helm',
    nameTh: 'หมวกสำริดกำแพงเก่า',
    slot: 'helmet',
    rarity: 'RARE',
    sprite: 'helm_bronze_01',
    modifiers: { flat: { def: 20, mdef: 8 } },
    maxDurability: 140,
    price: 1500,
    level: 15,
    lore: 'ขุดพบใต้แนวกำแพงเมืองเก่า ขัดใหม่จนเงาวับ ยังเห็นรอยดาบจากศึกเมื่อหลายร้อยปีก่อน',
  },
  jasmine_garland: {
    id: 'jasmine_garland',
    name: 'Everlasting Jasmine Garland',
    nameTh: 'พวงมาลัยมะลิไม่รู้โรย',
    slot: 'accessory',
    rarity: 'UNCOMMON',
    sprite: 'acc_jasmine_01',
    modifiers: { flat: { maxMp: 40, int: 3 }, pct: { healPower: 0.05 } },
    maxDurability: 60,
    price: 350,
    level: 4,
    lore: 'มะลิที่ร้อยด้วยด้ายสายสิญจน์ไม่มีวันเหี่ยว กลิ่นหอมทำให้ใจสงบ ร่ายเวทและรักษาได้คล่องขึ้น',
  },
  elephant_amulet: {
    id: 'elephant_amulet',
    name: 'Stone Elephant Amulet',
    nameTh: 'เครื่องรางช้างศิลา',
    slot: 'accessory',
    rarity: 'EPIC',
    sprite: 'acc_elephant_01',
    modifiers: { flat: { vit: 8, def: 16, maxHp: 120 } },
    maxDurability: 200,
    price: 4200,
    level: 20,
    lore: 'แกะจากเศษหินของช้างศิลาโบราณบนดอย พกติดตัวแล้วมั่นคงเหมือนมีช้างยืนคุ้มกันอยู่ข้างหลัง',
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
    lore: 'ยาแดงสูตรพิกเซล หวานอมเปรี้ยว ดื่มแล้วแผลปิดเร็วจนน่าตกใจ',
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
    lore: 'น้ำยาสีครามกลั่นจากดอกอัญชัน ช่วยให้สมองแล่นและเวทมนตร์ไหลคล่อง',
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
    lore: 'หินลับมีดเนื้อละเอียดจากลำห้วยบนดอย ลับไม่กี่ทีคมกลับมาเหมือนใหม่',
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
    lore: 'กล่องเครื่องมือครบชุดของช่างใหญ่ประจำปั๊ม ซ่อมได้แม้ของที่พังยับ',
  },
};

export const MATERIALS: Record<string, MaterialDef> = {
  slime_goo: { id: 'slime_goo', name: 'Slime Goo', nameTh: 'เมือกสไลม์', rarity: 'COMMON', price: 3, source: 'สไลม์พิกเซล', lore: 'เมือกใสเหนียวหนึบ ร้านของชำรับซื้อไปทำกาวติดป้าย' },
  pigeon_feather: { id: 'pigeon_feather', name: 'Pigeon Feather', nameTh: 'ขนนกพิราบ', rarity: 'COMMON', price: 3, source: 'นกพิราบลานวัด', lore: 'ขนสีเทาเงางาม เอาไปทำขนไก่ปัดฝุ่นได้ดี' },
  rat_tail: { id: 'rat_tail', name: 'Alley Rat Tail', nameTh: 'หางหนูซอย', rarity: 'COMMON', price: 4, source: 'หนูซอย', lore: 'หางยาวเกินหนูทั่วไป หมอยาบางคนเชื่อว่าเป็นยาชูกำลัง' },
  cat_fur: { id: 'cat_fur', name: 'Black Fur Ball', nameTh: 'ก้อนขนแมวดำ', rarity: 'COMMON', price: 5, source: 'แมวดำหลังคา', lore: 'ขนแมวดำนุ่มเหมือนกำมะหยี่ พอปั้นเป็นก้อนแล้วดูเหมือนพกแมวติดตัว' },
  ant_mandible: { id: 'ant_mandible', name: 'Red Ant Mandible', nameTh: 'กรามมดแดง', rarity: 'COMMON', price: 6, source: 'มดแดงทหาร', lore: 'กรามแข็งเหมือนคีมเล็ก ช่างเครื่องประดับชอบเอาไปทำตะขอ' },
  old_collar: { id: 'old_collar', name: 'Rusty Old Collar', nameTh: 'ปลอกคอเก่าขึ้นสนิม', rarity: 'COMMON', price: 8, source: 'วิญญาณหมาซอย', lore: 'ปลอกคอที่ยังมีกระดิ่งเล็ก ๆ ห้อยอยู่ ได้ยินเสียงกรุ๊งกริ๊งตอนกลางคืน' },
  straw_bundle: { id: 'straw_bundle', name: 'Straw Bundle', nameTh: 'ฟางแห้งมัดเชือก', rarity: 'COMMON', price: 8, source: 'หุ่นไล่กาขี้โมโห', lore: 'ฟางจากตัวหุ่นไล่กา ยังบ่นพึมพำอยู่ถ้าฟังใกล้ ๆ' },
  fish_scale: { id: 'fish_scale', name: 'Golden Carp Scale', nameTh: 'เกล็ดปลาคาร์ปทอง', rarity: 'COMMON', price: 10, source: 'ปลาคาร์ปคูเมือง', lore: 'เกล็ดสีทองสะท้อนแดด คนเชื่อว่าเก็บไว้ในกระเป๋าเงินแล้วเงินจะไม่หมด' },
  gecko_tail: { id: 'gecko_tail', name: 'Tokay Tail', nameTh: 'หางตุ๊กแก', rarity: 'COMMON', price: 12, source: 'ตุ๊กแกยักษ์', lore: 'หางที่หลุดแล้วยังกระดิกได้อีกพักหนึ่ง เป็นที่ต้องการของหมอยาจีน' },
  glow_leaf: { id: 'glow_leaf', name: 'Glowing Leaf', nameTh: 'ใบไม้เรืองแสง', rarity: 'COMMON', price: 14, source: 'ภูตใบไม้ · ลูกไม้อสูร', lore: 'ใบไม้ที่เรืองแสงสีเขียวอ่อนตอนกลางคืน ใช้แทนตะเกียงได้ทั้งคืน' },
  firefly_dust: { id: 'firefly_dust', name: 'Firefly Dust', nameTh: 'ผงแสงหิ่งห้อย', rarity: 'COMMON', price: 18, source: 'หิ่งห้อยพราย · โคมลอยวิญญาณ', lore: 'ผงระยิบระยับในขวดเล็ก ร้านขายของที่ระลึกเอาไปผสมสีทาโคม' },
  rusty_bolt: { id: 'rusty_bolt', name: 'Rusty Bolt', nameTh: 'น็อตขึ้นสนิม', rarity: 'COMMON', price: 16, source: 'สามล้อผีสิง · รถแดงปีศาจ · หุ่นโชว์', lore: 'น็อตตัวโตจากยานพาหนะที่ถูกสิง ร้านรับซื้อของเก่ารับหมด' },
  crab_shell: { id: 'crab_shell', name: 'Armored Crab Shell', nameTh: 'กระดองปูหุ้มเกราะ', rarity: 'UNCOMMON', price: 24, source: 'ปูนาหุ้มเกราะ', lore: 'กระดองหนาเหมือนโล่เล็ก ช่างตีเหล็กบดผสมทำเคลือบเกราะ' },
  bat_wing: { id: 'bat_wing', name: 'Neon Bat Wing', nameTh: 'ปีกค้างคาวนีออน', rarity: 'UNCOMMON', price: 30, source: 'ค้างคาวนีออน', lore: 'เยื่อปีกเรืองแสงสีชมพูฟ้าเหมือนป้ายไฟยามค่ำ' },
  python_skin: { id: 'python_skin', name: 'Python Shed Skin', nameTh: 'คราบงูเหลือม', rarity: 'UNCOMMON', price: 40, source: 'งูเหลือมคูเมือง', lore: 'คราบยาวเป็นวา ลายสวยจนช่างเครื่องหนังแย่งกันซื้อ' },
  ember_scale: { id: 'ember_scale', name: 'Ember Scale', nameTh: 'เกล็ดถ่านแดง', rarity: 'UNCOMMON', price: 48, source: 'กิ้งก่าถ่านแดง', lore: 'เกล็ดที่ยังอุ่นอยู่ตลอดเวลา แม่ค้าข้าวเหนียวเอาไปอุ่นกระติ๊บ' },
  spirit_wisp: { id: 'spirit_wisp', name: 'Spirit Wisp', nameTh: 'เศษวิญญาณ', rarity: 'UNCOMMON', price: 55, source: 'กระสือ · วิญญาณหมอกดอย', lore: 'แสงวาบเย็นเฉียบที่จับใส่ขวดได้ ร้านรับซื้อแล้วส่งต่อให้วัดทำพิธีปล่อย' },
  stone_chip: { id: 'stone_chip', name: 'Ancient Stone Chip', nameTh: 'เศษหินศิลาโบราณ', rarity: 'RARE', price: 80, source: 'ช้างหินโบราณ', lore: 'เศษหินที่มีลายแกะสลักเก่าแก่ นักสะสมของโบราณให้ราคาดี' },
  goblin_crown_shard: { id: 'goblin_crown_shard', name: 'Goblin Crown Shard', nameTh: 'เศษมงกุฎก็อบลิน', rarity: 'RARE', price: 250, source: 'พญาก็อบลิน (บอส)', lore: 'ชิ้นส่วนมงกุฎที่ทำจากฝาขวดน้ำอัดลมหลอมรวมกัน ดูไร้ค่าแต่นักสะสมตามหา' },
  gold_price_tag: { id: 'gold_price_tag', name: 'Golden Price Tag', nameTh: 'ป้ายลดราคาทองคำ', rarity: 'RARE', price: 300, source: 'ราชินีลดกระหน่ำ (บอส)', lore: 'ป้ายราคาชุบทองจากตัวราชินี เขียนว่า "ลด 99%" แต่ขายได้ราคาเต็ม' },
  octane_core: { id: 'octane_core', name: 'Octane Core', nameTh: 'แกนหัวจ่ายน้ำมัน', rarity: 'RARE', price: 400, source: 'หุ่นยนต์หัวจ่ายน้ำมัน (บอส)', lore: 'แกนพลังงานที่ยังส่งเสียงหึ่ง ๆ ช่างตีเหล็กให้ราคาสูงมาก' },
  guardian_gold_leaf: { id: 'guardian_gold_leaf', name: 'Guardian Gold Leaf', nameTh: 'เปลวทองผู้พิทักษ์', rarity: 'RARE', price: 500, source: 'ยักษ์ทวารบาล (บอส)', lore: 'เปลวทองที่หลุดจากกระบองของยักษ์หลังยอมรับในฝีมือผู้ท้าทาย' },
  ancient_bark: { id: 'ancient_bark', name: 'Thousand-year Bark', nameTh: 'เปลือกไม้พันปี', rarity: 'EPIC', price: 600, source: 'พฤกษาอสูร (บอส)', lore: 'เปลือกไม้หอมที่มีวงปีนับไม่ถ้วน ร้านยาสมุนไพรยอมจ่ายแพงเพื่อได้สักชิ้น' },
};

/**
 * Character creator starter gear (MASTER_SPEC §5): every player gets STARTER_BUDGET Gold and picks
 * what to wear from these lists; whatever they skip stays in their pocket as Gold. Prices are the
 * same as in the home shop, so skipping an item now and buying it later costs the same.
 */
export const STARTER_BUDGET = 500;
export const STARTER_GEAR: { slot: EquipSlot; items: string[] }[] = [
  { slot: 'helmet', items: ['cloth_bandana'] },
  { slot: 'chest', items: ['cotton_shirt'] },
  { slot: 'weapon', items: ['training_sword', 'apprentice_staff'] },
  { slot: 'accessory', items: ['lucky_cord'] },
];
/**
 * Items removed when the slots were cut to four (2026-09-23). Old saves: id → replacement id,
 * or null = refunded as Gold at the old shop price.
 */
export const LEGACY_ITEMS: Record<string, { to: string | null; refund: number }> = {
  runner_sneakers: { to: 'runner_charm', refund: 0 },
  aegis_shield: { to: 'aegis_pendant', refund: 0 },
  straw_sandals: { to: null, refund: 50 },
};

/** Optional potion pack bought with the starter budget. */
export const STARTER_POTIONS = { itemId: 'red_potion', count: 5 } as const;
