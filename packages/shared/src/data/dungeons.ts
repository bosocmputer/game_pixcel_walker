/**
 * Instanced party dungeons (MASTER_SPEC §8B). Opened from the party panel anywhere on the map,
 * solo or with up to PARTY_MAX players. Waves are fixed; each wave rolls a modifier. The last wave
 * is the boss (HP/ATK scale with party size via bossHpScale/bossAtkScale).
 * Boss dungeons reuse the landmark boss waves (same balance as the solo landmark fight).
 * The Park Treant is a raid boss (recommended 4–8) — it waits for bigger parties.
 */
import type { WaveDef } from '../combat/dungeon';

export interface DungeonDef {
  id: string;
  nameTh: string;
  icon: string;
  /** Every member must be at least this level. */
  minLevel: number;
  /** Suggested level range shown in the UI. */
  recLevel: [number, number];
  descTh: string;
  waves: WaveDef[];
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'ghost_alley',
    nameTh: 'ตรอกหมาผี',
    icon: '🐕',
    minLevel: 1,
    recLevel: [3, 8],
    descTh: 'ตรอกมืดหลังคูเมือง หนูซอยเป็นลูกสมุน ฝูงวิญญาณหมาซอยรออยู่ท้ายซอย',
    waves: [
      { monsterIds: ['alley_rat', 'alley_rat'] },
      { monsterIds: ['alley_rat', 'soi_dog_spirit', 'alley_rat'] },
      { monsterIds: ['soi_dog_spirit', 'soi_dog_spirit', 'soi_dog_spirit'] },
    ],
  },
  {
    id: 'goblin_backroom',
    nameTh: 'โกดังหลังร้านของพญาก็อบลิน',
    icon: '👺',
    minLevel: 8,
    recLevel: [10, 15],
    descTh: 'ทางลับหลังตู้แช่ พาไปถึงบัลลังก์ของพญาก็อบลิน',
    waves: [
      { monsterIds: ['alley_rat', 'pixel_slime'] },
      { monsterIds: ['soi_dog_spirit', 'alley_rat'] },
      { monsterIds: ['goblin_king'], boss: true },
    ],
  },
  {
    id: 'abandoned_pump',
    nameTh: 'ปั๊มร้างยามค่ำ',
    icon: '⛽',
    minLevel: 16,
    recLevel: [18, 25],
    descTh: 'ไฟนีออนกะพริบ รถแดงปีศาจวนเวียน และหุ่นหัวจ่ายที่คลั่งไปแล้ว',
    waves: [
      { monsterIds: ['songthaew_mimic'] },
      { monsterIds: ['ember_lizard', 'neon_bat'] },
      { monsterIds: ['octane_overlord'], boss: true },
    ],
  },
];

export const DUNGEON_BY_ID: Record<string, DungeonDef> = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
