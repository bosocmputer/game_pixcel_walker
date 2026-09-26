/**
 * Admin-placed map pins (MASTER_SPEC §10). The map no longer turns real POIs into landmarks by
 * itself: an admin places every gate, shop and service by hand, the presence server stores them
 * and sends them to everyone. A pin's `kind` decides what it is — its boss (LANDMARK_BOSS), its
 * shop (SHOPS[].landmark) or its service — exactly like the old POI landmarks.
 */
import { LANDMARK_BOSS } from '../data/monsters';
import type { Landmark } from '../data/map';
import type { LandmarkKind } from '../types';

export type PinGroup = 'GATE' | 'SERVICE';

export interface PinKindDef {
  kind: LandmarkKind;
  group: PinGroup;
  /** Default label (generic, brand-free). */
  nameTh: string;
}

/** Kinds an admin can place, in picker order. Gates first (they also host a shop where one exists). */
export const PIN_KINDS: PinKindDef[] = [
  { kind: 'CONVENIENCE', group: 'GATE', nameTh: 'ร้านสะดวกซื้อ' },
  { kind: 'MALL', group: 'GATE', nameTh: 'ห้างสรรพสินค้า' },
  { kind: 'FUEL', group: 'GATE', nameTh: 'ปั๊มน้ำมัน' },
  { kind: 'STATION', group: 'GATE', nameTh: 'สถานี' },
  { kind: 'PARK', group: 'GATE', nameTh: 'สวนสาธารณะ' },
  { kind: 'MUSEUM', group: 'GATE', nameTh: 'โบราณสถาน' },
  { kind: 'TEMPLE', group: 'GATE', nameTh: 'วัด' },
  { kind: 'MARKET', group: 'SERVICE', nameTh: 'ตลาด' },
  { kind: 'HOSPITAL', group: 'SERVICE', nameTh: 'โรงพยาบาล' },
  { kind: 'SANCTUARY', group: 'SERVICE', nameTh: 'ศาสนสถาน' },
];
export const PIN_KIND_BY_ID = Object.fromEntries(PIN_KINDS.map((k) => [k.kind, k])) as Partial<Record<LandmarkKind, PinKindDef>>;

export const PIN_LABEL_MAX = 30;
/** Hard cap so a leaked admin key can't flood every client. */
export const PIN_MAX = 2000;

/** What the admin sends to create a pin (the server assigns the id). */
export interface PinDraft {
  kind: LandmarkKind;
  label: string;
  lat: number;
  lng: number;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validates an admin's pin draft. Returns a clean draft, or null when it isn't a valid pin. */
export function sanitizePin(raw: unknown): PinDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const def = PIN_KIND_BY_ID[r.kind as LandmarkKind];
  if (!def) return null;
  if (!finite(r.lat) || !finite(r.lng) || Math.abs(r.lat) > 85 || Math.abs(r.lng) > 180) return null;
  const label = [...String(r.label ?? '').replace(/\s+/g, ' ').replace(/[<>]/g, '').trim()].slice(0, PIN_LABEL_MAX).join('').trim();
  // 6 decimals ≈ 10 cm — plenty, and keeps the pin file small.
  const round = (v: number) => Math.round(v * 1e6) / 1e6;
  return { kind: def.kind, label: label || def.nameTh, lat: round(r.lat), lng: round(r.lng) };
}

/** Whether a pin opens a gate (has a boss). */
export function pinIsGate(kind: LandmarkKind): boolean {
  return !!LANDMARK_BOSS[kind];
}

/** A stored pin as players receive it. */
export type Pin = Landmark;
