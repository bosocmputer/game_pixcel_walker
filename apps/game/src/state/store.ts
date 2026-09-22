/**
 * Local save (Phase 0/1). The shape mirrors the future Supabase `characters` row so the
 * switch to a server-authoritative save only replaces load/persist.
 */
import {
  CLASSES,
  DECK_SIZE,
  EQUIPMENT,
  SKILLS,
  classSkillPool,
  STARTER_KITS,
  computeDerived,
  detectMutation,
  totalStats,
  type ClassId,
  type DerivedStats,
  type EquipSlot,
  type Modifiers,
  type MutationId,
  type Stats,
} from '@pw/shared';
import { DEFAULT_APPEARANCE, type Appearance } from '../game/art';

const KEY = 'pixelwalker.save.v1';
export const LOADOUT_SIZE = DECK_SIZE;

export interface EquippedItem {
  itemId: string;
  durability: number;
}

export interface SaveData {
  version: 1;
  name: string;
  appearance: Appearance;
  createdAt: number;
  starter: 'STANDARD' | 'NAKED' | null;
  classId: ClassId;
  level: number;
  exp: number;
  allocated: Stats;
  unspentPoints: number;
  hp: number;
  mp: number;
  gold: number;
  bankGold: number;
  /** itemId → count (consumables and unequipped gear) */
  bag: Record<string, number>;
  /** Unequipped gear keeps its durability. */
  gearBag: EquippedItem[];
  equipment: Partial<Record<EquipSlot, EquippedItem>>;
  /** Skills the auto-battle may pick from (Pocket Ninja style loadout), max LOADOUT_SIZE. */
  loadout: string[];
  home: { lat: number; lng: number; setAt: number } | null;
  /** landmarkId → epoch ms when the boss was last defeated */
  bossKills: Record<string, number>;
  /** Async World Boss remaining HP per landmark (shared on the server in Phase 2). */
  worldBosses: Record<string, { hp: number; spawnedAt: number; lastAttempt?: number }>;
  /** Defeated world spawns → expiry time (they stay gone until their slot rotates). */
  killedSpawns: Record<string, number>;
  dayKey: string;
  stepsToday: number;
  totalSteps: number;
  totalMeters: number;
  lastRegenAt: number;
  stats: { battlesWon: number; deaths: number; bossesKilled: number };
}

const zeroStats = (): Stats => ({ str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 });

export function todayKey(d = new Date()): string {
  // Asia/Bangkok calendar day
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function newSave(name: string, appearance: Appearance = DEFAULT_APPEARANCE): SaveData {
  return {
    version: 1,
    name,
    appearance,
    createdAt: Date.now(),
    starter: null,
    classId: 'NOVICE',
    level: 1,
    exp: 0,
    allocated: zeroStats(),
    unspentPoints: 0,
    hp: 1,
    mp: 1,
    gold: 0,
    bankGold: 0,
    bag: {},
    gearBag: [],
    equipment: {},
    loadout: [],
    home: null,
    bossKills: {},
    worldBosses: {},
    killedSpawns: {},
    dayKey: todayKey(),
    stepsToday: 0,
    totalSteps: 0,
    totalMeters: 0,
    lastRegenAt: Date.now(),
    stats: { battlesWon: 0, deaths: 0, bossesKilled: 0 },
  };
}

type Listener = (s: SaveData) => void;

class Store {
  data: SaveData | null = null;
  private listeners = new Set<Listener>();

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? (JSON.parse(raw) as SaveData) : null;
      if (this.data) {
        this.data.worldBosses ??= {};
        this.data.loadout ??= [];
        this.data.killedSpawns ??= {};
        this.data.appearance ??= { ...DEFAULT_APPEARANCE };
      }
    } catch {
      this.data = null;
    }
    return this.data;
  }

  get s(): SaveData {
    if (!this.data) throw new Error('No save loaded');
    return this.data;
  }

  create(name: string, appearance?: Appearance) {
    this.data = newSave(name, appearance);
    this.commit();
  }

  /** Mutate then persist + notify. */
  update(fn: (s: SaveData) => void) {
    fn(this.s);
    this.commit();
  }

  commit() {
    if (!this.data) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked — game keeps running in memory */
    }
    for (const l of this.listeners) l(this.data);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  reset() {
    localStorage.removeItem(KEY);
    this.data = null;
  }
}

export const store = new Store();

// ---------------------------------------------------------------------------------------------
// Derived helpers

export function mutationOf(s: SaveData): MutationId | null {
  return detectMutation(s.allocated, s.level);
}

export function gearModifiers(s: SaveData): Modifiers[] {
  const mods: Modifiers[] = [];
  for (const eq of Object.values(s.equipment)) {
    if (!eq || eq.durability <= 0) continue;
    const def = EQUIPMENT[eq.itemId];
    if (def) mods.push(def.modifiers);
  }
  return mods;
}

export function derivedOf(s: SaveData): DerivedStats {
  return computeDerived({
    level: s.level,
    classId: s.classId,
    mutation: mutationOf(s),
    stats: totalStats(s.allocated),
    gear: gearModifiers(s),
  });
}

export function applyStarter(s: SaveData, choice: 'STANDARD' | 'NAKED') {
  const kit = STARTER_KITS[choice];
  s.starter = choice;
  s.gold = kit.gold;
  for (const id of kit.equipment) {
    const def = EQUIPMENT[id]!;
    s.equipment[def.slot] = { itemId: id, durability: def.maxDurability };
  }
  for (const [id, n] of Object.entries(kit.consumables)) s.bag[id] = (s.bag[id] ?? 0) + (n as number);
  const d = derivedOf(s);
  s.hp = d.maxHp;
  s.mp = d.maxMp;
}

export function className(s: SaveData): string {
  return CLASSES[s.classId].nameTh;
}

/** Clamp HP/MP after max changes and apply passive regen (2% max per minute). */
export function regen(s: SaveData, now = Date.now()) {
  const d = derivedOf(s);
  const minutes = Math.max(0, (now - s.lastRegenAt) / 60000);
  s.hp = Math.min(d.maxHp, Math.max(1, s.hp) + d.maxHp * 0.02 * minutes);
  s.mp = Math.min(d.maxMp, s.mp + d.maxMp * 0.02 * minutes);
  s.hp = Math.round(s.hp);
  s.mp = Math.round(s.mp);
  s.lastRegenAt = now;
}

export function rollDay(s: SaveData) {
  const k = todayKey();
  if (s.dayKey !== k) {
    s.dayKey = k;
    s.stepsToday = 0;
  }
}

/** Skills the player may put in the deck: Novice basics + current class kit. */
export function learnableSkills(s: SaveData): string[] {
  return classSkillPool(s.classId).filter((id) => SKILLS[id]);
}

/** Deck used in battle: saved picks that are still valid, or the first DECK_SIZE learnable skills. */
export function effectiveLoadout(s: SaveData): string[] {
  const learn = learnableSkills(s);
  const picked = s.loadout.filter((id) => learn.includes(id));
  return (picked.length ? picked : learn).slice(0, LOADOUT_SIZE);
}
