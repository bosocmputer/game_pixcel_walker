/**
 * Screen shake / flash strength in battle (Settings → จอสั่น/แสงวาบ). Some players get eye
 * strain from shake and flashes, especially at 4× speed, so it can be toned down or turned off.
 */
export type FxLevel = 'normal' | 'low' | 'off';
const KEY = 'pw.fxShake';
const ORDER: FxLevel[] = ['normal', 'low', 'off'];
export const FX_LEVEL_TH: Record<FxLevel, string> = { normal: 'ปกติ', low: 'น้อย', off: 'ปิด' };

let level: FxLevel = (() => {
  try {
    const v = localStorage.getItem(KEY) as FxLevel | null;
    return v && ORDER.includes(v) ? v : 'normal';
  } catch {
    return 'normal';
  }
})();

export function fxLevel(): FxLevel {
  return level;
}

/** Multiplier for shake / flash strength: 1 · 0.45 · 0. */
export function fxScale(): number {
  return level === 'normal' ? 1 : level === 'low' ? 0.45 : 0;
}

export function cycleFxLevel(): FxLevel {
  level = ORDER[(ORDER.indexOf(level) + 1) % ORDER.length]!;
  try {
    localStorage.setItem(KEY, level);
  } catch {
    /* ignore */
  }
  return level;
}
