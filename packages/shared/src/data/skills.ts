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

  // ---------------------------------------------------------------- Sorcerer
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
