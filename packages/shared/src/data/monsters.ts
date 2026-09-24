import type { Element, LandmarkKind } from '../types';
import type { CombatStats, Row, StatusId } from '../combat/types';

/** Terrain the encounter table uses, derived from the 8-bit map tile under the player. */
export type Terrain = 'ROAD' | 'URBAN' | 'GREEN' | 'WATER';

export interface DropEntry {
  itemId: string;
  chance: number;
  qty?: [number, number];
}

export interface MonsterDef {
  id: string;
  name: string;
  nameTh: string;
  level: number;
  element: Element;
  hp: number;
  mp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  speed: number;
  evasion: number;
  exp: number;
  gold: [number, number];
  drops: DropEntry[];
  sprite: string;
  boss?: BossInfo;
  terrain?: Terrain[];
  /** Skill deck rolled in combat (basic attack is the fallback). */
  deck?: string[];
  /** Formation row (default FRONT). */
  row?: Row;
  /** Never acts (training dummies). */
  passive?: boolean;
}

export interface BossSkill {
  id: string;
  name: string;
  nameTh: string;
  /** Deterministic ultimate: used on every Nth turn of the boss (unavoidable). */
  everyTurns: number;
  damageScale: number;
  aoe: boolean;
  status?: { status: StatusId; turns: number; potency?: number };
  summons?: { monsterId: string; count: number };
  /** Counts as an ultimate for Pure Tank's block. */
  ultimate?: boolean;
}

export interface BossInfo {
  landmark: LandmarkKind;
  respawnMinutes: number;
  /** Fixed daily spawn time (HH:MM, Asia/Bangkok) instead of a respawn timer. */
  dailyAt?: string;
  /** Async World Boss: shared HP that persists across visitors. */
  worldBoss?: { durationHours: number };
  recommendedParty: [number, number];
  skills: BossSkill[];
  /** HP-threshold phase shifts (applied once each, highest threshold first). */
  phases?: BossPhase[];
  /** After this many rounds the boss enrages: 100% crit, ×10 ATK (anti-stall). */
  enrageRound?: number;
  /** Waves of minions before the boss when fought as a landmark dungeon. */
  dungeonWaves?: string[][];
}

export interface BossPhase {
  hpBelow: number;
  message: string;
  statMult?: Partial<Record<keyof CombatStats, number>>;
  rateBonus?: number;
  addDeck?: string[];
  /** Ultimate cadence after the shift (e.g. 4 → 3). */
  everyTurns?: number;
}

