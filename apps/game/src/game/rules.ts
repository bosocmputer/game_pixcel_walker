/** Client-side game actions that combine shared rules with the local save. */
import {
  CONSUMABLES,
  EQUIPMENT,
  LANDMARK_BOSS,
  MONSTERS,
  STAT_KEYS,
  canChangeClass,
  deathGoldLoss,
  gainExp,
  haversine,
  repairCost,
  rollLoot,
  worldBossShare,
  type ClassId,
  type EquipSlot,
  type Landmark,
  type Loot,
  type Rng,
  type StatKey,
} from '@pw/shared';
import { derivedOf, regen, store, type SaveData } from '../state/store';
import { landmarksAround } from './world';

export const BOSS_RADIUS_M = 50;
export const HOME_RADIUS_M = 200;
/** One world-boss attack window per player per 30 minutes. */
export const WORLD_BOSS_COOLDOWN_MS = 30 * 60_000;

export function worldBossReadyAt(l: Landmark, s: SaveData): number {
  return (s.worldBosses[l.id]?.lastAttempt ?? 0) + WORLD_BOSS_COOLDOWN_MS;
}

// ---------------------------------------------------------------------------------------------
// Landmarks & bosses

export function bossIdFor(l: Landmark): string | null {
  return l.kind === 'CITY' ? null : LANDMARK_BOSS[l.kind];
}

/** Start of the current daily spawn window (Asia/Bangkok) for "HH:MM". */
function dailyWindowStart(hhmm: string, now: number): number {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const bkk = new Date(now + 7 * 3600_000);
  const start = Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate(), h, m) - 7 * 3600_000;
  return start <= now ? start : start - 86400_000;
}

export function bossAvailableAt(l: Landmark, s: SaveData, now = Date.now()): number {
  const bossId = bossIdFor(l);
  const boss = bossId ? MONSTERS[bossId]?.boss : undefined;
  if (!boss) return Infinity;
  const killed = s.bossKills[l.id] ?? 0;
  if (boss.dailyAt) {
    const start = dailyWindowStart(boss.dailyAt, now);
    return killed >= start ? start + 86400_000 : start;
  }
  return killed + boss.respawnMinutes * 60_000;
}

export function nearbyLandmarks(lat: number, lng: number, radius = BOSS_RADIUS_M): Landmark[] {
  return landmarksAround(lat, lng, radius);
}

export function nearHome(s: SaveData, lat: number, lng: number): boolean {
  return !!s.home && haversine(s.home, { lat, lng }) <= HOME_RADIUS_M;
}

/** Remaining HP for a world boss spawn (persisted until the window ends). */
export function worldBossHp(l: Landmark, s: SaveData, now = Date.now()): number {
  const bossId = bossIdFor(l)!;
  const def = MONSTERS[bossId]!;
  const start = def.boss?.dailyAt ? dailyWindowStart(def.boss.dailyAt, now) : 0;
  const wb = s.worldBosses[l.id];
  if (!wb || wb.spawnedAt < start) return def.hp;
  return wb.hp;
}

// ---------------------------------------------------------------------------------------------
// Character actions

export function allocate(stat: StatKey, n = 1) {
  store.update((s) => {
    const k = Math.min(n, s.unspentPoints);
    if (k <= 0) return;
    s.allocated[stat] += k;
    s.unspentPoints -= k;
  });
}

/** Full respec: returns all allocated points (costs 500 Gold, free below Lv.10). */
export function respecCost(s: SaveData): number {
  return s.level < 10 ? 0 : 500;
}

export function respec(): boolean {
  const s = store.s;
  const cost = respecCost(s);
  if (s.gold < cost) return false;
  store.update((x) => {
    x.gold -= cost;
    for (const k of STAT_KEYS) {
      x.unspentPoints += x.allocated[k];
      x.allocated[k] = 0;
    }
    clampVitals(x);
  });
  return true;
}

export function changeClass(classId: ClassId): boolean {
  const s = store.s;
  if (!canChangeClass(s.classId, s.level)) return false;
  store.update((x) => {
    x.classId = classId;
    clampVitals(x);
  });
  return true;
}

export function clampVitals(s: SaveData) {
  const d = derivedOf(s);
  s.hp = Math.min(s.hp, d.maxHp);
  s.mp = Math.min(s.mp, d.maxMp);
}

