/**
 * Presence protocol (JSON over WebSocket) shared by the game client and apps/server.
 * Phase A = LAN testing: everyone connected sees everyone nearby. Before public launch the
 * server must apply the privacy rules in MASTER_SPEC §12 (strangers never get exact positions).
 */
import type { UnitSetup } from '../combat/types';
import type { ClassId } from '../types';

/** Visual info other players need to draw you. */
export interface PlayerLook {
  appearance: { skin: number; hairStyle: string; hairColor: number; outfit: number };
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

/** One member entering a dungeon run: their combat setup (id = player id) and look for drawing. */
export interface DungeonEntrant {
  setup: UnitSetup;
  look: PlayerLook;
}

export type ClientMsg =
  | { t: 'hello'; id: string; name: string; level: number; look: PlayerLook }
  | { t: 'pos'; lat: number; lng: number }
  | { t: 'state'; level: number; look: PlayerLook; busy: boolean }
  | { t: 'party:invite'; to: string }
  | { t: 'party:answer'; from: string; accept: boolean }
  | { t: 'party:leave' }
  | { t: 'party:kick'; id: string }
  /** Leader opens a dungeon for the party (or a solo player for themself). */
  | { t: 'dungeon:open'; dungeonId: string }
  /** Reply to dungeon:prepare. `entrant` null = can't join right now (busy). */
  | { t: 'dungeon:ready'; runId: string; entrant: DungeonEntrant | null };

export type ServerMsg =
  | { t: 'welcome'; id: string; online: number }
  | { t: 'players'; players: PlayerPresence[]; online: number }
  | { t: 'party:invited'; from: string; name: string; level: number }
  | { t: 'party:state'; party: PartyInfo | null }
  | { t: 'notice'; text: string; kind?: 'info' | 'good' | 'bad' }
  /** Everyone in the run sends back their setup. */
  | { t: 'dungeon:prepare'; runId: string; dungeonId: string }
  /**
   * Everyone in the run simulates the same dungeon from (dungeonId, seed, entrants) — the engine
   * is deterministic, so all devices play out an identical fight without streaming turns.
   */
  | { t: 'dungeon:begin'; runId: string; dungeonId: string; seed: number; entrants: DungeonEntrant[] };

export const PARTY_MAX = 3;
/** Invites and dungeon entry need players physically together. */
export const PARTY_RANGE_M = 200;
export const PARTY_INVITE_TTL_MS = 30_000;
/** How long the server waits for members' setups before starting without them. */
export const DUNGEON_READY_TIMEOUT_MS = 6000;

/** Only players within this distance of you are sent to you. */
export const PRESENCE_RADIUS_M = 2000;
/** Players silent for longer than this are dropped. */
export const PRESENCE_TIMEOUT_MS = 20_000;
/** Server broadcast interval. */
export const PRESENCE_TICK_MS = 1000;
/** Path the WebSocket is served on (proxied by the Vite dev server). */
export const PRESENCE_PATH = '/ws';
export const PRESENCE_PORT = 8787;
