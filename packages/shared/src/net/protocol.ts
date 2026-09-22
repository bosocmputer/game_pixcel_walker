/**
 * Presence protocol (JSON over WebSocket) shared by the game client and apps/server.
 * Phase A = LAN testing: everyone connected sees everyone nearby. Before public launch the
 * server must apply the privacy rules in MASTER_SPEC §12 (strangers never get exact positions).
 */
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

export type ClientMsg =
  | { t: 'hello'; id: string; name: string; level: number; look: PlayerLook }
  | { t: 'pos'; lat: number; lng: number }
  | { t: 'state'; level: number; look: PlayerLook; busy: boolean };

export type ServerMsg =
  | { t: 'welcome'; id: string; online: number }
  | { t: 'players'; players: PlayerPresence[]; online: number };

/** Only players within this distance of you are sent to you. */
export const PRESENCE_RADIUS_M = 2000;
/** Players silent for longer than this are dropped. */
export const PRESENCE_TIMEOUT_MS = 20_000;
/** Server broadcast interval. */
export const PRESENCE_TICK_MS = 1000;
/** Path the WebSocket is served on (proxied by the Vite dev server). */
export const PRESENCE_PATH = '/ws';
export const PRESENCE_PORT = 8787;