export function equip(index: number) {
  store.update((s) => {
    const item = s.gearBag[index];
    if (!item) return;
    const def = EQUIPMENT[item.itemId];
    if (!def) return;
    s.gearBag.splice(index, 1);
    const current = s.equipment[def.slot];
    if (current) s.gearBag.push(current);
    s.equipment[def.slot] = item;
    if (def.twoHanded && s.equipment.offhand) {
      s.gearBag.push(s.equipment.offhand);
      delete s.equipment.offhand;
    }
    if (def.slot === 'offhand') {
      const w = s.equipment.weapon && EQUIPMENT[s.equipment.weapon.itemId];
      if (w && w.twoHanded) {
        s.gearBag.push(s.equipment.weapon!);
        delete s.equipment.weapon;
      }
    }
    clampVitals(s);
  });
}

export function unequip(slot: EquipSlot) {
  store.update((s) => {
    const item = s.equipment[slot];
    if (!item) return;
    s.gearBag.push(item);
    delete s.equipment[slot];
    clampVitals(s);
  });
}

export function usePotion(itemId: string): boolean {
  const def = CONSUMABLES[itemId];
  if (!def || !(store.s.bag[itemId] ?? 0)) return false;
  store.update((s) => {
    const d = derivedOf(s);
    s.bag[itemId] = (s.bag[itemId] ?? 0) - 1;
    if (def.kind === 'HEAL_HP') s.hp = Math.min(d.maxHp, s.hp + def.amount);
    if (def.kind === 'HEAL_MP') s.mp = Math.min(d.maxMp, s.mp + def.amount);
    if (def.kind === 'REPAIR') {
      for (const eq of Object.values(s.equipment)) {
        if (!eq) continue;
        const max = EQUIPMENT[eq.itemId]?.maxDurability ?? 100;
        if (def.amount >= 1 || eq.durability > 0) {
          eq.durability = Math.min(max, eq.durability + Math.round(max * def.amount));
        }
      }
    }
    if (!s.bag[itemId]) delete s.bag[itemId];
  });
  return true;
}

export function buy(itemId: string, price: number): boolean {
  if (store.s.gold < price) return false;
  store.update((s) => {
    s.gold -= price;
    if (EQUIPMENT[itemId]) s.gearBag.push({ itemId, durability: EQUIPMENT[itemId]!.maxDurability });
    else s.bag[itemId] = (s.bag[itemId] ?? 0) + 1;
  });
  return true;
}

export function sellGear(index: number): number {
  const item = store.s.gearBag[index];
  const def = item && EQUIPMENT[item.itemId];
  if (!def) return 0;
  const price = Math.floor(def.price * 0.3);
  store.update((s) => {
    s.gearBag.splice(index, 1);
    s.gold += price;
  });
  return price;
}

export function repairAllCost(s: SaveData, atHome: boolean): number {
  let total = 0;
  for (const eq of Object.values(s.equipment)) {
    if (!eq) continue;
    const def = EQUIPMENT[eq.itemId];
    if (!def) continue;
    total += repairCost(def.price, 1 - eq.durability / def.maxDurability, atHome);
  }
  return total;
}

export function repairAll(atHome: boolean): boolean {
  const cost = repairAllCost(store.s, atHome);
  if (cost <= 0 || store.s.gold < cost) return false;
  store.update((s) => {
    s.gold -= cost;
    for (const eq of Object.values(s.equipment)) {
      if (eq) eq.durability = EQUIPMENT[eq.itemId]?.maxDurability ?? eq.durability;
    }
  });
  return true;
}

export function setHome(lat: number, lng: number): boolean {
  const s = store.s;
  if (s.home && Date.now() - s.home.setAt < 30 * 86400_000) return false;
  store.update((x) => (x.home = { lat, lng, setAt: Date.now() }));
  return true;
}

export function bank(amount: number) {
  store.update((s) => {
    const a = Math.max(-s.bankGold, Math.min(s.gold, amount));
    s.gold -= a;
    s.bankGold += a;
  });
}

export function restAtHome() {
  store.update((s) => {
    const d = derivedOf(s);
    s.hp = d.maxHp;
    s.mp = d.maxMp;
    s.lastRegenAt = Date.now();
  });
}

export function tickRegen() {
  store.update((s) => regen(s));
}