export const MONSTERS: Record<string, MonsterDef> = {
  // --- Common field monsters (Lv 1-32) ---
  // `deck` lists signature skills in unlock order; monsterSkillSlots(level) decides how many are used.
  pixel_slime: {
    id: 'pixel_slime', name: 'Pixel Slime', nameTh: 'สไลม์พิกเซล', level: 1, element: 'WATER',
    hp: 40, mp: 0, atk: 6, matk: 0, def: 2, mdef: 2, speed: 18, evasion: 0.02,
    exp: 12, gold: [1, 4], drops: [{ itemId: 'slime_goo', chance: 0.7, qty: [1, 2] }, { itemId: 'red_potion', chance: 0.1 }],
    sprite: 'mob_slime', terrain: ['ROAD', 'URBAN', 'GREEN', 'WATER'], deck: ['slime_bounce'],
  },
  street_pigeon: {
    id: 'street_pigeon', name: 'Street Pigeon', nameTh: 'นกพิราบลานวัด', level: 2, element: 'NEUTRAL',
    hp: 50, mp: 0, atk: 8, matk: 0, def: 2, mdef: 2, speed: 34, evasion: 0.1,
    exp: 16, gold: [2, 5], drops: [{ itemId: 'pigeon_feather', chance: 0.7, qty: [1, 2] }, { itemId: 'red_potion', chance: 0.08 }],
    sprite: 'mob_pigeon', terrain: ['ROAD', 'URBAN'], deck: ['pigeon_peck'], row: 'BACK',
  },
  alley_rat: {
    id: 'alley_rat', name: 'Alley Rat', nameTh: 'หนูซอย', level: 3, element: 'NEUTRAL',
    hp: 70, mp: 0, atk: 11, matk: 0, def: 4, mdef: 2, speed: 28, evasion: 0.08,
    exp: 25, gold: [3, 8], drops: [{ itemId: 'rat_tail', chance: 0.65, qty: [1, 1] }, { itemId: 'red_potion', chance: 0.12 }],
    sprite: 'mob_rat', terrain: ['ROAD', 'URBAN'], deck: ['rat_nibble', 'monster_counter'],
  },
  roof_cat: {
    id: 'roof_cat', name: 'Roof Cat', nameTh: 'แมวดำหลังคา', level: 4, element: 'SHADOW',
    hp: 90, mp: 0, atk: 14, matk: 0, def: 5, mdef: 4, speed: 36, evasion: 0.14,
    exp: 34, gold: [4, 10], drops: [{ itemId: 'cat_fur', chance: 0.6, qty: [1, 2] }, { itemId: 'lucky_cord', chance: 0.02 }],
    sprite: 'mob_cat', terrain: ['URBAN'], deck: ['cat_pounce', 'monster_counter'],
  },
  red_ant_soldier: {
    id: 'red_ant_soldier', name: 'Red Ant Soldier', nameTh: 'มดแดงทหาร', level: 5, element: 'EARTH',
    hp: 120, mp: 0, atk: 16, matk: 0, def: 9, mdef: 4, speed: 26, evasion: 0.04,
    exp: 45, gold: [5, 12], drops: [{ itemId: 'ant_mandible', chance: 0.6, qty: [1, 2] }, { itemId: 'red_potion', chance: 0.12 }],
    sprite: 'mob_ant', terrain: ['GREEN'], deck: ['ant_bite', 'monster_counter'],
  },
  soi_dog_spirit: {
    id: 'soi_dog_spirit', name: 'Soi Dog Spirit', nameTh: 'วิญญาณหมาซอย', level: 6, element: 'SHADOW',
    hp: 160, mp: 0, atk: 22, matk: 0, def: 10, mdef: 6, speed: 30, evasion: 0.1,
    exp: 60, gold: [8, 18], drops: [{ itemId: 'old_collar', chance: 0.55, qty: [1, 1] }, { itemId: 'iron_helm', chance: 0.02 }],
    sprite: 'mob_dog', terrain: ['ROAD', 'URBAN'], deck: ['shadow_bite', 'monster_counter'],
  },
  grumpy_scarecrow: {
    id: 'grumpy_scarecrow', name: 'Grumpy Scarecrow', nameTh: 'หุ่นไล่กาขี้โมโห', level: 7, element: 'SHADOW',
    hp: 170, mp: 40, atk: 16, matk: 26, def: 10, mdef: 16, speed: 20, evasion: 0.02,
    exp: 70, gold: [7, 16], drops: [{ itemId: 'straw_bundle', chance: 0.6, qty: [1, 2] }, { itemId: 'cloth_bandana', chance: 0.03 }],
    sprite: 'mob_scarecrow', terrain: ['GREEN'], deck: ['scarecrow_hex', 'monster_guard'], row: 'BACK',
  },
  moat_carp: {
    id: 'moat_carp', name: 'Moat Carp', nameTh: 'ปลาคาร์ปคูเมือง', level: 8, element: 'WATER',
    hp: 220, mp: 30, atk: 20, matk: 28, def: 14, mdef: 16, speed: 22, evasion: 0.05,
    exp: 85, gold: [10, 25], drops: [{ itemId: 'fish_scale', chance: 0.6, qty: [1, 2] }, { itemId: 'blue_elixir', chance: 0.15 }],
    sprite: 'mob_carp', terrain: ['WATER'], deck: ['water_splash', 'slime_bounce'], row: 'BACK',
  },
  tokay_gecko: {
    id: 'tokay_gecko', name: 'Tokay Gecko', nameTh: 'ตุ๊กแกยักษ์', level: 9, element: 'NEUTRAL',
    hp: 240, mp: 0, atk: 26, matk: 0, def: 16, mdef: 10, speed: 30, evasion: 0.1,
    exp: 100, gold: [10, 24], drops: [{ itemId: 'gecko_tail', chance: 0.55, qty: [1, 1] }, { itemId: 'red_potion', chance: 0.15 }],
    sprite: 'mob_gecko', terrain: ['URBAN'], deck: ['gecko_call', 'rat_nibble'],
  },
  leaf_sprite: {
    id: 'leaf_sprite', name: 'Leaf Sprite', nameTh: 'ภูตใบไม้', level: 10, element: 'EARTH',
    hp: 300, mp: 50, atk: 26, matk: 40, def: 18, mdef: 22, speed: 26, evasion: 0.12,
    exp: 120, gold: [14, 30], drops: [{ itemId: 'glow_leaf', chance: 0.6, qty: [1, 2] }, { itemId: 'runner_charm', chance: 0.02 }],
    sprite: 'mob_leaf', terrain: ['GREEN'], deck: ['leaf_whirl', 'monster_counter'], row: 'BACK',
  },
  firefly_wisp: {
    id: 'firefly_wisp', name: 'Firefly Wisp', nameTh: 'หิ่งห้อยพราย', level: 12, element: 'LIGHTNING',
    hp: 320, mp: 80, atk: 20, matk: 52, def: 16, mdef: 30, speed: 38, evasion: 0.2,
    exp: 160, gold: [14, 32], drops: [{ itemId: 'firefly_dust', chance: 0.6, qty: [1, 2] }, { itemId: 'blue_elixir', chance: 0.18 }],
    sprite: 'mob_firefly', terrain: ['GREEN', 'WATER'], deck: ['firefly_flash', 'monster_guard'], row: 'BACK',
  },
  tuktuk_phantom: {
    id: 'tuktuk_phantom', name: 'Tuk-tuk Phantom', nameTh: 'สามล้อผีสิง', level: 12, element: 'NEUTRAL',
    hp: 420, mp: 0, atk: 40, matk: 0, def: 28, mdef: 12, speed: 32, evasion: 0.05,
    exp: 170, gold: [16, 36], drops: [{ itemId: 'rusty_bolt', chance: 0.6, qty: [1, 2] }, { itemId: 'whetstone', chance: 0.12 }],
    sprite: 'mob_tuktuk', terrain: ['ROAD'], deck: ['tuktuk_ram', 'monster_counter'],
  },
  songthaew_mimic: {
    id: 'songthaew_mimic', name: 'Songthaew Mimic', nameTh: 'รถแดงปีศาจ', level: 14, element: 'NEUTRAL',
    hp: 520, mp: 0, atk: 48, matk: 0, def: 35, mdef: 15, speed: 24, evasion: 0.03,
    exp: 210, gold: [25, 55], drops: [{ itemId: 'rusty_bolt', chance: 0.7, qty: [1, 3] }, { itemId: 'pixel_broadsword', chance: 0.015 }],
    sprite: 'mob_songthaew', terrain: ['ROAD'], deck: ['songthaew_horn', 'tuktuk_ram', 'monster_counter'],
  },
  paddy_crab: {
    id: 'paddy_crab', name: 'Armored Paddy Crab', nameTh: 'ปูนาหุ้มเกราะ', level: 15, element: 'WATER',
    hp: 620, mp: 0, atk: 50, matk: 0, def: 48, mdef: 20, speed: 18, evasion: 0.02,
    exp: 240, gold: [25, 50], drops: [{ itemId: 'crab_shell', chance: 0.55, qty: [1, 1] }, { itemId: 'whetstone', chance: 0.2 }],
    sprite: 'mob_crab', terrain: ['WATER'], deck: ['crab_pinch', 'monster_guard', 'monster_counter'],
  },
  lantern_spirit: {
    id: 'lantern_spirit', name: 'Sky Lantern Spirit', nameTh: 'โคมลอยวิญญาณ', level: 16, element: 'FIRE',
    hp: 520, mp: 90, atk: 30, matk: 68, def: 26, mdef: 44, speed: 30, evasion: 0.12,
    exp: 270, gold: [30, 60], drops: [{ itemId: 'firefly_dust', chance: 0.6, qty: [1, 3] }, { itemId: 'blue_elixir', chance: 0.2 }],
    sprite: 'mob_lantern', terrain: ['URBAN', 'WATER'], deck: ['lantern_flare', 'fire_breath', 'monster_guard'], row: 'BACK',
  },
  neon_bat: {
    id: 'neon_bat', name: 'Neon Bat', nameTh: 'ค้างคาวนีออน', level: 18, element: 'LIGHTNING',
    hp: 600, mp: 60, atk: 55, matk: 70, def: 30, mdef: 40, speed: 40, evasion: 0.2,
    exp: 300, gold: [35, 70], drops: [{ itemId: 'bat_wing', chance: 0.55, qty: [1, 2] }, { itemId: 'blue_elixir', chance: 0.2 }],
    sprite: 'mob_bat', terrain: ['URBAN'], deck: ['bat_screech', 'shadow_bite', 'monster_counter'], row: 'BACK',
  },
  moat_python: {
    id: 'moat_python', name: 'Moat Python', nameTh: 'งูเหลือมคูเมือง', level: 20, element: 'WATER',
    hp: 980, mp: 0, atk: 72, matk: 0, def: 46, mdef: 30, speed: 26, evasion: 0.06,
    exp: 360, gold: [40, 85], drops: [{ itemId: 'python_skin', chance: 0.5, qty: [1, 1] }, { itemId: 'master_repair_kit', chance: 0.03 }],
    sprite: 'mob_python', terrain: ['WATER'], deck: ['python_squeeze', 'rat_nibble', 'monster_rage'],
  },
  ember_lizard: {
    id: 'ember_lizard', name: 'Ember Lizard', nameTh: 'กิ้งก่าถ่านแดง', level: 22, element: 'FIRE',
    hp: 900, mp: 80, atk: 80, matk: 90, def: 55, mdef: 45, speed: 30, evasion: 0.08,
    exp: 420, gold: [50, 100], drops: [{ itemId: 'ember_scale', chance: 0.5, qty: [1, 2] }, { itemId: 'whetstone', chance: 0.25 }],
    sprite: 'mob_lizard', terrain: ['ROAD', 'URBAN'], deck: ['fire_breath', 'monster_guard', 'monster_rage'],
  },
  krasue: {
    id: 'krasue', name: 'Krasue', nameTh: 'กระสือ', level: 24, element: 'SHADOW',
    hp: 980, mp: 160, atk: 60, matk: 120, def: 40, mdef: 70, speed: 36, evasion: 0.16,
    exp: 480, gold: [55, 110], drops: [{ itemId: 'spirit_wisp', chance: 0.5, qty: [1, 1] }, { itemId: 'blue_elixir', chance: 0.3 }],
    sprite: 'mob_krasue', terrain: ['URBAN', 'GREEN'], deck: ['krasue_glow', 'shadow_bite', 'scarecrow_hex', 'monster_rage'], row: 'BACK',
  },
  treant_sapling: {
    id: 'treant_sapling', name: 'Treant Sapling', nameTh: 'ลูกไม้อสูร', level: 26, element: 'EARTH',
    hp: 1100, mp: 40, atk: 90, matk: 60, def: 80, mdef: 50, speed: 20, evasion: 0.02,
    exp: 500, gold: [60, 120], drops: [{ itemId: 'glow_leaf', chance: 0.7, qty: [2, 4] } ],
    sprite: 'mob_sapling', deck: ['root_snare', 'monster_guard', 'monster_counter', 'monster_rage'],
  },
  doi_mist_wraith: {
    id: 'doi_mist_wraith', name: 'Doi Mist Wraith', nameTh: 'วิญญาณหมอกดอย', level: 28, element: 'SHADOW',
    hp: 1300, mp: 150, atk: 95, matk: 140, def: 60, mdef: 90, speed: 34, evasion: 0.15,
    exp: 620, gold: [70, 140], drops: [{ itemId: 'spirit_wisp', chance: 0.55, qty: [1, 2] }, { itemId: 'master_repair_kit', chance: 0.05 }],
    sprite: 'mob_wraith', terrain: ['GREEN'], deck: ['wraith_chill', 'shadow_bite', 'scarecrow_hex', 'monster_rage'], row: 'BACK',
  },
  stone_elephant: {
    id: 'stone_elephant', name: 'Ancient Stone Elephant', nameTh: 'ช้างหินโบราณ', level: 32, element: 'EARTH',
    hp: 2000, mp: 0, atk: 130, matk: 50, def: 110, mdef: 70, speed: 18, evasion: 0,
    exp: 800, gold: [90, 180], drops: [{ itemId: 'stone_chip', chance: 0.5, qty: [1, 2] }, { itemId: 'aegis_pendant', chance: 0.01 }],
    sprite: 'mob_elephant', terrain: ['GREEN'], deck: ['elephant_stomp', 'monster_guard', 'monster_counter', 'monster_rage'],
  },

  // --- Boss minions (never spawn on the map) ---
  shopping_mannequin: {
    id: 'shopping_mannequin', name: 'Shop Mannequin', nameTh: 'หุ่นโชว์เดินได้', level: 12, element: 'NEUTRAL',
    hp: 380, mp: 0, atk: 36, matk: 0, def: 22, mdef: 18, speed: 26, evasion: 0.04,
    exp: 120, gold: [10, 20], drops: [{ itemId: 'rusty_bolt', chance: 0.5, qty: [1, 2] } ],
    sprite: 'mob_mannequin', deck: ['mannequin_pose', 'price_tag_toss'],
  },

  // --- Training dummies (test arena only; never spawn) ---
  training_dummy: {
    id: 'training_dummy', name: 'Training Dummy', nameTh: 'หุ่นไม้ฝึกซ้อม', level: 1, element: 'NEUTRAL',
    hp: 9999999, mp: 0, atk: 0, matk: 0, def: 0, mdef: 0, speed: 0, evasion: 0,
    exp: 0, gold: [0, 0], drops: [], sprite: 'mob_dummy', passive: true,
  },
  armored_dummy: {
    id: 'armored_dummy', name: 'Armored Dummy', nameTh: 'หุ่นเกราะฝึกซ้อม', level: 20, element: 'NEUTRAL',
    hp: 9999999, mp: 0, atk: 0, matk: 0, def: 100, mdef: 100, speed: 0, evasion: 0,
    exp: 0, gold: [0, 0], drops: [], sprite: 'mob_dummy_armored', passive: true,
  },

  // --- Landmark bosses ---
  goblin_king: {
    deck: ['monster_counter'],
    id: 'goblin_king', name: 'Convenience Goblin King', nameTh: 'พญาก็อบลินประจำร้านสะดวกซื้อ', level: 10,
    element: 'NEUTRAL', hp: 5000, mp: 200, atk: 120, matk: 60, def: 45, mdef: 30, speed: 24, evasion: 0.05,
    exp: 1500, gold: [500, 1000],
    drops: [{ itemId: 'goblin_crown_shard', chance: 0.5, qty: [1, 1] }, 
      { itemId: 'convenience_club', chance: 0.05 },
      { itemId: 'red_potion', chance: 1, qty: [2, 5] },
    ],
    sprite: 'boss_goblin_king',
    boss: {
      landmark: 'CONVENIENCE', respawnMinutes: 120, recommendedParty: [1, 3],
      phases: [{ hpBelow: 0.5, message: 'พญาก็อบลินโกรธจัด! ATK/Speed เพิ่มขึ้น', statMult: { atk: 1.25, speed: 1.2 }, addDeck: ['goblin_frenzy'] }],
      enrageRound: 25,
      dungeonWaves: [['alley_rat', 'pixel_slime'], ['soi_dog_spirit', 'alley_rat']],
      skills: [
        { id: 'snack_barrage', name: 'Snack Barrage', nameTh: 'ปาขนมระเบิด', everyTurns: 3,
          damageScale: 1.3, aoe: true, status: { status: 'SLOW', turns: 2, potency: 0.4 }, ultimate: true },
      ],
    },
  },
  octane_overlord: {
    deck: ['monster_counter'],
    id: 'octane_overlord', name: 'Octane Overlord', nameTh: 'หุ่นยนต์หัวจ่ายน้ำมันผู้บ้าคลั่ง', level: 20,
    element: 'FIRE', hp: 14000, mp: 500, atk: 190, matk: 100, def: 100, mdef: 90, speed: 22, evasion: 0.03,
    exp: 6000, gold: [2500, 2500],
    drops: [{ itemId: 'octane_core', chance: 0.5, qty: [1, 1] },
      { itemId: 'master_repair_kit', chance: 0.15 },
      { itemId: 'whetstone', chance: 1, qty: [2, 4] },
    ],
    sprite: 'boss_octane',
    boss: {
      landmark: 'FUEL', respawnMinutes: 240, recommendedParty: [2, 4],
      phases: [{ hpBelow: 0.5, message: 'ระบบร้อนเกินพิกัด! ไฟลุกท่วม', statMult: { atk: 1.2 }, rateBonus: 20, addDeck: ['fire_breath'], everyTurns: 3 }],
      enrageRound: 30,
      dungeonWaves: [['songthaew_mimic'], ['ember_lizard', 'neon_bat']],
      skills: [
        { id: 'oil_spill_ignite', name: 'Oil Spill & Ignite', nameTh: 'ราดน้ำมันจุดไฟ', everyTurns: 4,
          damageScale: 1.1, aoe: true, status: { status: 'BURN', turns: 2, potency: 0.35 }, ultimate: true },
      ],
    },
  },
  sale_queen: {
    deck: ['price_tag_toss', 'flash_sale', 'monster_counter'],
    id: 'sale_queen', name: 'Mega Sale Queen', nameTh: 'ราชินีลดกระหน่ำกลางห้าง', level: 15,
    element: 'NEUTRAL', hp: 6500, mp: 300, atk: 125, matk: 80, def: 50, mdef: 45, speed: 26, evasion: 0.06,
    exp: 3000, gold: [1200, 1800],
    drops: [{ itemId: 'gold_price_tag', chance: 0.5, qty: [1, 1] }, 
      { itemId: 'runner_charm', chance: 0.08 },
      { itemId: 'blue_elixir', chance: 1, qty: [2, 4] },
    ],
    sprite: 'boss_sale_queen',
    boss: {
      landmark: 'MALL', respawnMinutes: 180, recommendedParty: [1, 3],
      phases: [{ hpBelow: 0.5, message: 'ประกาศลดครั้งสุดท้าย! ราชินีเร็วขึ้นและเรียกหุ่นโชว์', statMult: { speed: 1.3 }, addDeck: ['songthaew_horn'] }],
      enrageRound: 28,
      dungeonWaves: [['street_pigeon', 'roof_cat'], ['shopping_mannequin', 'tuktuk_phantom']],
      skills: [
        { id: 'mega_sale', name: 'Mega Sale 99%', nameTh: 'ลดกระหน่ำ 99%', everyTurns: 4,
          damageScale: 1.0, aoe: true, status: { status: 'SLOW', turns: 2, potency: 0.3 },
          summons: { monsterId: 'shopping_mannequin', count: 1 }, ultimate: true },
      ],
    },
  },
  yaksha_guardian: {
    deck: ['guardian_mace', 'gate_roar', 'monster_counter'],
    id: 'yaksha_guardian', name: 'Temple Gate Yaksha', nameTh: 'ยักษ์ทวารบาลเฝ้าประตู', level: 25,
    element: 'EARTH', hp: 13500, mp: 400, atk: 185, matk: 115, def: 100, mdef: 90, speed: 20, evasion: 0,
    exp: 9000, gold: [3000, 3500],
    drops: [{ itemId: 'guardian_gold_leaf', chance: 0.5, qty: [1, 1] }, 
      { itemId: 'aegis_pendant', chance: 0.06 },
      { itemId: 'master_repair_kit', chance: 1 },
    ],
    sprite: 'boss_yaksha',
    boss: {
      landmark: 'TEMPLE', respawnMinutes: 360, recommendedParty: [2, 4],
      phases: [{ hpBelow: 0.5, message: 'ยักษ์ทวารบาลจริงจังขึ้น! "เจ้าคู่ควรจะผ่านประตูนี้หรือไม่"', statMult: { def: 1.2 }, everyTurns: 3 }],
      enrageRound: 32,
      dungeonWaves: [['lantern_spirit', 'firefly_wisp'], ['moat_python']],
      skills: [
        { id: 'giant_mace_quake', name: 'Giant Mace Quake', nameTh: 'กระบองยักษ์สะเทือนธรณี', everyTurns: 4,
          damageScale: 1.05, aoe: true, status: { status: 'STUN', turns: 1 }, ultimate: true },
      ],
    },
  },
  phantom_stationmaster: {
    deck: ['bat_screech', 'wraith_chill', 'monster_counter'],
    id: 'phantom_stationmaster', name: 'Phantom Stationmaster', nameTh: 'นายสถานีเงา', level: 22,
    element: 'SHADOW', hp: 11000, mp: 450, atk: 170, matk: 150, def: 80, mdef: 95, speed: 26, evasion: 0.06,
    exp: 7000, gold: [2600, 3200],
    drops: [
      { itemId: 'phantom_ticket', chance: 0.5, qty: [1, 1] },
      { itemId: 'moat_guard_sword', chance: 0.06 },
      { itemId: 'blue_elixir', chance: 1, qty: [2, 4] },
    ],
    sprite: 'boss_stationmaster',
    boss: {
      landmark: 'STATION', respawnMinutes: 240, recommendedParty: [2, 3],
      phases: [{ hpBelow: 0.5, message: 'ประกาศ: ขบวนรถไฟผีกำลังเข้าชานชาลา! นายสถานีเร็วขึ้น', statMult: { speed: 1.25 }, addDeck: ['bat_screech'], everyTurns: 3 }],
      enrageRound: 30,
      dungeonWaves: [['tuktuk_phantom', 'neon_bat'], ['songthaew_mimic', 'lantern_spirit']],
      skills: [
        { id: 'last_train', name: 'Last Train', nameTh: 'รถไฟขบวนสุดท้าย', everyTurns: 4,
          damageScale: 1.05, aoe: true, status: { status: 'STUN', turns: 1 }, ultimate: true },
      ],
    },
  },
  relic_colossus: {
    deck: ['elephant_stomp', 'root_snare', 'gate_roar', 'monster_counter'],
    id: 'relic_colossus', name: 'Ancient Relic Guardian', nameTh: 'ศิลาผู้พิทักษ์โบราณ', level: 33,
    element: 'EARTH', hp: 15000, mp: 600, atk: 195, matk: 150, def: 115, mdef: 110, speed: 17, evasion: 0,
    exp: 16000, gold: [5000, 6000],
    drops: [
      { itemId: 'relic_fragment', chance: 0.5, qty: [1, 1] },
      { itemId: 'elephant_amulet', chance: 0.05 },
      { itemId: 'starlight_staff', chance: 0.01 },
      { itemId: 'master_repair_kit', chance: 1 },
    ],
    sprite: 'boss_relic',
    boss: {
      landmark: 'MUSEUM', respawnMinutes: 360, recommendedParty: [2, 3],
      phases: [{ hpBelow: 0.5, message: 'อักขระโบราณสว่างวาบ! "ผู้ใดปลุกข้าจากนิทรา จงพิสูจน์ตน"', statMult: { def: 1.15 }, everyTurns: 3 }],
      enrageRound: 34,
      dungeonWaves: [['stone_elephant'], ['doi_mist_wraith', 'krasue']],
      skills: [
        { id: 'awaken_quake', name: 'Awakening Quake', nameTh: 'ศิลาตื่นสะเทือนภพ', everyTurns: 4,
          damageScale: 1.0, aoe: true, status: { status: 'ROOT', turns: 1 }, ultimate: true },
      ],
    },
  },
  park_treant: {
    id: 'park_treant', name: 'Ancient Park Treant', nameTh: 'พฤกษาอสูรในสวนสาธารณะ', level: 30,
    element: 'EARTH', hp: 80000, mp: 1000, atk: 450, matk: 300, def: 220, mdef: 160, speed: 18, evasion: 0.0,
    exp: 20000, gold: [4000, 6000],
    drops: [{ itemId: 'ancient_bark', chance: 0.5, qty: [1, 1] }, 
      { itemId: 'starlight_staff', chance: 0.02 },
      { itemId: 'golden_luck_ring', chance: 0.03 },
    ],
    sprite: 'boss_treant',
    boss: {
      landmark: 'PARK', respawnMinutes: 0, dailyAt: '18:00', worldBoss: { durationHours: 24 },
      recommendedParty: [4, 8],
      phases: [{ hpBelow: 0.5, message: 'รากไม้โบราณตื่นขึ้น! เรียกลูกไม้ถี่ขึ้น', statMult: { def: 1.2 }, everyTurns: 4 }],
      enrageRound: 40,
      skills: [
        { id: 'root_entangle', name: 'Root Entangle', nameTh: 'รากไม้รัดตรึง', everyTurns: 5,
          damageScale: 0.8, aoe: true, status: { status: 'ROOT', turns: 1 },
          summons: { monsterId: 'treant_sapling', count: 5 }, ultimate: true },
      ],
    },
  },
};

/** Gate landmarks and their boss. Service places (hospital, market, sanctuaries) have none. */
export const LANDMARK_BOSS: Partial<Record<LandmarkKind, string>> = {
  CONVENIENCE: 'goblin_king',
  MALL: 'sale_queen',
  FUEL: 'octane_overlord',
  TEMPLE: 'yaksha_guardian',
  PARK: 'park_treant',
  STATION: 'phantom_stationmaster',
  MUSEUM: 'relic_colossus',
};

/**
 * How many signature skills a monster uses: more with level (Lv 1-7: 1, 8-15: 2, 16-23: 3,
 * 24+: 4). Bosses always use their whole deck.
 */
export function monsterSkillSlots(level: number, boss = false): number {
  return boss ? 8 : Math.min(4, 1 + Math.floor(level / 8));
}

/** The skills a monster actually brings into a fight. */
export function monsterDeck(m: MonsterDef): string[] {
  return (m.deck ?? []).slice(0, monsterSkillSlots(m.level, !!m.boss));
}
