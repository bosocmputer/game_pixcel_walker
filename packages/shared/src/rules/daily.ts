import { MATERIALS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { expToNext } from './progression';

/**
 * Daily quests from [ระบบ] (docs/STORY.md §3): three hunting goals per local day, the same for
 * everyone on that date. Walking is not a goal. Finishing all three unlocks a bonus.
 */
export type DailyKind = 'KILL' | 'STRONG' | 'GATE' | 'LOOT';

export interface DailyQuest {
  kind: DailyKind;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface DailyState {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  quests: DailyQuest[];
  bonusClaimed: boolean;
}

export interface DailyReward {
  exp: number;
  gold: number;
}

export const DAILY_BONUS = { statPoints: 1, items: { red_potion: 3 } };

export function dailyTitle(q: Pick<DailyQuest, 'kind' | 'target'>): string {
  switch (q.kind) {
    case 'KILL':
      return `ปราบมอนสเตอร์ ${q.target} ตัว`;
    case 'STRONG':
      return `ปราบมอนสเตอร์ที่เลเวลไม่ต่ำกว่าคุณ ${q.target} ตัว`;
    case 'GATE':
      return `ปิดประตูมิติ (บอสสถานที่หรือดันเจี้ยน) ${q.target} บาน`;
    case 'LOOT':
      return `เก็บของดรอปจากมอนสเตอร์ ${q.target} ชิ้น`;
  }
}

/** Local-date key; pass a Date so tests and time zones stay explicit. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayHash(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today's three quests: always a hunt, plus two of the others picked by the date. */
export function rollDaily(day: string, level: number): DailyState {
  const extra: DailyKind[] = ['STRONG', 'GATE', 'LOOT'];
  const skip = dayHash(day) % extra.length;
  const kinds: DailyKind[] = ['KILL', ...extra.filter((_, i) => i !== skip)];
  const target = (k: DailyKind) =>
    k === 'KILL' ? Math.min(30, 10 + Math.floor(level / 5) * 2) : k === 'STRONG' ? 3 : k === 'GATE' ? 1 : 8;
  return { day, quests: kinds.map((kind) => ({ kind, target: target(kind), progress: 0, claimed: false })), bonusClaimed: false };
}

/** Keeps today's quests, or starts a fresh set on a new day. */
export function ensureDaily(state: DailyState | undefined, day: string, level: number): DailyState {
  return state && state.day === day ? state : rollDaily(day, level);
}

export interface BattleProgress {
  /** Monster ids defeated in a won fight. */
  defeated: string[];
  playerLevel: number;
  /** A landmark gate or dungeon was cleared. */
  gateCleared: boolean;
  /** Items looted (id → count); only monster junk counts. */
  loot: Record<string, number>;
}

/** Applies a won fight to the quests. Returns the new state and the quests that just completed. */
export function recordBattle(state: DailyState, b: BattleProgress): { state: DailyState; completed: DailyQuest[] } {
  const completed: DailyQuest[] = [];
  const kills = b.defeated.filter((id) => MONSTERS[id] && !MONSTERS[id]!.passive);
  const add: Record<DailyKind, number> = {
    KILL: kills.length,
    STRONG: kills.filter((id) => MONSTERS[id]!.level >= b.playerLevel).length,
    GATE: b.gateCleared ? 1 : 0,
    LOOT: Object.entries(b.loot).reduce((n, [id, c]) => n + (MATERIALS[id] ? c : 0), 0),
  };
  const quests = state.quests.map((q) => {
    if (q.progress >= q.target) return q;
    const progress = Math.min(q.target, q.progress + add[q.kind]);
    const next = { ...q, progress };
    if (progress >= q.target) completed.push(next);
    return next;
  });
  return { state: { ...state, quests }, completed };
}

/** Reward for one quest: a share of the current level's EXP bar plus Gold. */
export function dailyReward(level: number): DailyReward {
  return { exp: Math.round(expToNext(level) * 0.12), gold: 40 + level * 12 };
}

export function dailyBonusReady(state: DailyState): boolean {
  return !state.bonusClaimed && state.quests.every((q) => q.claimed);
}
