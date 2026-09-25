/**
 * Admin-placed map pins (MASTER_SPEC §10): stored in a JSON file next to the server and sent to
 * every client. Only a client that knows the admin key may add or remove pins.
 *
 *   ADMIN_KEY   admin key (env). Unset → a random key is created once in data/admin-key.txt
 *               and printed when the server starts.
 *   PINS_FILE   where pins are stored (default apps/server/data/pins.json).
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PIN_KIND_BY_ID, PIN_MAX, sanitizePin, type Pin } from '@pw/shared';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const PINS_FILE = process.env.PINS_FILE ?? join(DATA_DIR, 'pins.json');
const KEY_FILE = join(DATA_DIR, 'admin-key.txt');

function loadAdminKey(): string {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY;
  if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, 'utf8').trim();
  const key = randomBytes(6).toString('hex');
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(KEY_FILE, key + '\n');
  return key;
}

export const ADMIN_KEY = loadAdminKey();

export function isAdminKey(key: unknown): boolean {
  const a = Buffer.from(String(key ?? ''));
  const b = Buffer.from(ADMIN_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

function loadPins(): Pin[] {
  try {
    const raw = JSON.parse(readFileSync(PINS_FILE, 'utf8')) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((p: Pin) => {
      const d = sanitizePin(p);
      return d && typeof p.id === 'string' ? [{ id: p.id, ...d }] : [];
    });
  } catch {
    return [];
  }
}

export const pins: Pin[] = loadPins();

function save() {
  mkdirSync(dirname(PINS_FILE), { recursive: true });
  // Write-then-rename so a crash mid-write never leaves a half file.
  writeFileSync(`${PINS_FILE}.tmp`, JSON.stringify(pins, null, 1));
  renameSync(`${PINS_FILE}.tmp`, PINS_FILE);
}

/** Adds a pin from an admin's draft. Returns the stored pin, or an error message. */
export function addPin(raw: unknown): Pin | string {
  const d = sanitizePin(raw);
  if (!d) return 'ข้อมูลหมุดไม่ถูกต้อง';
  if (pins.length >= PIN_MAX) return `หมุดเต็มแล้ว (สูงสุด ${PIN_MAX})`;
  const pin: Pin = { id: `ad_${Date.now().toString(36)}${randomBytes(2).toString('hex')}`, ...d };
  pins.push(pin);
  save();
  return pin;
}

export function removePin(id: unknown): Pin | null {
  const i = pins.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const [p] = pins.splice(i, 1);
  save();
  return p!;
}

export function pinSummary(): string {
  const count: Record<string, number> = {};
  for (const p of pins) count[p.kind] = (count[p.kind] ?? 0) + 1;
  const parts = Object.entries(count).map(([k, n]) => `${PIN_KIND_BY_ID[k as Pin['kind']]?.nameTh ?? k} ${n}`);
  return `${pins.length} pins${parts.length ? ` (${parts.join(', ')})` : ''}`;
}
