/** Walk Session validation. Runs on the client for feedback and on the server as the authority. */

export const STEPS_PER_KM = 1300;
/** Faster than this counts as a vehicle (MASTER_SPEC §4). */
export const MAX_WALK_SPEED_KMH = 20;
/** GPS fixes worse than this are ignored. */
export const MAX_ACCURACY_M = 35;
/** Ignore jitter smaller than this between accepted fixes. */
export const MIN_MOVE_M = 3;

export interface GpsFix {
  lat: number;
  lng: number;
  /** epoch ms */
  t: number;
  /** meters (1 sigma) */
  accuracy: number;
}

export interface WalkSummary {
  meters: number;
  steps: number;
  /** Seconds spent above the speed limit (not counted). */
  vehicleSeconds: number;
  rejectedFixes: number;
  /** True when the trace looks like spoofing/teleporting. */
  suspicious: boolean;
}

const EARTH_R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

export function metersToSteps(m: number): number {
  return Math.floor((m / 1000) * STEPS_PER_KM);
}

/**
 * Turns a raw GPS trace into counted distance. Segments faster than the walking limit are
 * dropped; a jump > 500 m at > 150 km/h flags the trace as suspicious.
 */
export function summarizeWalk(fixes: GpsFix[]): WalkSummary {
  let meters = 0;
  let vehicleSeconds = 0;
  let rejectedFixes = 0;
  let suspicious = false;
  let last: GpsFix | null = null;

  const sorted = [...fixes].sort((a, b) => a.t - b.t);
  for (const fix of sorted) {
    if (fix.accuracy > MAX_ACCURACY_M || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) {
      rejectedFixes++;
      continue;
    }
    if (!last) {
      last = fix;
      continue;
    }
    const dt = (fix.t - last.t) / 1000;
    if (dt <= 0) {
      rejectedFixes++;
      continue;
    }
    const d = haversine(last, fix);
    const kmh = (d / dt) * 3.6;
    if (d > 500 && kmh > 150) suspicious = true;
    if (kmh > MAX_WALK_SPEED_KMH) {
      vehicleSeconds += dt;
      last = fix;
      continue;
    }
    if (d < MIN_MOVE_M) continue;
    meters += d;
    last = fix;
  }

  return { meters, steps: metersToSteps(meters), vehicleSeconds, rejectedFixes, suspicious };
}
