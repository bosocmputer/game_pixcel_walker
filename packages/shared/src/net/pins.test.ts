import { describe, expect, it } from 'vitest';
import { LANDMARK_BOSS } from '../data/monsters';
import { SHOPS } from '../data/shops';
import { PIN_KINDS, PIN_LABEL_MAX, pinIsGate, sanitizePin } from './pins';

describe('admin pins', () => {
  it('accepts a valid pin and rounds its position', () => {
    expect(sanitizePin({ kind: 'MALL', label: '  ห้าง   กลางเมือง ', lat: 18.7883451234, lng: 98.9853123456 })).toEqual({
      kind: 'MALL',
      label: 'ห้าง กลางเมือง',
      lat: 18.788345,
      lng: 98.985312,
    });
  });

  it('falls back to the kind name for an empty label and cuts long ones', () => {
    expect(sanitizePin({ kind: 'HOSPITAL', label: '', lat: 1, lng: 2 })!.label).toBe('โรงพยาบาล');
    expect([...sanitizePin({ kind: 'MARKET', label: 'ต'.repeat(80), lat: 1, lng: 2 })!.label].length).toBe(PIN_LABEL_MAX);
    expect(sanitizePin({ kind: 'MARKET', label: '<b>x</b>', lat: 1, lng: 2 })!.label).toBe('bx/b');
  });

  it('rejects unknown kinds and bad positions', () => {
    expect(sanitizePin({ kind: 'CITY', label: 'x', lat: 1, lng: 2 })).toBeNull();
    expect(sanitizePin({ kind: 'NOPE', label: 'x', lat: 1, lng: 2 })).toBeNull();
    expect(sanitizePin({ kind: 'MALL', label: 'x', lat: 91, lng: 2 })).toBeNull();
    expect(sanitizePin({ kind: 'MALL', label: 'x', lat: '1', lng: 2 })).toBeNull();
    expect(sanitizePin(null)).toBeNull();
  });

  it('every placeable kind is a gate, a shop or a service', () => {
    const shopKinds = new Set(Object.values(SHOPS).map((s) => s.landmark));
    for (const k of PIN_KINDS) {
      expect(pinIsGate(k.kind)).toBe(k.group === 'GATE');
      if (k.group === 'GATE') expect(LANDMARK_BOSS[k.kind]).toBeTruthy();
      else expect(shopKinds.has(k.kind) || k.kind === 'HOSPITAL' || k.kind === 'SANCTUARY').toBe(true);
    }
  });
});
