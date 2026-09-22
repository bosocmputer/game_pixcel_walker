/**
 * Presence server (Phase A — LAN testing). Tracks connected players' positions and, once a
 * second, sends each client the players within PRESENCE_RADIUS_M of it.
 *
 *   npm run server          (or `npm run dev:all` to start it together with the game)
 */
import { WebSocketServer, type WebSocket } from 'ws';
import {
  PRESENCE_PORT,
  PRESENCE_RADIUS_M,
  PRESENCE_TICK_MS,
  PRESENCE_TIMEOUT_MS,
  haversine,
  type ClientMsg,
  type PlayerLook,
  type PlayerPresence,
  type ServerMsg,
} from '@pw/shared';

interface Session {
  ws: WebSocket;
  id: string | null;
  name: string;
  level: number;
  look: PlayerLook | null;
  lat: number | null;
  lng: number | null;
  busy: boolean;
  lastSeen: number;
}

const sessions = new Set<Session>();
const wss = new WebSocketServer({ port: Number(process.env.PORT ?? PRESENCE_PORT) });

const send = (ws: WebSocket, msg: ServerMsg) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

const clampStr = (s: unknown, n: number) => String(s ?? '').slice(0, n);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

wss.on('connection', (ws, req) => {
  const s: Session = { ws, id: null, name: '', level: 1, look: null, lat: null, lng: null, busy: false, lastSeen: Date.now() };
  sessions.add(s);
  console.log(`[+] connection from ${req.socket.remoteAddress} (${sessions.size} open)`);

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw)) as ClientMsg;
    } catch {
      return;
    }
    s.lastSeen = Date.now();
    switch (msg.t) {
      case 'hello':
        // A reconnecting player replaces their previous session.
        for (const other of sessions) if (other !== s && other.id === msg.id) other.ws.close();
        s.id = clampStr(msg.id, 40);
        s.name = clampStr(msg.name, 16);
        s.level = Math.max(1, Math.min(99, Number(msg.level) || 1));
        s.look = msg.look;
        send(ws, { t: 'welcome', id: s.id, online: onlineCount() });
        console.log(`    hello: ${s.name} (${s.id})`);
        break;
      case 'pos':
        if (finite(msg.lat) && finite(msg.lng) && Math.abs(msg.lat) <= 90 && Math.abs(msg.lng) <= 180) {
          s.lat = msg.lat;
          s.lng = msg.lng;
        }
        break;
      case 'state':
        s.level = Math.max(1, Math.min(99, Number(msg.level) || s.level));
        s.look = msg.look ?? s.look;
        s.busy = !!msg.busy;
        break;
    }
  });

  ws.on('close', () => {
    sessions.delete(s);
    console.log(`[-] ${s.name || 'anonymous'} left (${sessions.size} open)`);
  });
});

function onlineCount(): number {
  let n = 0;
  for (const s of sessions) if (s.id) n++;
  return n;
}

setInterval(() => {
  const now = Date.now();
  const located = [...sessions].filter((s) => {
    if (now - s.lastSeen > PRESENCE_TIMEOUT_MS) {
      s.ws.terminate();
      return false;
    }
    return s.id && s.look && s.lat !== null && s.lng !== null;
  });
  const online = onlineCount();
  for (const me of sessions) {
    if (!me.id) continue;
    const players: PlayerPresence[] = [];
    if (me.lat !== null && me.lng !== null) {
      for (const p of located) {
        if (p === me || p.id === me.id) continue;
        if (haversine({ lat: me.lat, lng: me.lng }, { lat: p.lat!, lng: p.lng! }) > PRESENCE_RADIUS_M) continue;
        players.push({ id: p.id!, name: p.name, level: p.level, look: p.look!, lat: p.lat!, lng: p.lng!, age: now - p.lastSeen, busy: p.busy });
      }
    }
    send(me.ws, { t: 'players', players, online });
  }
}, PRESENCE_TICK_MS);

console.log(`Pixel Walker presence server on ws://0.0.0.0:${wss.options.port}`);
