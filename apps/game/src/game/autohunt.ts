/**
 * Auto Hunt (mobile-MMORPG style): while enabled, repeatedly picks a monster inside the play
 * radius, fights it with auto-battle and moves on. Stops itself on low HP without potions,
 * on death, or when travelling at vehicle speed.
 */
import type Phaser from 'phaser';
import { MONSTERS, haversine } from '@pw/shared';
import { bus, toast } from './bus';
import { visibleSpawns } from './spawns';
import { walk } from './walk';
import { usePotion } from './rules';
import { derivedOf, store } from '../state/store';

/** Use a potion (or stop) below this share of max HP. */
export const AUTO_HP_THRESHOLD = 0.3;
/** Skip monsters this many levels above the player ("red" monsters). */
export const AUTO_MAX_LEVEL_GAP = 1;
const TICK_MS = 900;

class AutoHunt {
  enabled = false;
  private game: Phaser.Game | null = null;
  private timer: number | null = null;
  private busy = false;
  private busySince = 0;

  init(game: Phaser.Game) {
    this.game = game;
    bus.on('battle:end', () => {
      this.busy = false;
    });
  }

  toggle() {
    return this.enabled ? this.stop() : this.start();
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.busy = false;
    toast('🤖 เปิดล่าอัตโนมัติ', 'good');
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    bus.emit('autohunt', { enabled: true });
  }

  stop(reason?: string) {
    if (!this.enabled) return;
    this.enabled = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    toast(reason ? `🤖 หยุดล่าอัตโนมัติ: ${reason}` : '🤖 ปิดล่าอัตโนมัติ', reason ? 'bad' : 'info');
    bus.emit('autohunt', { enabled: false });
  }

  private tick() {
    const scenes = this.game?.scene;
    if (!scenes || !walk.position) return;
    if (scenes.isActive('Battle') || scenes.isPaused('World')) return;
    // A refused start (e.g. vehicle speed) never emits battle:end — don't wait forever.
    if (this.busy && Date.now() - this.busySince < 3000) return;
    this.busy = false;
    if (walk.tooFast) return this.stop('เคลื่อนที่เร็วเกินไป');

    const s = store.s;
    if (s.hp < derivedOf(s).maxHp * AUTO_HP_THRESHOLD) {
      if (usePotion('red_potion')) return;
      return this.stop('HP ต่ำและยา HP หมด');
    }

    const here = walk.position;
    const target = visibleSpawns(here.lat, here.lng)
      .filter((sp) => MONSTERS[sp.monsterId]!.level - s.level <= AUTO_MAX_LEVEL_GAP)
      .sort((a, b) => haversine(here, a) - haversine(here, b))[0];
    if (!target) return; // wait for the next respawn

    this.busy = true;
    this.busySince = Date.now();
    bus.emit('battle:start', {
      kind: 'FIELD',
      monsterIds: [target.monsterId],
      spawn: { id: target.id, expiresAt: target.expiresAt },
      auto: true,
    });
  }

  /** Called by the battle scene when an auto-hunt fight ends. */
  onBattleResult(result: 'WIN' | 'LOSE' | 'FLED') {
    if (result === 'LOSE') this.stop('พ่ายแพ้');
  }
}

export const autoHunt = new AutoHunt();
