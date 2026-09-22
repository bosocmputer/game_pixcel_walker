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
  quick_strike: S({
    id: 'quick_strike', name: 'Quick Strike', nameTh: 'ฟันรวดเร็ว', description: 'ฟัน 2 ครั้ง ครั้งละ 75% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 35, cooldown: 1, mp: 4, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.75 }, hits: 2 }],
  }),
  first_aid: S({
    id: 'first_aid', name: 'First Aid', nameTh: 'ปฐมพยาบาล', description: 'HP ต่ำกว่า 60%: ฟื้นฟู 12% Max HP + 15',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 45, cooldown: 3, mp: 6, target: 'SELF', priority: 5, condition: 'SELF_HP_BELOW_60',
    effects: [{ kind: 'HEAL', scaling: { maxHp: 0.12 }, flat: 15 }],
  }),
  lucky_dodge: S({
    id: 'lucky_dodge', name: 'Lucky Step', nameTh: 'ก้าวเฮง', description: 'หลบสำเร็จ: ความเร็ว +20% 2 เทิร์น',
    kind: 'REACTIVE', trigger: 'ON_DODGE', element: 'NEUTRAL', rate: 100, cooldown: 0, mp: 0, target: 'SELF',
    effects: [{ kind: 'BUFF', stat: 'speed', pct: 0.2, turns: 2, self: true }],
  }),

  // ---------------------------------------------------------------- Knight
  shield_bash: S({
    id: 'shield_bash', name: 'Shield Bash', nameTh: 'กระแทกโล่', description: '120% ATK + 150% DEF และ 60% Stun 1 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 10, target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.2, def: 1.5 } },
      { kind: 'STATUS', status: 'STUN', turns: 1, chance: 0.6 },
    ],
  }),
  taunt: S({
    id: 'taunt', name: 'Taunt', nameTh: 'คำรามดึงความสนใจ', description: 'บังคับศัตรูตีตัวเอง 2 เทิร์น และ DEF +30%',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 4, mp: 12, target: 'SELF', priority: 3,
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
    kind: 'ACTIVE', element: 'FIRE', rate: 30, cooldown: 2, mp: 20, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', priority: 2,
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.5 } },
      { kind: 'STATUS', status: 'BURN', turns: 2, chance: 0.3, potency: 0.3 },
    ],
  }),
  chain_lightning: S({
    id: 'chain_lightning', name: 'Chain Lightning', nameTh: 'สายฟ้าต่อเนื่อง', description: '200% MATK ชิ่ง 3 ตัว (ลด 15%/ตัว)',
    kind: 'ACTIVE', element: 'LIGHTNING', rate: 30, cooldown: 2, mp: 25, target: 'ENEMY',
    effects: [{ kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 2 }, chain: { jumps: 3, falloff: 0.15 } }],
  }),
  frost_nova: S({
    id: 'frost_nova', name: 'Frost Nova', nameTh: 'ระเบิดน้ำแข็ง', description: '130% MATK น้ำ และ 35% แช่แข็ง 1 เทิร์น',
    kind: 'ACTIVE', element: 'WATER', rate: 25, cooldown: 3, mp: 18, target: 'ENEMY',
    effects: [
      { kind: 'DAMAGE', type: 'MAGIC', scaling: { matk: 1.3 } },
      { kind: 'STATUS', status: 'FREEZE', turns: 1, chance: 0.35 },
    ],
  }),
  mana_shield: S({
    id: 'mana_shield', name: 'Mana Shield', nameTh: 'โล่มานา', description: 'HP ต่ำกว่า 60%: เกราะ 30% Max HP 3 เทิร์น',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 40, cooldown: 5, mp: 15, target: 'SELF', condition: 'SELF_HP_BELOW_60', priority: 4,
    effects: [{ kind: 'SHIELD', pctMaxHp: 0.3, turns: 3 }],
  }),

  // ---------------------------------------------------------------- Assassin
  shadow_step: S({
    id: 'shadow_step', name: 'Shadow Step', nameTh: 'ก้าวผ่านเงา', description: 'จู่โจมแถวหลัง 150% ATK Critical แน่นอน',
    kind: 'ACTIVE', element: 'SHADOW', rate: 30, cooldown: 2, mp: 12, target: 'ENEMY_BACK',
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 1.5 }, forceCrit: true }],
  }),
  poison_blade: S({
    id: 'poison_blade', name: 'Poison Blade', nameTh: 'คมดาบยาพิษ', description: '100% ATK และ 70% ติดพิษ 5% Max HP/เทิร์น 3 เทิร์น',
    kind: 'ACTIVE', element: 'SHADOW', rate: 35, cooldown: 2, mp: 10, target: 'ENEMY',
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
    kind: 'ACTIVE', element: 'HOLY', rate: 50, cooldown: 2, mp: 20, target: 'ALL_ALLIES', condition: 'ALLY_HP_BELOW_60', priority: 6,
    effects: [{ kind: 'HEAL', scaling: { matk: 1.2 }, flat: 40 }],
  }),
  blessing_of_light: S({
    id: 'blessing_of_light', name: 'Blessing of Light', nameTh: 'พรแห่งแสง', description: 'ATK, DEF, Speed ทั้งปาร์ตี้ +20% 3 เทิร์น',
    kind: 'ACTIVE', element: 'HOLY', rate: 25, cooldown: 6, mp: 30, target: 'ALL_ALLIES', priority: 1,
    effects: [
      { kind: 'BUFF', stat: 'atk', pct: 0.2, turns: 3 },
      { kind: 'BUFF', stat: 'def', pct: 0.2, turns: 3 },
      { kind: 'BUFF', stat: 'speed', pct: 0.2, turns: 3 },
    ],
  }),
  smite: S({
    id: 'smite', name: 'Smite', nameTh: 'พิพากษา', description: '160% MATK ธาตุศักดิ์สิทธิ์',
    kind: 'ACTIVE', element: 'HOLY', rate: 30, cooldown: 1, mp: 12, target: 'ENEMY',
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
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 18, target: 'ENEMY_BACK', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 2.6 } }],
  }),
  multi_shot: S({
    id: 'multi_shot', name: 'Arrow Rain', nameTh: 'ฝนธนู', description: 'ศัตรูทุกตัว 90% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 25, cooldown: 2, mp: 16, target: 'ALL_ENEMIES', condition: 'ENEMY_COUNT_2PLUS', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.9 } }],
  }),
  covering_fire: S({
    id: 'covering_fire', name: 'Covering Fire', nameTh: 'ยิงสนับสนุน', description: 'เพื่อนโจมตีโดน: 35% ยิงตาม 80% ATK',
    kind: 'REACTIVE', trigger: 'ASSIST', element: 'NEUTRAL', rate: 35, cooldown: 0, mp: 0, target: 'ENEMY', ranged: true,
    effects: [{ kind: 'DAMAGE', type: 'PHYSICAL', scaling: { atk: 0.8 } }],
  }),
  hunter_mark: S({
    id: 'hunter_mark', name: 'Hunter Mark', nameTh: 'เครื่องหมายนักล่า', description: 'ศัตรู HP ต่ำสุด 180% ATK',
    kind: 'ACTIVE', element: 'NEUTRAL', rate: 30, cooldown: 2, mp: 12, target: 'ENEMY_LOWEST_HP', ranged: true,
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
};
