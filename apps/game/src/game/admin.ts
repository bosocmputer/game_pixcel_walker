/**
 * Admin-placed map pins on the client (MASTER_SPEC §10): keeps the pin list (cached for offline
 * play), the admin login and the "tap the map to place a pin" mode. The server is the authority —
 * it checks the admin key on every change and broadcasts the new list to everyone.
 */
import { PIN_KIND_BY_ID, haversine, type LandmarkKind, type Pin } from '@pw/shared';
import { bus, toast } from './bus';
import { net } from './net';
import { setPins } from './world';

const PINS_KEY = 'pw.pins';
const ADMIN_KEY = 'pw.adminKey';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

class Admin {
  pins: Pin[] = [];
  /** Server confirmed our key on this connection. */
  isAdmin = false;
  /** Kind + label waiting for a tap on the map (null = not placing). */
  placing: { kind: LandmarkKind; label: string } | null = null;
  private key = read(ADMIN_KEY) ?? '';
  private pendingAdd: { kind: LandmarkKind; lat: number; lng: number } | null = null;

  start() {
    try {
      const cached = JSON.parse(read(PINS_KEY) ?? '[]') as Pin[];
      if (Array.isArray(cached)) this.apply(cached);
    } catch {
      /* ignore a broken cache */
    }
    bus.on('pins', ({ pins }) => {
      this.apply(pins);
      write(PINS_KEY, JSON.stringify(pins));
      const p = this.pendingAdd;
      if (p && pins.some((x) => x.kind === p.kind && haversine(x, p) < 2)) {
        this.pendingAdd = null;
        toast(`วางหมุด ${PIN_KIND_BY_ID[p.kind]?.nameTh ?? ''} แล้ว`, 'good');
      }
    });
    bus.on('admin', ({ ok }) => {
      const was = this.isAdmin;
      this.isAdmin = ok;
      if (!ok) {
        this.placing = null;
        if (this.key) toast('รหัสแอดมินไม่ถูกต้อง', 'bad');
        this.key = '';
        write(ADMIN_KEY, null);
      } else if (!was) toast('เข้าโหมดแอดมินแล้ว — วางหมุดได้จากปุ่ม PIN', 'good');
      bus.emit('admin:changed', { isAdmin: this.isAdmin });
    });
    // Log back in on every (re)connect with the key remembered on this device.
    bus.on('net', ({ connected }) => {
      if (!connected) {
        this.isAdmin = false;
        bus.emit('admin:changed', { isAdmin: false });
      } else if (this.key && !this.isAdmin) net.adminLogin(this.key);
    });
  }

  private apply(pins: Pin[]) {
    this.pins = pins;
    setPins(pins);
  }

  login(key: string) {
    if (!net.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์', 'bad');
    this.key = key.trim();
    write(ADMIN_KEY, this.key);
    net.adminLogin(this.key);
  }

  logout() {
    this.key = '';
    this.isAdmin = false;
    this.placing = null;
    write(ADMIN_KEY, null);
    bus.emit('admin:changed', { isAdmin: false });
  }

  /** Start "tap the map" placement. */
  beginPlacing(kind: LandmarkKind, label: string) {
    this.placing = { kind, label };
    bus.emit('admin:changed', { isAdmin: this.isAdmin });
  }

  cancelPlacing() {
    this.placing = null;
    bus.emit('admin:changed', { isAdmin: this.isAdmin });
  }

  /** Places the pending pin at a map position (one pin per tap). */
  placeAt(lat: number, lng: number) {
    const p = this.placing;
    if (!p) return;
    this.placing = null;
    this.add(p.kind, p.label, lat, lng);
    bus.emit('admin:changed', { isAdmin: this.isAdmin });
  }

  add(kind: LandmarkKind, label: string, lat: number, lng: number) {
    if (!this.isAdmin || !net.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ในโหมดแอดมิน', 'bad');
    this.pendingAdd = { kind, lat, lng };
    net.addPin(this.key, { kind, label, lat, lng });
  }

  remove(id: string) {
    if (!this.isAdmin || !net.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ในโหมดแอดมิน', 'bad');
    net.removePin(this.key, id);
  }
}

export const admin = new Admin();
