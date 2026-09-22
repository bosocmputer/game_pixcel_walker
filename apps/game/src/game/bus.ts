/** Tiny typed event bus between Phaser scenes and the DOM UI. */
import type { ClassId, Landmark } from '@pw/shared';

export interface BusEvents {
  'position': { lat: number; lng: number; accuracy: number; simulated: boolean };
  'walk:state': { active: boolean };
  'walk:progress': { steps: number; meters: number; vehicle: boolean };
  'encounter': { monsterIds: string[] };
  'boss:challenge': { landmark: Landmark };
  'battle:start': BattleRequest;
  'battle:end': void;
  'landmark:near': { landmarks: Landmark[] };
  'toast': { text: string; kind?: 'info' | 'good' | 'bad' };
  'zoom': { delta: number };
}

export interface BattleRequest {
  kind: 'FIELD' | 'BOSS' | 'TRIAL';
  monsterIds: string[];
  landmark?: Landmark;
  trialClass?: ClassId;
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
