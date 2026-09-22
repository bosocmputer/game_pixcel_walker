/** Tiny typed event bus between Phaser scenes and the DOM UI. */
import type { ClassId, DungeonEntrant, Landmark, PartyInfo, PlayerPresence, RunTarget, Spawn, WaveDef } from '@pw/shared';

export interface BusEvents {
  'position': { lat: number; lng: number; accuracy: number; simulated: boolean };
  'walk:state': { active: boolean };
  'walk:progress': { steps: number; meters: number; vehicle: boolean };
  'encounter': { monsterIds: string[] };
  'boss:challenge': { landmark: Landmark };
  'battle:start': BattleRequest;
  /** A battle scene actually started (battle:start is only a request). */
  'battle:launched': void;
  'battle:end': void;
  'landmark:near': { landmarks: Landmark[] };
  'toast': { text: string; kind?: 'info' | 'good' | 'bad' };
  'zoom': { delta: number };
  /** World spawns within fight range of the player (for the HUD fight prompt). */
  'monsters:inRange': { spawns: Spawn[] };
  'autohunt': { enabled: boolean };
  'net': { connected: boolean; online: number };
  'players': { players: PlayerPresence[] };
  'party': { party: PartyInfo | null };
  'party:invited': { from: string; name: string; level: number };
  'run:prepare': { runId: string; target: RunTarget; openedBy: string; needAccept: boolean; timeoutMs: number; mine: boolean };
  'run:status': { runId: string; accepted: string[]; waiting: string[] };
  /** The pending run began or was cancelled. */
  'run:end': { runId: string };
}

export interface BattleRequest {
  kind: 'FIELD' | 'BOSS' | 'TRIAL' | 'TEST' | 'DUNGEON';
  monsterIds: string[];
  landmark?: Landmark;
  trialClass?: ClassId;
  /** World spawn being fought (marked defeated on a win). */
  spawn?: { id: string; expiresAt: number };
  /** Started by Auto Hunt: auto-battle at high speed, result closes itself. */
  auto?: boolean;
  /** Test arena: custom waves/scaling, no rewards and no penalties. */
  test?: { waves: WaveDef[]; hpMult: number; atkMult: number; modifiers: boolean; maxRounds?: number };
  /** Shared run (dungeon or party field fight): every member's device simulates the same (target, seed, entrants). */
  run?: { target: RunTarget; seed: number; entrants: DungeonEntrant[]; meId: string };
}

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<unknown>>>();

  on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(fn as Handler<unknown>);
    this.handlers.set(event, set);
    return () => set.delete(fn as Handler<unknown>);
  }

  emit<K extends keyof BusEvents>(event: K, ...payload: BusEvents[K] extends void ? [] : [BusEvents[K]]) {
    for (const fn of this.handlers.get(event) ?? []) fn(payload[0]);
  }
}

export const bus = new Bus();
export const toast = (text: string, kind: 'info' | 'good' | 'bad' = 'info') => bus.emit('toast', { text, kind });
