import type { Element, LandmarkKind } from '../types';
import type { StatusId } from './skills';

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
}

export interface BossSkill {
  id: string;
  name: string;
  nameTh: string;
  /** Uses this every N of the boss's own turns. */
  everyTurns: number;
  damageScale: number;
  aoe: boolean;
  status?: { status: StatusId; seconds: number; potency?: number };
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
}

export const MONSTERS: Record<string, MonsterDef> = {
  // --- Common field monsters (Lv 1-30) ---
  pixel_slime: {
    id: 'pixel_slime', name: 'Pixel Slime', nameTh: 'สไลม์พิกเซล', level: 1, element: 'WATER',
    hp: 40, mp: 0, atk: 6, matk: 0, def: 2, mdef: 2, speed: 18, evasion: 0.02,
    exp: 12, gold: [1, 4], drops: [{ itemId: 'red_potion', chance: 0.1 }],
    sprite: 'mob_slime', terrain: ['ROAD', 'URBAN', 'GREEN', 'WATER'],
  },
  alley_rat: {
    id: 'alley_rat', name: 'Alley Rat', nameTh: 'หนูซอย', level: 3, element: 'NEUTRAL',
    hp: 70, mp: 0, atk: 11, matk: 0, def: 4, mdef: 2, speed: 28, evasion: 0.08,
    exp: 25, gold: [3, 8], drops: [{ itemId: 'red_potion', chance: 0.12 }],
    sprite: 'mob_rat', terrain: ['ROAD', 'URBAN'],
  },
  soi_dog_spirit: {
    id: 'soi_dog_spirit', name: 'Soi Dog Spirit', nameTh: 'วิญญาณหมาซอย', level: 6, element: 'SHADOW',
    hp: 160, mp: 0, atk: 22, matk: 0, def: 10, mdef: 6, speed: 30, evasion: 0.1,
    exp: 60, gold: [8, 18], drops: [{ itemId: 'iron_helm', chance: 0.02 }],
    sprite: 'mob_dog', terrain: ['ROAD', 'URBAN'],
  },
  moat_carp: {
    id: 'moat_carp', name: 'Moat Carp', nameTh: 'ปลาคาร์ปคูเมือง', level: 8, element: 'WATER',
    hp: 220, mp: 30, atk: 20, matk: 28, def: 14, mdef: 16, speed: 22, evasion: 0.05,
    exp: 85, gold: [10, 25], drops: [{ itemId: 'blue_elixir', chance: 0.15 }],
    sprite: 'mob_carp', terrain: ['WATER'],
  },
  leaf_sprite: {
    id: 'leaf_sprite', name: 'Leaf Sprite', nameTh: 'ภูตใบไม้', level: 10, element: 'EARTH',
    hp: 300, mp: 50, atk: 26, matk: 40, def: 18, mdef: 22, speed: 26, evasion: 0.12,
    exp: 120, gold: [14, 30], drops: [{ itemId: 'runner_sneakers', chance: 0.02 }],
    sprite: 'mob_leaf', terrain: ['GREEN'],
  },
  songthaew_mimic: {
    id: 'songthaew_mimic', name: 'Songthaew Mimic', nameTh: 'รถแดงปีศาจ', level: 14, element: 'NEUTRAL',
    hp: 520, mp: 0, atk: 48, matk: 0, def: 35, mdef: 15, speed: 24, evasion: 0.03,
    exp: 210, gold: [25, 55], drops: [{ itemId: 'pixel_broadsword', chance: 0.015 }],
    sprite: 'mob_songthaew', terrain: ['ROAD'],
  },
  neon_bat: {
    id: 'neon_bat', name: 'Neon Bat', nameTh: 'ค้างคาวนีออน', level: 18, element: 'LIGHTNING',
    hp: 600, mp: 60, atk: 55, matk: 70, def: 30, mdef: 40, speed: 40, evasion: 0.2,
    exp: 300, gold: [35, 70], drops: [{ itemId: 'blue_elixir', chance: 0.2 }],
    sprite: 'mob_bat', terrain: ['URBAN'],
  },
  ember_lizard: {
    id: 'ember_lizard', name: 'Ember Lizard', nameTh: 'กิ้งก่าถ่านแดง', level: 22, element: 'FIRE',
    hp: 900, mp: 80, atk: 80, matk: 90, def: 55, mdef: 45, speed: 30, evasion: 0.08,
    exp: 420, gold: [50, 100], drops: [{ itemId: 'whetstone', chance: 0.25 }],
    sprite: 'mob_lizard', terrain: ['ROAD', 'URBAN'],
  },
  doi_mist_wraith: {
    id: 'doi_mist_wraith', name: 'Doi Mist Wraith', nameTh: 'วิญญาณหมอกดอย', level: 28, element: 'SHADOW',
    hp: 1300, mp: 150, atk: 95, matk: 140, def: 60, mdef: 90, speed: 34, evasion: 0.15,
    exp: 620, gold: [70, 140], drops: [{ itemId: 'master_repair_kit', chance: 0.05 }],
    sprite: 'mob_wraith', terrain: ['GREEN'],
  },
  treant_sapling: {
    id: 'treant_sapling', name: 'Treant Sapling', nameTh: 'ลูกไม้อสูร', level: 26, element: 'EARTH',
    hp: 1100, mp: 40, atk: 90, matk: 60, def: 80, mdef: 50, speed: 20, evasion: 0.02,
    exp: 500, gold: [60, 120], drops: [],
    sprite: 'mob_sapling',
  },

  // --- Landmark bosses ---
  goblin_king: {
    id: 'goblin_king', name: 'Convenience Goblin King', nameTh: 'พญาก็อบลินประจำร้านสะดวกซื้อ', level: 10,
    element: 'NEUTRAL', hp: 5000, mp: 200, atk: 105, matk: 60, def: 45, mdef: 30, speed: 24, evasion: 0.05,
    exp: 1500, gold: [500, 1000],
    drops: [
      { itemId: 'convenience_club', chance: 0.05 },
      { itemId: 'red_potion', chance: 1, qty: [2, 5] },
    ],
    sprite: 'boss_goblin_king',
    boss: {
      landmark: 'CONVENIENCE', respawnMinutes: 120, recommendedParty: [1, 3],
      skills: [
        { id: 'snack_barrage', name: 'Snack Barrage', nameTh: 'ปาขนมระเบิด', everyTurns: 3,
          damageScale: 1.3, aoe: true, status: { status: 'SLOW', seconds: 5, potency: 0.5 }, ultimate: true },
      ],
    },
  },
  octane_overlord: {
    id: 'octane_overlord', name: 'Octane Overlord', nameTh: 'หุ่นยนต์หัวจ่ายน้ำมันผู้บ้าคลั่ง', level: 20,
    element: 'FIRE', hp: 18000, mp: 500, atk: 240, matk: 200, def: 110, mdef: 90, speed: 22, evasion: 0.03,
    exp: 6000, gold: [2500, 2500],
    drops: [
      { itemId: 'fuel_plate', chance: 0.08 },
      { itemId: 'whetstone', chance: 1, qty: [2, 4] },
    ],
    sprite: 'boss_octane',
    boss: {
      landmark: 'FUEL', respawnMinutes: 240, recommendedParty: [2, 4],
      skills: [
        { id: 'oil_spill_ignite', name: 'Oil Spill & Ignite', nameTh: 'ราดน้ำมันจุดไฟ', everyTurns: 4,
          damageScale: 1.1, aoe: true, status: { status: 'BLEED', seconds: 5, potency: 60 }, ultimate: true },
      ],
    },
  },
  park_treant: {
    id: 'park_treant', name: 'Ancient Park Treant', nameTh: 'พฤกษาอสูรในสวนสาธารณะ', level: 30,
    element: 'EARTH', hp: 80000, mp: 1000, atk: 450, matk: 300, def: 220, mdef: 160, speed: 18, evasion: 0.0,
    exp: 20000, gold: [4000, 6000],
    drops: [
      { itemId: 'starlight_staff', chance: 0.02 },
      { itemId: 'golden_luck_ring', chance: 0.03 },
    ],
    sprite: 'boss_treant',
    boss: {
      landmark: 'PARK', respawnMinutes: 0, dailyAt: '18:00', worldBoss: { durationHours: 24 },
      recommendedParty: [4, 8],
      skills: [
        { id: 'root_entangle', name: 'Root Entangle', nameTh: 'รากไม้รัดตรึง', everyTurns: 5,
          damageScale: 0.8, aoe: true, status: { status: 'ROOT', seconds: 4 },
          summons: { monsterId: 'treant_sapling', count: 5 }, ultimate: true },
      ],
    },
  },
};

export const LANDMARK_BOSS: Record<Exclude<LandmarkKind, 'CITY'>, string> = {
  CONVENIENCE: 'goblin_king',
  FUEL: 'octane_overlord',
  PARK: 'park_treant',
};
