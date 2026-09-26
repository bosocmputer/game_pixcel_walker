/**
 * Phone vibration for big moments in battle (crits, ultimates, knock-outs). Android browsers
 * support it; iOS Safari ignores `navigator.vibrate`. Players can turn it off in Settings.
 */
const KEY = 'pw.haptics';

let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
})();

export function hapticsOn(): boolean {
  return enabled;
}

export function setHaptics(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (on) haptic('tap');
}

const PATTERNS = {
  tap: 12,
  hit: 18,
  crit: [30, 30, 45],
  ultimate: [60, 40, 90],
  finisher: [40, 50, 120],
  down: [120, 60, 120],
} satisfies Record<string, number | number[]>;

export type Haptic = keyof typeof PATTERNS;

export function haptic(kind: Haptic) {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* some browsers throw when called without a user gesture */
  }
}
