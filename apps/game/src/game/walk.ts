/**
 * Location + Walk Session controller (MASTER_SPEC §4).
 * Real GPS via watchPosition, or a simulated walker for desktop testing.
 * The server will re-validate the same fixes in Phase 1; this is the client preview.
 */
import { summarizeWalk, walkStatPoints, type GpsFix } from '@pw/shared';
import { bus, toast } from './bus';
import { store, rollDay } from '../state/store';
import { degScale } from './world';

const SIM_WALK_MPS = 1.4;
const LAST_POS_KEY = 'pw.lastPos';
/** Fallback start when GPS is unavailable: Chiang Mai old city (launch city). */
export const DEFAULT_POS = { lat: 18.7877, lng: 98.9931 };

export function lastKnownPosition(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(LAST_POS_KEY);
    return raw ? (JSON.parse(raw) as { lat: number; lng: number }) : null;
  } catch {
    return null;
  }
}

class WalkController {
  active = false;
  simulated = false;
  position: { lat: number; lng: number } | null = null;
  sessionSteps = 0;
  sessionMeters = 0;

  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private lastFix: GpsFix | null = null;
  private durabilityBuffer = 0;
  private simTimer: number | null = null;
  private simDir = { x: 0, y: 0 };
  private simTurbo = false;
  paused = false;

  startLocation() {
    if (!('geolocation' in navigator)) {
      this.enableSimulation('อุปกรณ์นี้ไม่มี GPS — ใช้โหมดจำลอง');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.simulated) return;
        const fix: GpsFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          t: pos.timestamp,
        };
        this.onFix(fix, false);
      },
      () => this.enableSimulation('ไม่ได้รับอนุญาต GPS — ใช้โหมดจำลอง'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
  }

  enableSimulation(reason?: string) {
    if (this.simulated) return;
    this.simulated = true;
    if (reason) toast(reason);
    if (!this.position) this.position = lastKnownPosition() ?? DEFAULT_POS;
    this.onFix({ ...this.position, accuracy: 5, t: Date.now() }, true);
    this.simTimer = window.setInterval(() => this.simStep(), 250);
  }

  /** Direction in screen space (-1..1). */
  setSimDirection(x: number, y: number, turbo = false) {
    this.simDir = { x, y };
    this.simTurbo = turbo;
  }

  private simStep() {
    if (!this.position || this.paused) return;
    const { x, y } = this.simDir;
    const len = Math.hypot(x, y);
    if (len < 0.01) return;
    const meters = SIM_WALK_MPS * 0.25 * (this.simTurbo ? 6 : 1);
    const k = degScale(this.position.lat);
    const lat = this.position.lat - ((y / len) * meters) / k.lat;
    const lng = this.position.lng + ((x / len) * meters) / k.lng;
    this.onFix({ lat, lng, accuracy: 5, t: Date.now() }, true);
  }

  async startSession() {
    if (this.active) return;
    this.active = true;
    this.sessionSteps = 0;
    this.sessionMeters = 0;
    this.lastFix = null;
    try {
      this.wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null;
    }
    bus.emit('walk:state', { active: true });
    toast('เริ่มเดิน! ระวังรถ อย่าเล่นขณะขับขี่', 'good');
  }

  stopSession() {
    if (!this.active) return;
    this.active = false;
    void this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
    bus.emit('walk:state', { active: false });
    toast(`จบการเดิน: ${this.sessionSteps.toLocaleString()} ก้าว (${(this.sessionMeters / 1000).toFixed(2)} กม.)`, 'good');
  }

  /** Re-acquire wake lock when the tab becomes visible again. */
  async onVisible() {
    if (this.active && !this.wakeLock) {
      try {
        this.wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        /* ignore */
      }
    }
  }

  private lastSaved = 0;

  private onFix(fix: GpsFix, simulated: boolean) {
    this.position = { lat: fix.lat, lng: fix.lng };
    if (fix.t - this.lastSaved > 10000) {
      this.lastSaved = fix.t;
      try {
        localStorage.setItem(LAST_POS_KEY, JSON.stringify(this.position));
      } catch {
        /* ignore */
      }
    }
    bus.emit('position', { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, simulated });
    if (!this.active || this.paused) return;

    if (!this.lastFix) {
      this.lastFix = fix;
      return;
    }
    const s = summarizeWalk([this.lastFix, fix]);
    if (s.rejectedFixes > 0) return;
    if (s.vehicleSeconds > 0) {
      this.lastFix = fix;
      bus.emit('walk:progress', { steps: this.sessionSteps, meters: this.sessionMeters, vehicle: true });
      return;
    }
    if (s.meters <= 0) return;
    this.lastFix = fix;
    this.credit(s.meters);
  }

  /** Converts accepted distance into steps, EXP, stat points, wear and encounters. */
  private credit(meters: number) {
    const stepsFloat = (meters / 1000) * 1300;
    this.sessionMeters += meters;
    const before = this.sessionSteps;
    this.sessionSteps = Math.floor((this.sessionMeters / 1000) * 1300);
    const steps = this.sessionSteps - before;
    if (steps <= 0 && stepsFloat < 1) return;

    store.update((s) => {
      rollDay(s);
      const beforeToday = s.stepsToday;
      s.stepsToday += steps;
      s.totalSteps += steps;
      s.totalMeters += meters;

      // Walking gives no EXP (that comes from monsters) — only daily bonus stat points.
      const walkPts = walkStatPoints(beforeToday, s.stepsToday);
      if (walkPts > 0) {
        s.unspentPoints += walkPts;
        toast(`เดินครบ ${s.stepsToday.toLocaleString()} ก้าววันนี้ → +${walkPts} Stat Point`, 'good');
      }

      // Walking wears boots and chest: -1 durability per 1,000 steps.
      this.durabilityBuffer += steps;
      while (this.durabilityBuffer >= 1000) {
        this.durabilityBuffer -= 1000;
        for (const slot of ['boots', 'chest'] as const) {
          const eq = s.equipment[slot];
          if (eq && eq.durability > 0) eq.durability -= 1;
        }
      }
    });

    bus.emit('walk:progress', { steps: this.sessionSteps, meters: this.sessionMeters, vehicle: false });
  }

}

export const walk = new WalkController();
