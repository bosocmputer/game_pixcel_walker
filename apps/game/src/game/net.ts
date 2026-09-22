/**
 * Presence client: connects to the presence server (proxied at /ws on the same origin), sends
 * our position/look and publishes nearby players on the bus. Reconnects automatically.
 * Add `?player=2` to the URL to run a second, distinct player in another tab for testing.
 */
import { PRESENCE_PATH, type ClientMsg, type PlayerLook, type ServerMsg } from '@pw/shared';
import { bus } from './bus';
import { paperdollOf } from './paperdoll';
import { store } from '../state/store';

const POS_INTERVAL_MS = 1000;

const slot = new URLSearchParams(location.search).get('player');

function playerId(): string {
  let id = '';
  try {
    id = localStorage.getItem('pw.playerId') ?? '';
    if (!id) {
      id = `p_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('pw.playerId', id);
    }
  } catch {
    id = `p_${Math.random().toString(36).slice(2, 10)}`;
  }
  return slot ? `${id}_${slot}` : id;
}

function look(): PlayerLook {
  const d = paperdollOf(store.s);
  return {
    appearance: d.appearance ?? { skin: 0, hairStyle: 'short', hairColor: 0, outfit: 0 },
    classId: store.s.classId,
    helmet: d.helmet,
    chest: d.chest,
    weapon: d.weapon,
    boots: d.boots,
    aura: d.aura ?? null,
  };
}

class Net {
  connected = false;
  online = 0;
  readonly id = playerId();
  private ws: WebSocket | null = null;
  private retry = 1000;
  private lastPos: { lat: number; lng: number } | null = null;
  private lastSent = 0;
  private busy = false;
  private lastState = '';

  start() {
    this.connect();
    bus.on('position', (p) => {
      this.lastPos = { lat: p.lat, lng: p.lng };
      if (Date.now() - this.lastSent >= POS_INTERVAL_MS) this.sendPos();
    });
    window.setInterval(() => this.sendPos(), POS_INTERVAL_MS * 2); // keep-alive while standing still
    store.subscribe(() => this.sendState());
    bus.on('battle:start', () => this.setBusy(true));
    bus.on('battle:end', () => this.setBusy(false));
  }

  private url(): string {
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${PRESENCE_PATH}`;
  }

  private connect() {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url());
    } catch {
      return this.scheduleReconnect();
    }
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      this.retry = 1000;
      const s = store.s;
      this.send({ t: 'hello', id: this.id, name: slot ? `${s.name}#${slot}` : s.name, level: s.level, look: look() });
      this.lastState = '';
      this.sendState();
      this.sendPos();
      bus.emit('net', { connected: true, online: this.online });
    };
    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }
      if (msg.t === 'welcome' || msg.t === 'players') {
        this.online = msg.online;
        bus.emit('net', { connected: true, online: msg.online });
      }
      if (msg.t === 'players') bus.emit('players', { players: msg.players });
    };
    ws.onclose = () => {
      if (this.connected) bus.emit('net', { connected: false, online: 0 });
      this.connected = false;
      bus.emit('players', { players: [] });
      this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  private scheduleReconnect() {
    window.setTimeout(() => this.connect(), this.retry);
    this.retry = Math.min(15000, this.retry * 2);
  }

  private send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private sendPos() {
    if (!this.lastPos) return;
    this.lastSent = Date.now();
    this.send({ t: 'pos', lat: this.lastPos.lat, lng: this.lastPos.lng });
  }

  private sendState() {
    if (!store.data) return;
    const state = { level: store.s.level, look: look(), busy: this.busy };
    const key = JSON.stringify(state);
    if (key === this.lastState) return;
    this.lastState = key;
    this.send({ t: 'state', ...state });
  }

  private setBusy(busy: boolean) {
    this.busy = busy;
    this.sendState();
  }
}

export const net = new Net();
