/**
 * Player location: real GPS via watchPosition, or a simulated walker for desktop testing.
 * Movement itself is the game (walk to monsters); there is no step counting. Speed is tracked
 * so fights can be blocked while travelling in a vehicle (safety + anti-farming).
 */
import { sfx } from './audio';
import { haversine } from '@pw/shared';
import { bus, toast } from './bus';
import { degScale } from './world';

const SIM_WALK_MPS = 1.4;
/** Test-only walking speed multipliers for the simulated walker. */
export const SIM_SPEEDS = [1, 3, 10, 30, 100, 300];
const LAST_POS_KEY = 'pw.lastPos';
/** Faster than this counts as a vehicle: fighting is disabled. */
export const MAX_FIGHT_SPEED_KMH = 20;
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

interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
  t: number;
}

class LocationController {
  simulated = false;
  position: { lat: number; lng: number } | null = null;
  /** Smoothed ground speed from recent fixes. */
  speedKmh = 0;
  paused = false;

  private lastFix: Fix | null = null;
  private lastSaved = 0;
  private simDir = { x: 0, y: 0 };
  private simTurbo = false;
  /** Multiplier for the simulated walker (desktop testing). */
  simSpeed = (() => {
    const v = Number(localStorage.getItem('pw.simSpeed'));
    return SIM_SPEEDS.includes(v) ? v : 10;
  })();

  cycleSimSpeed(): number {
    this.simSpeed = SIM_SPEEDS[(SIM_SPEEDS.indexOf(this.simSpeed) + 1) % SIM_SPEEDS.length]!;
    try {
      localStorage.setItem('pw.simSpeed', String(this.simSpeed));
    } catch {
      /* ignore */
    }
    return this.simSpeed;
  }

  /** Test-only: jump the simulated walker somewhere (right-click / long-press on the map). */
  teleport(lat: number, lng: number) {
    if (!this.simulated) return;
    sfx('warp');
    this.lastFix = null;
    this.speedKmh = 0;
    this.onFix({ lat, lng, accuracy: 5, t: Date.now() }, true);
  }

  startLocation() {
    if (!('geolocation' in navigator)) {
      this.enableSimulation('อุปกรณ์นี้ไม่มี GPS — ใช้โหมดจำลอง');
      return;
    }
    navigator.geolocation.watchPosition(
      (pos) => {
        if (this.simulated) return;
        this.onFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, t: pos.timestamp }, false);
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
    window.setInterval(() => this.simStep(), 250);
  }

  /** Direction in screen space (-1..1). */
  setSimDirection(x: number, y: number, turbo = false) {
    this.simDir = { x, y };
    this.simTurbo = turbo;
  }

  /** Vehicle-speed check. The simulated walker is a test tool and is exempt (disable it before launch). */
  get tooFast(): boolean {
    return !this.simulated && this.speedKmh > MAX_FIGHT_SPEED_KMH;
  }

  private simStep() {
    if (!this.position || this.paused) return;
    const { x, y } = this.simDir;
    const len = Math.hypot(x, y);
    if (len < 0.01) {
      this.onFix({ ...this.position, accuracy: 5, t: Date.now() }, true);
      return;
    }
    const meters = SIM_WALK_MPS * 0.25 * this.simSpeed * (this.simTurbo ? 2 : 1);
    const k = degScale(this.position.lat);
    const lat = this.position.lat - ((y / len) * meters) / k.lat;
    const lng = this.position.lng + ((x / len) * meters) / k.lng;
    this.onFix({ lat, lng, accuracy: 5, t: Date.now() }, true);
  }

  private onFix(fix: Fix, simulated: boolean) {
    if (this.lastFix && fix.t > this.lastFix.t) {
      const kmh = (haversine(this.lastFix, fix) / ((fix.t - this.lastFix.t) / 1000)) * 3.6;
      this.speedKmh = this.speedKmh * 0.6 + kmh * 0.4;
    }
    this.lastFix = fix;
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
  }
}

export const walk = new LocationController();
