/**
 * Skill database for the party auto-battle engine. `rate` = base activation chance (%) rolled
 * each turn (ACTIVE) or on the trigger event (REACTIVE). Cooldowns/durations are in turns.
 */
import type { SkillDef } from '../combat/types';

export type { SkillDef, StatusId, TargetRule, Effect, TriggerKind } from '../combat/types';

export const BASIC_ATTACK = 'basic_attack';

const S = (d: Omit<SkillDef, 'priority'> & { priority?: number }): SkillDef => ({ priority: 0, ...d });

export const SKILLS: Record<string, SkillDef> = {
  basic_attack: S({
    id: 'basic_attack', name: 'Attack', nameTh: 'โจมตี', description: 'โจมตีธรรมดา 100% ATK (ใช้เมื่อไม่มีสกิลทำงาน)',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 100, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } }],
  }),

  // ---------------------------------------------------------------- Novice
  power_smash: S({
    id: 'power_smash', name: 'Rush', nameTh: 'พุ่งกระแทก', description: 'โจมตีหนัก 180% ATK ใส่เป้าหมายเดียว',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 20, cooldown: 2, mp: 14, target: 'ENEMY', priority: 1,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.8 } }],
  }),
  stone_throw: S({
    id: 'stone_throw', name: 'Throw Stone', nameTh: 'ปาหิน', description: 'ปาหินใส่แถวหลัง 110% ATK (ไม่มีคูลดาวน์)',
    kind: 'ACTIVE', element: 'EARTH', rate: 23, cooldown: 0, mp: 6, target: 'ENEMY_BACK', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.1 } }],
  }),
  focus: S({
    id: 'focus', name: 'Focus', nameTh: 'รวมสมาธิ', description: 'ATK +1 ชั่วคราว',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 20, cooldown: 5, mp: 12, target: 'SELF', priority: 3,
    effects: [{ kind: 'BUFF', stat: 'atk', flat: 1, turns: 3, self: true }],
  }),
  counter_jab: S({
    id: 'counter_jab', name: 'Counter Tackle', nameTh: 'กระแทกสวน', description: 'ถูกโจมตีโดน: 15% กระแทกสวนกลับ 60% ATK',
    kind: 'REACTIVE', trigger: 'COUNTER', element: 'NEUTRAL', rate: 15, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.6 } }],
  }),
  // ---------------------------------------------------------------- Knight
  shield_bash: S({
    id: 'shield_bash', name: 'Shield Bash', nameTh: 'กระแทกโล่', description: '120% ATK + 150% DEF และ 60% Stun 1 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 18, target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.2, def: 1.5 } },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.6 },
    ],
  }),
  taunt: S({
    id: 'taunt', name: 'Taunt', nameTh: 'คำรามดึงความสนใจ', description: 'บังคับศัตรูตีตัวเอง 2 เทิร์น และ DEF +30%',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 4, mp: 20, target: 'SELF', priority: 3,
    effects: [
      { kind: 'STATUS', status: 'TAUNTING', turns: 2, self: true },
      { kind: 'BUFF', stat: 'def', pct: 0.3, turns: 2, self: true },
    ],
  }),
  guardian: S({
    id: 'guardian', name: 'Guardian', nameTh: 'ผู้พิทักษ์', description: 'เพื่อนถูกโจมตีเดี่ยว: 35% เข้ารับแทน (ลดดาเมจ 30%)',
    kind: 'REACTIVE', trigger: 'COVER', element: 'NEUTRAL', rate: 35, cooldown: 0, mp: 0, target: 'SELF', effects: [],
  }),
  iron_wall: S({
    id: 'iron_wall', name: 'Iron Wall', nameTh: 'ปราการเหล็กกล้า', description: 'HP ต่ำกว่า 30%: เกราะ 50% Max HP 3 เทิร์น (1 ครั้ง)',
    kind: 'REACTIVE', trigger: 'ON_LOW_HP', element: 'NEUTRAL', rate: 100, cooldown: 0, mp: 0, target: 'SELF', oncePerBattle: true,
    effects: [{ kind: 'SHIELD', pctMaxHp: 0.5, turns: 3 }],
  }),

  // ---------------------------------------------------------------- Knight (FFT jobs, 2026-09-27)
  rend_power: S({
    id: 'rend_power', name: 'Rend Power', nameTh: 'ทำลายพลัง', description: '100% ATK และลด ATK ศัตรู 30% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 3, mp: 12, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } },
      { kind: 'BUFF', stat: 'atk', pct: -0.3, turns: 3 },
    ],
  }),
  rend_magick: S({
    id: 'rend_magick', name: 'Rend Magick', nameTh: 'ทำลายเวท', description: '100% ATK และลด MATK ศัตรู 25% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 12, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } },
      { kind: 'BUFF', stat: 'matk', pct: -0.25, turns: 3 },
    ],
  }),
  rend_speed: S({
    id: 'rend_speed', name: 'Rend Speed', nameTh: 'ทำลายความเร็ว', description: '100% ATK และทำให้ช้าลง 30% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 12, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } },
      { kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.3 },
    ],
  }),
  parry: S({
    id: 'parry', name: 'Parry', nameTh: 'ปัดป้อง', description: 'ถูกโจมตีกายภาพ: 25% ปัดทิ้ง ไม่เสียเลือด',
    kind: 'REACTIVE', trigger: 'PARRY', element: 'NEUTRAL', rate: 25, cooldown: 0, mp: 0, target: 'SELF', effects: [],
  }),

  // ---------------------------------------------------------------- White Mage (FFT, 2026-09-27; class id CLERIC)
  cure: S({
    id: 'cure', name: 'Cure', nameTh: 'เคียว', description: 'เพื่อน HP ต่ำกว่า 60%: ฟื้นเพื่อน HP ต่ำสุด 150% MATK + 30',
    kind: 'ACTIVE', element: 'HOLY', rate: 45, cooldown: 1, mp: 10, target: 'ALLY_LOWEST_HP', condition: 'ALLY_HP_BELOW_60', priority: 3,
    effects: [{ kind: 'HEAL', scaling: { matk: 1.5 }, flat: 30 }],
  }),
  curaga: S({
    id: 'curaga', name: 'Curaga', nameTh: 'เคียวก้า', description: 'เพื่อน HP ต่ำกว่า 60%: ฟื้นทั้งปาร์ตี้ 90% MATK + 20',
    kind: 'ACTIVE', element: 'HOLY', rate: 30, cooldown: 3, mp: 28, target: 'ALL_ALLIES', condition: 'ALLY_HP_BELOW_60', priority: 4,
    effects: [{ kind: 'HEAL', scaling: { matk: 0.9 }, flat: 20 }],
  }),
  raise: S({
    id: 'raise', name: 'Arise', nameTh: 'อาไรส์', description: 'เพื่อนล้ม: ชุบชีวิตพร้อม HP เต็ม',
    kind: 'ACTIVE', element: 'HOLY', rate: 60, cooldown: 6, mp: 45, target: 'DEAD_ALLY', condition: 'ALLY_DEAD', priority: 5,
    effects: [{ kind: 'REVIVE', pctHp: 1 }],
  }),
  protect: S({
    id: 'protect', name: 'Protectja', nameTh: 'โพรเทคจา', description: 'DEF ทั้งปาร์ตี้ +25% 3 เทิร์น',
    kind: 'ACTIVE', element: 'HOLY', rate: 25, cooldown: 4, mp: 20, target: 'ALL_ALLIES', priority: 2,
    effects: [{ kind: 'BUFF', stat: 'def', pct: 0.25, turns: 3 }],
  }),
  esuna: S({
    id: 'esuna', name: 'Esuna', nameTh: 'เอสุนา', description: 'มีเพื่อนติดสถานะผิดปกติ: ล้างสถานะผิดปกติทั้งปาร์ตี้',
    kind: 'ACTIVE', element: 'HOLY', rate: 45, cooldown: 2, mp: 14, target: 'ALL_ALLIES', condition: 'ALLY_DEBUFFED', priority: 3,
    effects: [{ kind: 'CLEANSE' }],
  }),
  holy: S({
    id: 'holy', name: 'Holy', nameTh: 'โฮลี่', description: '220% MATK ธาตุศักดิ์สิทธิ์ใส่ศัตรู 1 ตัว',
    kind: 'ACTIVE', element: 'HOLY', rate: 25, cooldown: 3, mp: 30, target: 'ENEMY', priority: 1,
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 2.2 } }],
  }),
  regenerate: S({
    id: 'regenerate', name: 'Regenerate', nameTh: 'ฟื้นฟูต่อเนื่อง', description: 'ถูกโจมตีโดน: 25% ได้ Regen ฟื้น 5% Max HP ต่อเทิร์น 3 เทิร์น',
    kind: 'REACTIVE', trigger: 'ON_HIT', element: 'HOLY', rate: 25, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'STATUS', status: 'REGEN', turns: 3, potency: 0.05, self: true }],
  }),

  // ---------------------------------------------------------------- Black Mage (FFT, 2026-09-27; class id SORCERER)
  fire: S({
    id: 'fire', name: 'Fire', nameTh: 'ไฟร์', description: '145% MATK ไฟใส่ศัตรู 1 ตัว + 25% ติดไฟ 2 เทิร์น',
    kind: 'ACTIVE', element: 'FIRE', rate: 30, cooldown: 2, mp: 20, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.45 } },
      { kind: 'STATUS', status: 'BURN', turns: 2, chance: 0.25, potency: 0.3 },
    ],
  }),
  firaga: S({
    id: 'firaga', name: 'Firaga', nameTh: 'ไฟร์ก้า', description: 'ศัตรูทุกตัว 100% MATK ไฟ + 30% ติดไฟ 2 เทิร์น',
    kind: 'ACTIVE', element: 'FIRE', rate: 25, cooldown: 3, mp: 40, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', priority: 2,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.0 } },
      { kind: 'STATUS', status: 'BURN', turns: 2, chance: 0.3, potency: 0.3 },
    ],
  }),
  thunder: S({
    id: 'thunder', name: 'Thunder', nameTh: 'ธันเดอร์', description: '155% MATK สายฟ้าใส่ศัตรู 1 ตัว + 15% มึน 1 เทิร์น',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 30, cooldown: 2, mp: 20, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.55 } },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.15 },
    ],
  }),
  thundaga: S({
    id: 'thundaga', name: 'Thundaga', nameTh: 'ธันดาก้า', description: 'ศัตรูทุกตัว 100% MATK สายฟ้า + 10% มึน 1 เทิร์น',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 25, cooldown: 3, mp: 40, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', priority: 2,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.0 } },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.1 },
    ],
  }),
  blizzard: S({
    id: 'blizzard', name: 'Blizzard', nameTh: 'บลิซซาร์ด', description: '145% MATK น้ำแข็งใส่ศัตรู 1 ตัว + 20% แช่แข็ง 1 เทิร์น',
    kind: 'ACTIVE', element: 'WATER', rate: 30, cooldown: 2, mp: 20, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.45 } },
      { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.2 },
    ],
  }),
  blizzaga: S({
    id: 'blizzaga', name: 'Blizzaga', nameTh: 'บลิซซาก้า', description: 'ศัตรูทุกตัว 100% MATK น้ำแข็ง + 15% แช่แข็ง 1 เทิร์น',
    kind: 'ACTIVE', element: 'WATER', rate: 25, cooldown: 3, mp: 40, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', priority: 2,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.0 } },
      { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.15 },
    ],
  }),
  magick_counter: S({
    id: 'magick_counter', name: 'Magick Counter', nameTh: 'เวทสวนกลับ', description: 'ถูกเวทโจมตีโดน: 25% ร่ายเวทสวนกลับ 120% MATK',
    kind: 'REACTIVE', trigger: 'MAGIC_COUNTER', element: 'NEUTRAL', rate: 25, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.2 } }],
  }),

  // ---------------------------------------------------------------- Dancer (FFT, 2026-09-27): dances hex every foe
  mincing_minuet: S({
    id: 'mincing_minuet', name: 'Mincing Minuet', nameTh: 'ระบำดูดมานา', description: 'ศัตรูทุกตัวเสีย MP 25%',
    kind: 'ACTIVE', element: 'SHADOW', rate: 25, cooldown: 3, mp: 12, target: 'ALL_ENEMIES',
    effects: [{ kind: 'RESTORE_MP', pct: -0.25 }],
  }),
  polka: S({
    id: 'polka', name: 'Polka', nameTh: 'ระบำโพลก้า', description: 'ศัตรูทุกตัว ATK และ MATK −25% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 3, mp: 18, target: 'ALL_ENEMIES', priority: 1,
    effects: [
      { kind: 'BUFF', stat: 'atk', pct: -0.25, turns: 3 },
      { kind: 'BUFF', stat: 'matk', pct: -0.25, turns: 3 },
    ],
  }),
  slow_dance: S({
    id: 'slow_dance', name: 'Slow Dance', nameTh: 'ระบำเชื่องช้า', description: 'ศัตรูทุกตัว 80% ช้าลง 40% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 16, target: 'ALL_ENEMIES',
    effects: [{ kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.4, chance: 0.8 }],
  }),
  forbidden_dance: S({
    id: 'forbidden_dance', name: 'Forbidden Dance', nameTh: 'ระบำต้องห้าม', description: 'ศัตรูทุกตัวสุ่มติดพิษ 40% · มึน 15% · ช้าลง 30%',
    kind: 'ACTIVE', element: 'SHADOW', rate: 20, cooldown: 4, mp: 26, target: 'ALL_ENEMIES', priority: 1,
    effects: [
      { kind: 'STATUS', status: 'POISON', turns: 3, potency: 0.05, chance: 0.4 },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.15 },
      { kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.3, chance: 0.3 },
    ],
  }),
  heartbreak: S({
    id: 'heartbreak', name: 'Heartbreak', nameTh: 'ใจสลาย', description: 'ถูกโจมตีโดน: 30% ร่ายรำสวนศัตรูทุกตัว 80% ATK',
    kind: 'REACTIVE', trigger: 'ON_HIT', element: 'NEUTRAL', rate: 30, cooldown: 0, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }],
  }),

  // ---------------------------------------------------------------- Bard (FFT, 2026-09-27): songs for the whole party
  seraph_song: S({
    id: 'seraph_song', name: 'Seraph Song', nameTh: 'บทเพลงเทวดา', description: 'เพื่อนมี MP < 50%: ฟื้น MP ทั้งทีม 12%',
    kind: 'ACTIVE', element: 'HOLY', rate: 35, cooldown: 3, mp: 0, target: 'ALL_ALLIES', condition: 'ALLY_MP_BELOW_50', priority: 2,
    effects: [{ kind: 'RESTORE_MP', pct: 0.12 }],
  }),
  lifes_anthem: S({
    id: 'lifes_anthem', name: "Life's Anthem", nameTh: 'เพลงแห่งชีวิต', description: 'เพื่อน HP < 60%: ฟื้น HP ทั้งทีม 50% MATK + 20',
    kind: 'ACTIVE', element: 'HOLY', rate: 35, cooldown: 3, mp: 24, target: 'ALL_ALLIES', condition: 'ALLY_HP_BELOW_60', priority: 3,
    effects: [{ kind: 'HEAL', scaling: { matk: 0.5 }, flat: 20 }],
  }),
  rousing_melody: S({
    id: 'rousing_melody', name: 'Rousing Melody', nameTh: 'ทำนองปลุกใจ', description: 'ทั้งทีมความเร็ว +20% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 4, mp: 18, target: 'ALL_ALLIES', priority: 1,
    effects: [{ kind: 'BUFF', stat: 'speed', pct: 0.2, turns: 3 }],
  }),
  battle_chant: S({
    id: 'battle_chant', name: 'Battle Chant', nameTh: 'บทสวดศึก', description: 'ทั้งทีม ATK และ MATK +15% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 4, mp: 22, target: 'ALL_ALLIES', priority: 1,
    effects: [
      { kind: 'BUFF', stat: 'atk', pct: 0.15, turns: 3 },
      { kind: 'BUFF', stat: 'matk', pct: 0.15, turns: 3 },
    ],
  }),
  soothing_tune: S({
    id: 'soothing_tune', name: 'Soothing Tune', nameTh: 'เพลงปลอบใจ', description: 'ถูกโจมตีโดน: 30% ร้องเพลงฟื้น HP ทั้งทีม 25% MATK + 10',
    kind: 'REACTIVE', trigger: 'ON_HIT', element: 'HOLY', rate: 30, cooldown: 0, mp: 0, target: 'ALL_ALLIES',
    effects: [{ kind: 'HEAL', scaling: { matk: 0.25 }, flat: 10 }],
  }),

  // ---------------------------------------------------------------- Ninja (FFT, 2026-09-27)
  shuriken: S({
    id: 'shuriken', name: 'Shuriken', nameTh: 'ดาวกระจาย', description: 'ขว้างดาวกระจายใส่ศัตรู 1 ตัว (ถึงแถวหลัง) 110% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 35, cooldown: 1, mp: 8, target: 'ENEMY', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.1 } }],
  }),
  bomb: S({
    id: 'bomb', name: 'Bomb', nameTh: 'ระเบิดควัน', description: 'ขว้างระเบิดใส่ศัตรูทุกตัว 80% ATK ไฟ และ 20% ติดไฟ',
    kind: 'ACTIVE', element: 'FIRE', rate: 25, cooldown: 3, mp: 20, target: 'ALL_ENEMIES', ranged: true,
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } },
      { kind: 'STATUS', status: 'BURN', turns: 3, chance: 0.2 },
    ],
  }),
  shadow_clone: S({
    id: 'shadow_clone', name: 'Shadow Clone', nameTh: 'แยกร่างเงา', description: 'แยกร่างรุมฟันศัตรู 1 ตัว 3 ครั้ง ครั้งละ 50% ATK',
    kind: 'ACTIVE', element: 'SHADOW', rate: 25, cooldown: 3, mp: 18, target: 'ENEMY', priority: 1,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.5 }, hits: 3 }],
  }),
  ninja_vanish: S({
    id: 'ninja_vanish', name: 'Vanish', nameTh: 'ล่องหน', description: 'ถูกโจมตีโดน: 20% ล่องหน ศัตรูเล็งไม่ได้จนจบเทิร์นถัดไปของตัวเอง',
    kind: 'REACTIVE', trigger: 'ON_HIT', element: 'SHADOW', rate: 20, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'STATUS', status: 'HIDDEN', turns: 1, self: true }],
  }),
  kawarimi: S({
    id: 'kawarimi', name: 'Kawarimi', nameTh: 'คาถาสลับร่าง', description: 'ถูกโจมตี (กายภาพหรือเวท): 30% สลับร่างเป็นขอนไม้หลบพ้น',
    kind: 'REACTIVE', trigger: 'EVADE', element: 'NEUTRAL', rate: 30, cooldown: 0, mp: 0, target: 'SELF',
    effects: [],
  }),

  // ---------------------------------------------------------------- Samurai (FFT, 2026-09-27): Draw Out — the spirits of famous blades
  kotetsu: S({
    id: 'kotetsu', name: 'Kotetsu', nameTh: 'ดาบโคเท็ตสึ', description: 'ชักดาบฟันศัตรูทุกตัว 80% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 16, target: 'ALL_ENEMIES', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }],
  }),
  osafune: S({
    id: 'osafune', name: 'Osafune', nameTh: 'ดาบโอซาฟุเนะ', description: 'ฟันศัตรู 1 ตัว 140% ATK และเผา MP 30%',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 14, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.4 } },
      { kind: 'RESTORE_MP', pct: -0.3 },
    ],
  }),
  ama_no_murakumo: S({
    id: 'ama_no_murakumo', name: 'Ama-no-Murakumo', nameTh: 'ดาบอามะโนะมุราคุโมะ', description: 'ดาบในตำนานฟันศัตรูทุกตัว 130% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 20, cooldown: 4, mp: 36, target: 'ALL_ENEMIES', ranged: true, priority: 2,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.3 } }],
  }),
  shirahadori: S({
    id: 'shirahadori', name: 'Shirahadori', nameTh: 'ชิราฮาโดริ', description: 'ประกบมือรับดาบ: ปัดการโจมตีกายภาพ 10% + LUK × 0.5% (สูงสุด 50%)',
    kind: 'REACTIVE', trigger: 'PARRY', element: 'NEUTRAL', rate: 10, lukRate: { per: 0.5, max: 50 }, cooldown: 0, mp: 0, target: 'SELF',
    effects: [],
  }),

  // ---------------------------------------------------------------- Dragoon (FFT, 2026-09-27)
  jump: S({
    id: 'jump', name: 'Jump', nameTh: 'กระโดดหอก', description: 'กระโดดขึ้นฟ้า (ไม่มีใครโจมตีได้) แล้วพุ่งลงแทงในเทิร์นถัดไป 200% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 3, mp: 15, target: 'ENEMY', ranged: true, jump: true, priority: 1,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 2 } }],
  }),
  dragons_faith: S({
    id: 'dragons_faith', name: "Dragon's Faith", nameTh: 'ศรัทธามังกร', description: 'เชื่อในพลังมังกร: ATK +15% และคริติคอล +50% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 5, mp: 20, target: 'SELF', priority: 2,
    effects: [
      { kind: 'BUFF', stat: 'atk', pct: 0.15, turns: 3, self: true },
      { kind: 'BUFF', stat: 'crit', flat: 0.5, turns: 3, self: true },
    ],
  }),
  dragonheart: S({
    id: 'dragonheart', name: 'Dragonheart', nameTh: 'หัวใจมังกร', description: 'เมื่อตาย: 30% ฟื้นขึ้นมาพร้อม HP 30%',
    kind: 'REACTIVE', trigger: 'ON_DEATH', element: 'NEUTRAL', rate: 30, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'REVIVE', pctHp: 0.3 }],
  }),

  // ---------------------------------------------------------------- Geomancer (FFT, 2026-09-27): geomancy = (ATK + MATK) magic with a nature status
  tanglevine: S({
    id: 'tanglevine', name: 'Tanglevine', nameTh: 'เถาวัลย์รัด', description: 'ศัตรู 1 ตัว 60% ATK + 60% MATK ธาตุดิน และ 15% หยุดนิ่ง 1 เทิร์น',
    kind: 'ACTIVE', element: 'EARTH', rate: 25, cooldown: 2, mp: 14, target: 'ENEMY', ranged: true,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { atk: 0.6, matk: 0.6 } },
      { kind: 'STATUS', status: 'STOP', turns: 1, chance: 0.15 },
    ],
  }),
  sinkhole: S({
    id: 'sinkhole', name: 'Sinkhole', nameTh: 'หลุมยุบ', description: 'ศัตรู 1 ตัว 60% ATK + 60% MATK ธาตุดิน และ 20% ถูกรัด 1 เทิร์น',
    kind: 'ACTIVE', element: 'EARTH', rate: 25, cooldown: 2, mp: 14, target: 'ENEMY', ranged: true,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { atk: 0.6, matk: 0.6 } },
      { kind: 'STATUS', status: 'ROOT', turns: 1, chance: 0.2 },
    ],
  }),
  sandstorm: S({
    id: 'sandstorm', name: 'Sandstorm', nameTh: 'พายุทราย', description: 'ศัตรู 1 ตัว 60% ATK + 60% MATK ธาตุดิน และความแม่นยำ −20% 3 เทิร์น',
    kind: 'ACTIVE', element: 'EARTH', rate: 25, cooldown: 2, mp: 14, target: 'ENEMY', ranged: true,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { atk: 0.6, matk: 0.6 } },
      { kind: 'BUFF', stat: 'hit', pct: -0.2, turns: 3 },
    ],
  }),
  snowstorm: S({
    id: 'snowstorm', name: 'Snowstorm', nameTh: 'พายุหิมะ', description: 'ศัตรู 1 ตัว 60% ATK + 60% MATK ธาตุน้ำ และ 15% แช่แข็ง',
    kind: 'ACTIVE', element: 'WATER', rate: 25, cooldown: 2, mp: 14, target: 'ENEMY', ranged: true,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { atk: 0.6, matk: 0.6 } },
      { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.15 },
    ],
  }),
  wind_blast: S({
    id: 'wind_blast', name: 'Wind Blast', nameTh: 'ลมกรรโชก', description: 'ศัตรู 1 ตัว 60% ATK + 60% MATK และ 40% ช้าลง 30% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 2, mp: 14, target: 'ENEMY', ranged: true,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { atk: 0.6, matk: 0.6 } },
      { kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.3, chance: 0.4 },
    ],
  }),
  natures_wrath: S({
    id: 'natures_wrath', name: "Nature's Wrath", nameTh: 'ธรรมชาติพิโรธ', description: 'ถูกโจมตีโดน: 25% ธรรมชาติตอบโต้ 50% ATK + 50% MATK ธาตุดิน',
    kind: 'REACTIVE', trigger: 'COUNTER', element: 'EARTH', rate: 25, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { atk: 0.5, matk: 0.5 } }],
  }),

  // ---------------------------------------------------------------- Summoner (FFT, 2026-09-27): summons are big spells on a side
  moogle: S({
    id: 'moogle', name: 'Moogle', nameTh: 'อัญเชิญโมเกิ้ล', description: 'เพื่อน HP < 60%: ฟื้น HP ทั้งทีม 60% MATK + 20',
    kind: 'ACTIVE', element: 'HOLY', rate: 35, cooldown: 3, mp: 30, target: 'ALL_ALLIES', condition: 'ALLY_HP_BELOW_60', priority: 3,
    effects: [{ kind: 'HEAL', scaling: { matk: 0.6 }, flat: 20 }],
  }),
  shiva: S({
    id: 'shiva', name: 'Shiva', nameTh: 'อัญเชิญชีวา', description: 'ศัตรูทุกตัว 115% MATK น้ำแข็ง และ 15% แช่แข็ง',
    kind: 'ACTIVE', element: 'WATER', rate: 25, cooldown: 3, mp: 50, target: 'ALL_ENEMIES', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.15 } },
      { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.15 },
    ],
  }),
  ramuh: S({
    id: 'ramuh', name: 'Ramuh', nameTh: 'อัญเชิญรามู', description: 'ศัตรูทุกตัว 120% MATK สายฟ้า และ 10% มึน',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 25, cooldown: 3, mp: 50, target: 'ALL_ENEMIES', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.2 } },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.1 },
    ],
  }),
  ifrit: S({
    id: 'ifrit', name: 'Ifrit', nameTh: 'อัญเชิญอิฟริท', description: 'ศัตรูทุกตัว 115% MATK ไฟ และ 25% ติดไฟ',
    kind: 'ACTIVE', element: 'FIRE', rate: 25, cooldown: 3, mp: 50, target: 'ALL_ENEMIES', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.15 } },
      { kind: 'STATUS', status: 'BURN', turns: 3, chance: 0.25 },
    ],
  }),
  bahamut: S({
    id: 'bahamut', name: 'Bahamut', nameTh: 'อัญเชิญบาฮามุท', description: 'ราชามังกรเผาศัตรูทุกตัว 200% MATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 20, cooldown: 6, mp: 90, target: 'ALL_ENEMIES', priority: 3,
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 2 } }],
  }),
  critical_recover_mp: S({
    id: 'critical_recover_mp', name: 'Critical: Recover MP', nameTh: 'วิกฤต: ฟื้นมานา', description: 'HP ตกต่ำกว่า 30%: 60% ฟื้น MP เต็ม',
    kind: 'REACTIVE', trigger: 'ON_LOW_HP', element: 'NEUTRAL', rate: 60, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'RESTORE_MP', pct: 1 }],
  }),

  // ---------------------------------------------------------------- Time Mage (FFT, 2026-09-27)
  haste: S({
    id: 'haste', name: 'Haste', nameTh: 'เร่งเวลา', description: 'เพื่อนที่ตีแรงสุด (รวมตัวเอง) ได้เล่น 2 ครั้งต่อรอบ 2 รอบ',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 3, mp: 18, target: 'ALLY_STRONGEST', priority: 2,
    effects: [{ kind: 'STATUS', status: 'HASTE', turns: 4 }],
  }),
  hastega: S({
    id: 'hastega', name: 'Hastega', nameTh: 'เร่งเวลาหมู่', description: 'ทั้งทีมได้เล่น 2 ครั้งต่อรอบ 2 รอบ',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 20, cooldown: 5, mp: 40, target: 'ALL_ALLIES', condition: 'HAS_ALLY', priority: 2,
    effects: [{ kind: 'STATUS', status: 'HASTE', turns: 4 }],
  }),
  slow: S({
    id: 'slow', name: 'Slow', nameTh: 'หน่วงเวลา', description: 'ศัตรู 1 ตัว 80%: ช้าลง 30% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 10, target: 'ENEMY',
    effects: [{ kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.3, chance: 0.8 }],
  }),
  slowga: S({
    id: 'slowga', name: 'Slowga', nameTh: 'หน่วงเวลาหมู่', description: 'ศัตรู ≥ 2: ทุกตัว 50% ช้าลง 30% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 22, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS',
    effects: [{ kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.3, chance: 0.5 }],
  }),
  stop: S({
    id: 'stop', name: 'Stop', nameTh: 'หยุดเวลา', description: 'ศัตรู 1 ตัว 35%: หยุดนิ่ง 2 เทิร์น (บอสโอกาสครึ่งเดียว)',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 20, cooldown: 4, mp: 24, target: 'ENEMY', priority: 1,
    effects: [{ kind: 'STATUS', status: 'STOP', turns: 2, chance: 0.35 }],
  }),
  quick: S({
    id: 'quick', name: 'Quick', nameTh: 'เวลาเร่งด่วน', description: 'มีเพื่อน: เพื่อนที่ตีแรงสุดได้เล่นอีกเทิร์นทันที',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 3, mp: 18, target: 'OTHER_ALLY', condition: 'HAS_ALLY', priority: 3,
    effects: [{ kind: 'QUICK' }],
  }),
  graviga: S({
    id: 'graviga', name: 'Graviga', nameTh: 'แรงโน้มถ่วง', description: 'บดศัตรูทุกตัว 90% MATK และ 20% มึน 1 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 36, target: 'ALL_ENEMIES',
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 0.9 } },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.2 },
    ],
  }),

  // ---------------------------------------------------------------- Monk (FFT, 2026-09-27)
  pummel: S({
    id: 'pummel', name: 'Pummel', nameTh: 'รัวหมัด', description: 'รัวหมัดใส่ศัตรู 1 ตัว 1–4 ครั้ง ครั้งละ 50% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 1, mp: 10, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.5 }, hits: 1, hitsMax: 4 }],
  }),
  aurablast: S({
    id: 'aurablast', name: 'Aurablast', nameTh: 'คลื่นปราณ', description: 'ปล่อยคลื่นปราณใส่ศัตรู 1 ตัว (ถึงแถวหลัง) 140% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 2, mp: 16, target: 'ENEMY', ranged: true, priority: 1,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.4 } }],
  }),
  chakra: S({
    id: 'chakra', name: 'Chakra', nameTh: 'จักระ', description: 'เพื่อนมี HP < 60%: ฟื้น HP ทั้งทีม 20% ATK + 10 และ MP 5%',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 4, mp: 0, target: 'ALL_ALLIES', condition: 'ALLY_HP_BELOW_60', priority: 3,
    effects: [{ kind: 'HEAL', scaling: { atk: 0.2 }, flat: 10, mpPct: 0.05 }],
  }),
  purification: S({
    id: 'purification', name: 'Purification', nameTh: 'ชำระล้าง', description: 'เพื่อนติดสถานะผิดปกติ: ล้างสถานะร้ายทั้งทีม',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 45, cooldown: 2, mp: 10, target: 'ALL_ALLIES', condition: 'ALLY_DEBUFFED', priority: 4,
    effects: [{ kind: 'CLEANSE' }],
  }),
  first_strike: S({
    id: 'first_strike', name: 'First Strike', nameTh: 'ชิงลงมือ', description: 'ศัตรูเข้าประชิดจะโจมตี: 15% ต่อยสวนก่อน 70% ATK',
    kind: 'REACTIVE', trigger: 'FIRST_STRIKE', element: 'NEUTRAL', rate: 15, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.7 } }],
  }),

  // ---------------------------------------------------------------- Thief (FFT, 2026-09-27; class id ASSASSIN)
  steal_gil: S({
    id: 'steal_gil', name: 'Steal Gil', nameTh: 'ฉกเงิน', description: '90% ATK และขโมยทองจากมอนสเตอร์ (ตัวละครั้ง ได้เมื่อชนะ)',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 35, cooldown: 2, mp: 8, target: 'ENEMY', priority: 1,
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.9 } },
      { kind: 'STEAL_GOLD', pct: 1 },
    ],
  }),
  vanish: S({
    id: 'vanish', name: 'Vanish', nameTh: 'หายตัวจู่โจม', description: 'หายตัวไปโผล่ข้างศัตรู 50% ATK + 300% ความเร็ว หลบไม่ได้',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 20, target: 'ENEMY', unavoidable: true, priority: 2,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.5, speed: 3 } }],
  }),
  steal_heart: S({
    id: 'steal_heart', name: 'Steal Heart', nameTh: 'ขโมยหัวใจ', description: 'มัดใจศัตรู 1 ตัว 70% ทำให้ช้าลง 30% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 16, target: 'ENEMY', priority: 1,
    effects: [{ kind: 'STATUS', status: 'SLOW', turns: 3, potency: 0.3, chance: 0.7 }],
  }),
  double_attack: S({
    id: 'double_attack', name: 'Double Attack', nameTh: 'ฟันสองจังหวะ', description: 'โจมตีศัตรู 1 ตัว 2 ครั้ง ครั้งละ 70% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 1, mp: 10, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.7 }, hits: 2 }],
  }),
  perfect_dodge: S({
    id: 'perfect_dodge', name: 'Perfect Dodge', nameTh: 'หลบสมบูรณ์', description: 'ถูกโจมตี (กายภาพหรือเวท): 20% กระโดดหลบพ้น',
    kind: 'REACTIVE', trigger: 'EVADE', element: 'NEUTRAL', rate: 20, cooldown: 0, mp: 0, target: 'SELF',
    effects: [],
  }),

  // ---------------------------------------------------------------- Archer (FFT, 2026-09-27; class id RANGER)
  aim: S({
    id: 'aim', name: 'Aim', nameTh: 'เล็งเป้า', description: 'เล็งยิงศัตรู 1 ตัว 130% ATK คริติคอลแน่นอน',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 18, target: 'ENEMY', ranged: true, priority: 2,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.3 }, forceCrit: true }],
  }),
  arrow_rain: S({
    id: 'arrow_rain', name: 'Arrow Rain', nameTh: 'ฝนธนู', description: 'ศัตรู ≥ 2: ยิงศัตรูทุกตัว 100% ATK (เท่าโจมตีธรรมดา)',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 24, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', ranged: true, priority: 1,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } }],
  }),
  double_shot: S({
    id: 'double_shot', name: 'Double Shot', nameTh: 'ยิงสองดอก', description: 'ยิงศัตรู 1 ตัว 2 ดอก ดอกละ 75% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 1, mp: 12, target: 'ENEMY', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.75 }, hits: 2 }],
  }),
  adrenaline_rush: S({
    id: 'adrenaline_rush', name: 'Adrenaline Rush', nameTh: 'อะดรีนาลีนพุ่ง', description: 'ถูกโจมตีโดน: 30% ความเร็ว +30% 3 เทิร์น',
    kind: 'REACTIVE', trigger: 'ON_HIT', element: 'NEUTRAL', rate: 30, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'BUFF', stat: 'speed', pct: 0.3, turns: 3, self: true }],
  }),

  // ---------------------------------------------------------------- Sorcerer (legacy kit, still used by monsters/tests)
  fireball: S({
    id: 'fireball', name: 'Fireball', nameTh: 'ลูกไฟทำลายล้าง', description: 'ศัตรูทุกตัว 150% MATK ไฟ + 30% ติดไฟ 2 เทิร์น',
    kind: 'ACTIVE', element: 'FIRE', rate: 30, cooldown: 2, mp: 32, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', priority: 2,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.5 } },
      { kind: 'STATUS', status: 'BURN', turns: 2, chance: 0.3, potency: 0.3 },
    ],
  }),
  chain_lightning: S({
    id: 'chain_lightning', name: 'Chain Lightning', nameTh: 'สายฟ้าต่อเนื่อง', description: '200% MATK ชิ่ง 3 ตัว (ลด 15%/ตัว)',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 30, cooldown: 2, mp: 38, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 2 }, chain: { jumps: 3, falloff: 0.15 } }],
  }),
  frost_nova: S({
    id: 'frost_nova', name: 'Frost Nova', nameTh: 'ระเบิดน้ำแข็ง', description: '130% MATK น้ำ และ 35% แช่แข็ง 1 เทิร์น',
    kind: 'ACTIVE', element: 'WATER', rate: 25, cooldown: 3, mp: 28, target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.3 } },
      { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.35 },
    ],
  }),
  mana_shield: S({
    id: 'mana_shield', name: 'Mana Shield', nameTh: 'โล่มานา', description: 'HP ต่ำกว่า 60%: เกราะ 30% Max HP 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 40, cooldown: 5, mp: 24, target: 'SELF', condition: 'SELF_HP_BELOW_60', priority: 4,
    effects: [{ kind: 'SHIELD', pctMaxHp: 0.3, turns: 3 }],
  }),

  // ---------------------------------------------------------------- Assassin
  shadow_step: S({
    id: 'shadow_step', name: 'Shadow Step', nameTh: 'ก้าวผ่านเงา', description: 'จู่โจมแถวหลัง 150% ATK Critical แน่นอน',
    kind: 'ACTIVE', element: 'SHADOW', rate: 30, cooldown: 2, mp: 20, target: 'ENEMY_BACK',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.5 }, forceCrit: true }],
  }),
  poison_blade: S({
    id: 'poison_blade', name: 'Poison Blade', nameTh: 'คมดาบยาพิษ', description: '100% ATK และ 70% ติดพิษ 5% Max HP/เทิร์น 3 เทิร์น',
    kind: 'ACTIVE', element: 'SHADOW', rate: 35, cooldown: 2, mp: 18, target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } },
      { kind: 'STATUS', status: 'POISON', turns: 3, chance: 0.7, potency: 0.05 },
    ],
  }),
  shadow_assist: S({
    id: 'shadow_assist', name: 'Shadow Assist', nameTh: 'เงาซ้ำเติม', description: 'เพื่อนโจมตีโดน: 30% ตามตีซ้ำ 70% ATK',
    kind: 'REACTIVE', trigger: 'ASSIST', element: 'SHADOW', rate: 30, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.7 } }],
  }),
  evasion_mastery: S({
    id: 'evasion_mastery', name: 'Evasion Mastery', nameTh: 'หลบหลีกเชี่ยวชาญ', description: 'หลบสำเร็จ: 50% สวนกลับ 80% ATK',
    kind: 'REACTIVE', trigger: 'ON_DODGE', element: 'NEUTRAL', rate: 50, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }],
  }),

  // ---------------------------------------------------------------- Cleric
  holy_heal: S({
    id: 'holy_heal', name: 'Holy Heal', nameTh: 'ละอองแสงเยียวยา', description: 'เพื่อน HP ต่ำกว่า 60%: ฟื้นฟูทั้งปาร์ตี้ 120% MATK + 40',
    kind: 'ACTIVE', element: 'HOLY', rate: 50, cooldown: 2, mp: 30, target: 'ALL_ALLIES', condition: 'ALLY_HP_BELOW_60', priority: 6,
    effects: [{ kind: 'HEAL', scaling: { matk: 1.2 }, flat: 40 }],
  }),
  blessing_of_light: S({
    id: 'blessing_of_light', name: 'Blessing of Light', nameTh: 'พรแห่งแสง', description: 'ATK, DEF, Speed ทั้งปาร์ตี้ +20% 3 เทิร์น',
    kind: 'ACTIVE', element: 'HOLY', rate: 25, cooldown: 6, mp: 45, target: 'ALL_ALLIES', priority: 1,
    effects: [
      { kind: 'BUFF', stat: 'atk', pct: 0.2, turns: 3 },
      { kind: 'BUFF', stat: 'def', pct: 0.2, turns: 3 },
      { kind: 'BUFF', stat: 'speed', pct: 0.2, turns: 3 },
    ],
  }),
  smite: S({
    id: 'smite', name: 'Smite', nameTh: 'พิพากษา', description: '160% MATK ธาตุศักดิ์สิทธิ์',
    kind: 'ACTIVE', element: 'HOLY', rate: 30, cooldown: 1, mp: 20, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.6 } }],
  }),
  divine_grace: S({
    id: 'divine_grace', name: 'Last Prayer', nameTh: 'คำอธิษฐานสุดท้าย', description: 'เพื่อนตาย: 60% ปาร์ตี้ได้เกราะ 25% Max HP',
    kind: 'REACTIVE', trigger: 'ON_ALLY_DEATH', element: 'HOLY', rate: 60, cooldown: 0, mp: 0, target: 'ALL_ALLIES',
    effects: [{ kind: 'SHIELD', pctMaxHp: 0.25, turns: 3 }],
  }),

  // ---------------------------------------------------------------- Ranger
  snipe_shot: S({
    id: 'snipe_shot', name: 'Snipe Shot', nameTh: 'ศรเพชฌฆาต', description: 'ยิงแถวหลัง 260% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 28, target: 'ENEMY_BACK', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 2.6 } }],
  }),
  multi_shot: S({
    id: 'multi_shot', name: 'Arrow Rain', nameTh: 'ฝนธนู', description: 'ศัตรูทุกตัว 90% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 2, mp: 26, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.9 } }],
  }),
  covering_fire: S({
    id: 'covering_fire', name: 'Covering Fire', nameTh: 'ยิงสนับสนุน', description: 'เพื่อนโจมตีโดน: 35% ยิงตาม 80% ATK',
    kind: 'REACTIVE', trigger: 'ASSIST', element: 'NEUTRAL', rate: 35, cooldown: 0, mp: 0, target: 'ENEMY', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }],
  }),
  hunter_mark: S({
    id: 'hunter_mark', name: 'Hunter Mark', nameTh: 'เครื่องหมายนักล่า', description: 'ศัตรู HP ต่ำสุด 180% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 20, target: 'ENEMY_LOWEST_HP', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.8 } }],
  }),

  // ---------------------------------------------------------------- Monster
  monster_counter: S({
    id: 'monster_counter', name: 'Counter', nameTh: 'สวนกลับ', description: 'ถูกตี: 20% สวนกลับ 60% ATK',
    kind: 'REACTIVE', trigger: 'COUNTER', element: 'NEUTRAL', rate: 20, cooldown: 0, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.6 } }],
  }),
  goblin_frenzy: S({
    id: 'goblin_frenzy', name: 'Frenzy', nameTh: 'คลั่ง', description: 'พวกตาย: 50% ATK +30% 3 เทิร์น',
    kind: 'REACTIVE', trigger: 'ON_ALLY_DEATH', element: 'NEUTRAL', rate: 50, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'BUFF', stat: 'atk', pct: 0.3, turns: 3, self: true }],
  }),
  water_splash: S({
    id: 'water_splash', name: 'Splash', nameTh: 'สาดน้ำ', description: '120% MATK น้ำ',
    kind: 'ACTIVE', element: 'WATER', rate: 30, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.2 } }],
  }),
  fire_breath: S({
    id: 'fire_breath', name: 'Fire Breath', nameTh: 'พ่นไฟ', description: '100% MATK ไฟทุกตัว + ติดไฟ',
    kind: 'ACTIVE', element: 'FIRE', rate: 30, cooldown: 2, mp: 0, target: 'ALL_ENEMIES',
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1 } },
      { kind: 'STATUS', status: 'BURN', turns: 2, chance: 0.4, potency: 0.3 },
    ],
  }),
  shadow_bite: S({
    id: 'shadow_bite', name: 'Shadow Bite', nameTh: 'กัดเงา', description: '130% ATK และ 30% เลือดไหล',
    kind: 'ACTIVE', element: 'SHADOW', rate: 30, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.3 } },
      { kind: 'STATUS', status: 'BLEED', turns: 2, chance: 0.3, potency: 0.04 },
    ],
  }),

  // ---------------------------------------------------------------- Monster signature skills
  // Each monster lists its skills in unlock order; how many it uses depends on its level
  // (monsterSkillSlots). Generic fillers: monster_counter, monster_guard, monster_rage.
  monster_guard: S({
    id: 'monster_guard', name: 'Hunker Down', nameTh: 'หดตัวป้องกัน', description: 'HP ต่ำกว่า 60%: เกราะ 15% Max HP 2 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 4, mp: 0, target: 'SELF', condition: 'SELF_HP_BELOW_60', priority: 4,
    effects: [{ kind: 'SHIELD', pctMaxHp: 0.15, turns: 2 }],
  }),
  monster_rage: S({
    id: 'monster_rage', name: 'Cornered', nameTh: 'จนตรอกฮึดสู้', description: 'HP ต่ำกว่า 30%: ATK/MATK +30% 3 เทิร์น',
    kind: 'REACTIVE', trigger: 'ON_LOW_HP', element: 'NEUTRAL', rate: 100, cooldown: 0, mp: 0, target: 'SELF', oncePerBattle: true,
    effects: [{ kind: 'BUFF', stat: 'atk', pct: 0.3, turns: 3, self: true }, { kind: 'BUFF', stat: 'matk', pct: 0.3, turns: 3, self: true }],
  }),
  slime_bounce: S({
    id: 'slime_bounce', name: 'Bounce', nameTh: 'เด้งดึ๋ง', description: '90% ATK และ 20% ทำให้ช้าลง',
    kind: 'ACTIVE', element: 'WATER', rate: 30, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.9 } }, { kind: 'STATUS', status: 'SLOW', turns: 1, chance: 0.2, potency: 0.3 }],
  }),
  pigeon_peck: S({
    id: 'pigeon_peck', name: 'Flock Peck', nameTh: 'จิกรุม', description: 'จิก 2 ครั้ง ครั้งละ 55% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 35, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.55 }, hits: 2 }],
  }),
  rat_nibble: S({
    id: 'rat_nibble', name: 'Nibble', nameTh: 'แทะ', description: '80% ATK และ 30% เลือดไหล',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }, { kind: 'STATUS', status: 'BLEED', turns: 2, chance: 0.3, potency: 0.03 }],
  }),
  cat_pounce: S({
    id: 'cat_pounce', name: 'Roof Pounce', nameTh: 'กระโจนจากหลังคา', description: 'จู่โจมแถวหลัง 120% ATK',
    kind: 'ACTIVE', element: 'SHADOW', rate: 30, cooldown: 2, mp: 0, target: 'ENEMY_BACK',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.2 } }],
  }),
  ant_bite: S({
    id: 'ant_bite', name: 'Acid Bite', nameTh: 'กัดกรดมด', description: '70% ATK และ 40% ติดพิษ',
    kind: 'ACTIVE', element: 'EARTH', rate: 30, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.7 } }, { kind: 'STATUS', status: 'POISON', turns: 3, chance: 0.4, potency: 0.03 }],
  }),
  scarecrow_hex: S({
    id: 'scarecrow_hex', name: 'Straw Hex', nameTh: 'คำสาปฟาง', description: '100% MATK และ 40% ทำให้ช้าลง 2 เทิร์น',
    kind: 'ACTIVE', element: 'SHADOW', rate: 30, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1 } }, { kind: 'STATUS', status: 'SLOW', turns: 2, chance: 0.4, potency: 0.3 }],
  }),
  gecko_call: S({
    id: 'gecko_call', name: 'Tokay Call', nameTh: 'ร้องตุ๊กแก', description: '80% ATK และ 25% มึน 1 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }, { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.25 }],
  }),
  leaf_whirl: S({
    id: 'leaf_whirl', name: 'Leaf Whirl', nameTh: 'พายุใบไม้', description: 'ทุกตัว 70% MATK ธาตุดิน',
    kind: 'ACTIVE', element: 'EARTH', rate: 25, cooldown: 2, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 0.7 } }],
  }),
  firefly_flash: S({
    id: 'firefly_flash', name: 'Wisp Flash', nameTh: 'แสงพรายวูบ', description: '110% MATK สายฟ้า และ 20% มึน',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 30, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.1 } }, { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.2 }],
  }),
  tuktuk_ram: S({
    id: 'tuktuk_ram', name: 'Three-Wheel Ram', nameTh: 'พุ่งชนสามล้อ', description: '140% ATK และ 25% มึน',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 28, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.4 } }, { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.25 }],
  }),
  songthaew_horn: S({
    id: 'songthaew_horn', name: 'Blaring Horn', nameTh: 'บีบแตรลั่น', description: 'ทุกตัว 40% ATK และ 30% ทำให้ช้าลง',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 22, cooldown: 3, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.4 } }, { kind: 'STATUS', status: 'SLOW', turns: 2, chance: 0.3, potency: 0.3 }],
  }),
  crab_pinch: S({
    id: 'crab_pinch', name: 'Pincer Grip', nameTh: 'ก้ามหนีบ', description: '110% ATK + 80% DEF',
    kind: 'ACTIVE', element: 'WATER', rate: 30, cooldown: 1, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.1, def: 0.8 } }],
  }),
  lantern_flare: S({
    id: 'lantern_flare', name: 'Lantern Flare', nameTh: 'โคมลุกโชน', description: 'ทุกตัว 90% MATK ไฟ และ 30% ติดไฟ',
    kind: 'ACTIVE', element: 'FIRE', rate: 28, cooldown: 2, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 0.9 } }, { kind: 'STATUS', status: 'BURN', turns: 2, chance: 0.3, potency: 0.3 }],
  }),
  bat_screech: S({
    id: 'bat_screech', name: 'Neon Screech', nameTh: 'กรีดร้องนีออน', description: 'ทุกตัว 50% MATK สายฟ้า และ 40% ช้าลง',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 20, cooldown: 3, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 0.5 } }, { kind: 'STATUS', status: 'SLOW', turns: 2, chance: 0.4, potency: 0.3 }],
  }),
  python_squeeze: S({
    id: 'python_squeeze', name: 'Constrict', nameTh: 'รัดกระดูก', description: '120% ATK และ 35% ถูกรัด 1 เทิร์น',
    kind: 'ACTIVE', element: 'WATER', rate: 28, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.2 } }, { kind: 'STATUS', status: 'ROOT', turns: 1, chance: 0.35 }],
  }),
  krasue_glow: S({
    id: 'krasue_glow', name: 'Eerie Glow', nameTh: 'แสงผีกระสือ', description: '150% MATK เงา และ 30% เลือดไหล',
    kind: 'ACTIVE', element: 'SHADOW', rate: 30, cooldown: 2, mp: 0, target: 'ENEMY_LOWEST_HP',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.5 } }, { kind: 'STATUS', status: 'BLEED', turns: 2, chance: 0.3, potency: 0.04 }],
  }),
  wraith_chill: S({
    id: 'wraith_chill', name: 'Mountain Chill', nameTh: 'หมอกเยือกแข็ง', description: '130% MATK น้ำ และ 25% แช่แข็ง',
    kind: 'ACTIVE', element: 'WATER', rate: 28, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.3 } }, { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.25 }],
  }),
  root_snare: S({
    id: 'root_snare', name: 'Root Snare', nameTh: 'รากตรึง', description: '100% ATK และ 30% ถูกรัด',
    kind: 'ACTIVE', element: 'EARTH', rate: 28, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1 } }, { kind: 'STATUS', status: 'ROOT', turns: 1, chance: 0.3 }],
  }),
  elephant_stomp: S({
    id: 'elephant_stomp', name: 'Ancient Stomp', nameTh: 'กระทืบธรณี', description: 'ทุกตัว 110% ATK และ 20% มึน',
    kind: 'ACTIVE', element: 'EARTH', rate: 25, cooldown: 3, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.1 } }, { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.2 }],
  }),
  mannequin_pose: S({
    id: 'mannequin_pose', name: 'Frozen Pose', nameTh: 'โพสนิ่งจ้อง', description: 'DEF +40% 2 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 3, mp: 0, target: 'SELF',
    effects: [{ kind: 'BUFF', stat: 'def', pct: 0.4, turns: 2, self: true }],
  }),
  price_tag_toss: S({
    id: 'price_tag_toss', name: 'Price Tag Toss', nameTh: 'ปาป้ายราคา', description: 'ทุกตัว 80% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }],
  }),
  flash_sale: S({
    id: 'flash_sale', name: 'Flash Sale', nameTh: 'แฟลชเซล', description: 'ความเร็วตัวเอง +40% 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 4, mp: 0, target: 'SELF', priority: 2,
    effects: [{ kind: 'BUFF', stat: 'speed', pct: 0.4, turns: 3, self: true }],
  }),
  guardian_mace: S({
    id: 'guardian_mace', name: 'Guardian Mace', nameTh: 'กระบองทวารบาล', description: '160% ATK และ 30% มึน',
    kind: 'ACTIVE', element: 'EARTH', rate: 30, cooldown: 2, mp: 0, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.6 } }, { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.3 }],
  }),
  gate_roar: S({
    id: 'gate_roar', name: 'Gate Roar', nameTh: 'คำรามหน้าประตู', description: 'ทุกตัว 90% MATK และ 40% ช้าลง',
    kind: 'ACTIVE', element: 'HOLY', rate: 25, cooldown: 3, mp: 0, target: 'ALL_ENEMIES',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 0.9 } }, { kind: 'STATUS', status: 'SLOW', turns: 2, chance: 0.4, potency: 0.3 }],
  }),
};