// ---------------------------------------------------------------------------------------------
// Battle outcome

export interface BattleOutcome {
  result: 'WIN' | 'LOSE' | 'FLED';
  loot: Loot;
  levelsGained: number;
  goldLost: number;
  worldBossDamage?: number;
}

export function applyBattleOutcome(opts: {
  result: 'WIN' | 'LOSE' | 'FLED' | 'ONGOING';
  defeated: string[];
  hp: number;
  mp: number;
  itemsLeft: Record<string, number>;
  rng: Rng;
  landmark?: Landmark;
  kind: 'FIELD' | 'BOSS' | 'TRIAL';
  worldBoss?: { remainingHp: number; damage: number; maxHp: number };
}): BattleOutcome {
  const outcome: BattleOutcome = {
    result: opts.result === 'ONGOING' ? 'FLED' : opts.result,
    loot: { exp: 0, gold: 0, items: {} },
    levelsGained: 0,
    goldLost: 0,
  };

  store.update((s) => {
    const d = derivedOf(s);
    s.hp = Math.max(0, Math.round(opts.hp));
    s.mp = Math.max(0, Math.round(opts.mp));
    s.bag = Object.fromEntries(Object.entries(opts.itemsLeft).filter(([, n]) => n > 0));

    // Every fight wears equipped gear by 1.
    for (const eq of Object.values(s.equipment)) if (eq && eq.durability > 0) eq.durability -= 1;

    if (opts.worldBoss && opts.landmark) {
      const prev = s.worldBosses[opts.landmark.id];
      const start = prev && prev.hp === opts.worldBoss.remainingHp + opts.worldBoss.damage ? prev.spawnedAt : Date.now();
      s.worldBosses[opts.landmark.id] = { hp: opts.worldBoss.remainingHp, spawnedAt: start, lastAttempt: Date.now() };
      outcome.worldBossDamage = opts.worldBoss.damage;
      // Raid bosses are meant to be chipped at by many visitors: a KO is a retreat, not a death.
      if (outcome.result === 'LOSE') outcome.result = 'FLED';
    }

    if (outcome.result === 'WIN') {
      const dropRate = d.dropRate;
      for (const id of opts.defeated) {
        const l = rollLoot(id, opts.rng, dropRate);
        outcome.loot.exp += l.exp;
        outcome.loot.gold += l.gold;
        for (const [item, n] of Object.entries(l.items)) outcome.loot.items[item] = (outcome.loot.items[item] ?? 0) + n;
      }
      if (opts.worldBoss) {
        const share = worldBossShare(opts.worldBoss.damage, opts.worldBoss.maxHp);
        outcome.loot.exp = Math.round(outcome.loot.exp * share);
        outcome.loot.gold = Math.round(outcome.loot.gold * share);
      }
      const r = gainExp({ level: s.level, exp: s.exp }, outcome.loot.exp);
      s.level = r.level;
      s.exp = r.exp;
      s.unspentPoints += r.statPointsGained;
      outcome.levelsGained = r.levelsGained;
      s.gold += outcome.loot.gold;
      for (const [item, n] of Object.entries(outcome.loot.items)) {
        if (EQUIPMENT[item]) {
          for (let i = 0; i < n; i++) s.gearBag.push({ itemId: item, durability: EQUIPMENT[item]!.maxDurability });
        } else {
          s.bag[item] = (s.bag[item] ?? 0) + n;
        }
      }
      s.stats.battlesWon++;
      if (opts.kind === 'BOSS' && opts.landmark) {
        s.bossKills[opts.landmark.id] = Date.now();
        s.stats.bossesKilled++;
        delete s.worldBosses[opts.landmark.id];
      }
    }

    if (outcome.result === 'LOSE') {
      // Death penalty (MASTER_SPEC §9): all gear breaks, lose 20% of carried gold, no EXP loss.
      outcome.goldLost = deathGoldLoss(s.gold);
      s.gold -= outcome.goldLost;
      for (const eq of Object.values(s.equipment)) if (eq) eq.durability = 0;
      s.stats.deaths++;
      s.hp = Math.round(derivedOf(s).maxHp * 0.3);
    }
    s.hp = Math.max(1, s.hp);
    s.lastRegenAt = Date.now();
    clampVitals(s);
  });
  return outcome;
}
