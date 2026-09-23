/**
 * Presence protocol (JSON over WebSocket) shared by the game client and apps/server.
 * Phase A = LAN testing: everyone connected sees everyone nearby. Before public launch the
 * server must apply the privacy rules in MASTER_SPEC §12 (strangers never get exact positions).
 */
import type { UnitSetup } from '../combat/types';
import type { ClassId } from '../types';

/** Visual info other players need to draw you. */
export interface PlayerLook {
  appearance: { gender?: 'male' | 'female'; skin: number; hairStyle: string; hairColor: number; outfit: number };
  classId: ClassId;
  helmet?: string;
  chest?: string;
  weapon?: string;
  boots?: string;
  aura?: string | null;
}

export interface PlayerPresence {
  id: string;
  name: string;
  level: number;
  look: PlayerLook;
  lat: number;
  lng: number;
  /** ms since the server last heard from this player */
  age: number;
  /** currently in a battle */
  busy: boolean;
}

export interface PartyMember {
  id: string;
  name: string;
  level: number;
  classId: ClassId;
  online: boolean;
}

export interface PartyInfo {
  id: string;
  leader: string;
  members: PartyMember[];
}

/** One member entering a run: their combat setup (id = player id) and look for drawing. */
export interface DungeonEntrant {
  setup: UnitSetup;
  look: PlayerLook;
}

/**
 * A shared fight. DUNGEON = opened by the leader, every member must accept. FIELD = a member
 * engaged a map monster; party members in range are pulled in automatically.
 */
export interface RunTarget {
  kind: 'DUNGEON' | 'FIELD';
  dungeonId?: string;
  monsterIds?: string[];
  /** World spawn being fought (FIELD) — marked defeated for everyone on a win. */
  spawn?: { id: string; expiresAt: number };
}

export type ClientMsg =
  | { t: 'hello'; id: string; name: string; level: number; look: PlayerLook }
  | { t: 'pos'; lat: number; lng: number }
  | { t: 'state'; level: number; look: PlayerLook; busy: boolean }
  | { t: 'party:invite'; to: string }
  | { t: 'party:answer'; from: string; accept: boolean }
  | { t: 'party:leave' }
  | { t: 'party:kick'; id: string }
  | { t: 'run:open'; target: RunTarget }
  /** Reply to run:prepare. `entrant` null = decline / can't join right now. */
  | { t: 'run:ready'; runId: string; entrant: DungeonEntrant | null };

export type ServerMsg =
  | { t: 'welcome'; id: string; online: number }
  | { t: 'players'; players: PlayerPresence[]; online: number }
  | { t: 'party:invited'; from: string; name: string; level: number }
  | { t: 'party:state'; party: PartyInfo | null }
  | { t: 'notice'; text: string; kind?: 'info' | 'good' | 'bad' }
  /** Everyone in the run replies with run:ready (after pressing accept when `needAccept`). */
  | { t: 'run:prepare'; runId: string; target: RunTarget; openedBy: string; needAccept: boolean; timeoutMs: number }
  /** Ready-check progress (DUNGEON). */
  | { t: 'run:status'; runId: string; accepted: string[]; waiting: string[] }
  | { t: 'run:cancel'; runId: string; reason: string }
  /**
   * Everyone in the run simulates the same fight from (target, seed, entrants) — the engine is
   * deterministic, so all devices play out an identical battle without streaming turns.
   */
  | { t: 'run:begin'; runId: string; target: RunTarget; seed: number; entrants: DungeonEntrant[]; openedBy: string };

export const PARTY_MAX = 3;
export const PARTY_INVITE_TTL_MS = 30_000;
/** Dungeon ready check: every member must press accept within this time. */
export const DUNGEON_ACCEPT_TIMEOUT_MS = 20_000;
/** Field fights: members in range answer automatically; stragglers are left out after this. */
export const FIELD_READY_TIMEOUT_MS = 3000;

/** Only players within this distance of you are sent to you. */
export const PRESENCE_RADIUS_M = 2000;
/** Players silent for longer than this are dropped. */
export const PRESENCE_TIMEOUT_MS = 20_000;
/** Server broadcast interval. */
export const PRESENCE_TICK_MS = 1000;
/** Path the WebSocket is served on (proxied by the Vite dev server). */
export const PRESENCE_PATH = '/ws';
export const PRESENCE_PORT = 8787;
