/**
 * Presence server (Phase A — LAN testing). Tracks connected players' positions and, once a
 * second, sends each client the players within PRESENCE_RADIUS_M of it. Also hosts parties and
 * coordinates dungeon runs: it collects each member's setup and hands everyone the same
 * (dungeon, seed, entrants) — clients simulate the identical fight locally.
 *
 *   npm run server          (or `npm run dev:all` to start it together with the game)
 */
import { WebSocketServer, type WebSocket } from 'ws';
import {
  DUNGEON_BY_ID,
  DUNGEON_READY_TIMEOUT_MS,
  PARTY_INVITE_TTL_MS,
  PARTY_MAX,
  PARTY_RANGE_M,
  PRESENCE_PORT,
  PRESENCE_RADIUS_M,
  PRESENCE_TICK_MS,
  PRESENCE_TIMEOUT_MS,
  haversine,
  type ClientMsg,
  type DungeonEntrant,
  type PartyInfo,
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

interface Party {
  id: string;
  leader: string;
  members: string[];
}

interface Run {
  id: string;
  dungeonId: string;
  members: string[];
  entrants: Map<string, DungeonEntrant | null>;
  timer: NodeJS.Timeout;
}

const sessions = new Set<Session>();
const parties = new Map<string, Party>();
const partyOf = new Map<string, string>();
/** invitee → (inviter → expiresAt) */
const invites = new Map<string, Map<string, number>>();
const runs = new Map<string, Run>();
let counter = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

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
        // Back from a reload: resend the party this player still belongs to.
        if (partyOf.has(s.id)) broadcastParty(partyOf.get(s.id)!);
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
      default:
        if (s.id) handleParty(s, msg);
    }
  });

  ws.on('close', () => {
    sessions.delete(s);
    console.log(`[-] ${s.name || 'anonymous'} left (${sessions.size} open)`);
    const id = s.id;
    if (!id || !partyOf.has(id) || byId(id)) return;
    broadcastParty(partyOf.get(id)!);
    // Short grace period so a page reload keeps you in the party.
    setTimeout(() => {
      if (!byId(id)) leaveParty(id);
    }, 30_000);
  });
});

function onlineCount(): number {
  let n = 0;
  for (const s of sessions) if (s.id) n++;
  return n;
}

// ---------------------------------------------------------------------------------------------
// Parties

function byId(id: string): Session | undefined {
  for (const s of sessions) if (s.id === id) return s;
  return undefined;
}

function notice(s: Session | undefined, text: string, kind: 'info' | 'good' | 'bad' = 'info') {
  if (s) send(s.ws, { t: 'notice', text, kind });
}

function distance(a: Session, b: Session): number {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return Infinity;
  return haversine({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
}

function partyInfo(p: Party): PartyInfo {
  return {
    id: p.id,
    leader: p.leader,
    members: p.members.map((id) => {
      const m = byId(id);
      return { id, name: m?.name ?? '…', level: m?.level ?? 1, classId: m?.look?.classId ?? 'NOVICE', online: !!m };
    }),
  };
}

function broadcastParty(partyId: string) {
  const p = parties.get(partyId);
  if (!p) return;
  const info = partyInfo(p);
  for (const id of p.members) {
    const m = byId(id);
    if (m) send(m.ws, { t: 'party:state', party: info });
  }
}

function leaveParty(id: string) {
  const partyId = partyOf.get(id);
  if (!partyId) return;
  const p = parties.get(partyId)!;
  partyOf.delete(id);
  p.members = p.members.filter((m) => m !== id);
  const s = byId(id);
  if (s) send(s.ws, { t: 'party:state', party: null });
  if (p.members.length <= 1) {
    // A party of one is no party.
    for (const m of p.members) {
      partyOf.delete(m);
      const ms = byId(m);
      if (ms) send(ms.ws, { t: 'party:state', party: null });
      notice(ms, 'ปาร์ตี้ถูกยุบแล้ว');
    }
    parties.delete(partyId);
    return;
  }
  if (p.leader === id) p.leader = p.members[0]!;
  broadcastParty(partyId);
}

function handleParty(s: Session, msg: ClientMsg) {
  const me = s.id!;
  switch (msg.t) {
    case 'party:invite': {
      const to = byId(String(msg.to));
      if (!to || to.id === me) return;
      const myParty = parties.get(partyOf.get(me) ?? '');
      if (myParty && myParty.leader !== me) return notice(s, 'หัวหน้าปาร์ตี้เท่านั้นที่ชวนคนได้', 'bad');
      if (myParty && myParty.members.length >= PARTY_MAX) return notice(s, `ปาร์ตี้เต็มแล้ว (${PARTY_MAX} คน)`, 'bad');
      if (partyOf.has(to.id!)) return notice(s, `${to.name} อยู่ในปาร์ตี้อื่นแล้ว`, 'bad');
      if (distance(s, to) > PARTY_RANGE_M) return notice(s, `ต้องอยู่ใกล้กันไม่เกิน ${PARTY_RANGE_M} ม.`, 'bad');
      let pending = invites.get(to.id!);
      if (!pending) invites.set(to.id!, (pending = new Map()));
      pending.set(me, Date.now() + PARTY_INVITE_TTL_MS);
      send(to.ws, { t: 'party:invited', from: me, name: s.name, level: s.level });
      notice(s, `ส่งคำชวนถึง ${to.name} แล้ว`);
      break;
    }
    case 'party:answer': {
      const from = String(msg.from);
      const exp = invites.get(me)?.get(from);
      invites.get(me)?.delete(from);
      const inviter = byId(from);
      if (!msg.accept) return notice(inviter, `${s.name} ปฏิเสธคำชวน`);
      if (!exp || exp < Date.now() || !inviter) return notice(s, 'คำชวนหมดอายุแล้ว', 'bad');
      if (partyOf.has(me)) return notice(s, 'คุณอยู่ในปาร์ตี้อยู่แล้ว', 'bad');
      let partyId = partyOf.get(from);
      if (!partyId) {
        partyId = newId('party_');
        parties.set(partyId, { id: partyId, leader: from, members: [from] });
        partyOf.set(from, partyId);
      }
      const p = parties.get(partyId)!;
      if (p.members.length >= PARTY_MAX) return notice(s, 'ปาร์ตี้เต็มแล้ว', 'bad');
      p.members.push(me);
      partyOf.set(me, partyId);
      broadcastParty(partyId);
      for (const id of p.members) notice(byId(id), `${s.name} เข้าร่วมปาร์ตี้`, 'good');
      break;
    }
    case 'party:leave':
      leaveParty(me);
      break;
    case 'party:kick': {
      const p = parties.get(partyOf.get(me) ?? '');
      const target = String(msg.id);
      if (!p || p.leader !== me || target === me || !p.members.includes(target)) return;
      notice(byId(target), 'คุณถูกเชิญออกจากปาร์ตี้', 'bad');
      leaveParty(target);
      break;
    }
    case 'dungeon:open':
      openDungeon(s, String(msg.dungeonId));
      break;
    case 'dungeon:ready': {
      const run = runs.get(String(msg.runId));
      if (!run || !run.members.includes(me) || run.entrants.has(me)) return;
      run.entrants.set(me, sanitizeEntrant(s, msg.entrant));
      if (run.entrants.size === run.members.length) beginRun(run);
      break;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Dungeon runs

function openDungeon(s: Session, dungeonId: string) {
  const def = DUNGEON_BY_ID[dungeonId];
  if (!def) return;
  const p = parties.get(partyOf.get(s.id!) ?? '');
  if (p && p.leader !== s.id) return notice(s, 'หัวหน้าปาร์ตี้เป็นคนเปิดดันเจี้ยน', 'bad');
  if (s.level < def.minLevel) return notice(s, `ต้อง Lv.${def.minLevel} ขึ้นไป`, 'bad');
  const members: string[] = [s.id!];
  for (const id of p?.members ?? []) {
    if (id === s.id) continue;
    const m = byId(id);
    const why = !m
      ? 'ออฟไลน์'
      : m.busy
        ? 'กำลังต่อสู้'
        : distance(s, m) > PARTY_RANGE_M
          ? `อยู่ไกลเกิน ${PARTY_RANGE_M} ม.`
          : m.level < def.minLevel
            ? `เลเวลไม่ถึง ${def.minLevel}`
            : '';
    if (why) {
      for (const x of p!.members) notice(byId(x), `${m?.name ?? 'สมาชิก'} ไม่ได้เข้าดันเจี้ยน (${why})`, 'bad');
      continue;
    }
    members.push(id);
  }
  const run: Run = {
    id: newId('run_'),
    dungeonId,
    members,
    entrants: new Map(),
    timer: setTimeout(() => beginRun(run), DUNGEON_READY_TIMEOUT_MS),
  };
  runs.set(run.id, run);
  for (const id of members) {
    const m = byId(id);
    if (m) send(m.ws, { t: 'dungeon:prepare', runId: run.id, dungeonId });
  }
  console.log(`    dungeon ${dungeonId} opened by ${s.name} for ${members.length}`);
}

/** LAN phase: setups are trusted but pinned to the sender. Server-side stat rebuild comes with accounts. */
function sanitizeEntrant(s: Session, e: DungeonEntrant | null): DungeonEntrant | null {
  if (!e || typeof e !== 'object' || !e.setup || !e.look) return null;
  const setup = { ...e.setup, id: s.id!, name: s.name, level: s.level, passive: false };
  setup.row = setup.row === 'BACK' ? 'BACK' : 'FRONT';
  setup.deck = Array.isArray(setup.deck) ? setup.deck.slice(0, 6).map(String) : [];
  return { setup, look: e.look };
}

function beginRun(run: Run) {
  if (!runs.has(run.id)) return;
  runs.delete(run.id);
  clearTimeout(run.timer);
  const leaderId = run.members[0]!;
  if (!run.entrants.get(leaderId)) {
    for (const id of run.members) notice(byId(id), 'ยกเลิกการเข้าดันเจี้ยน', 'bad');
    return;
  }
  const entrants = run.members.map((id) => run.entrants.get(id)).filter((e): e is DungeonEntrant => !!e);
  for (const id of run.members) {
    if (!run.entrants.get(id)) notice(byId(id), 'คุณไม่ได้เข้าดันเจี้ยนรอบนี้', 'bad');
  }
  const seed = Math.floor(Math.random() * 2 ** 31);
  for (const e of entrants) {
    const m = byId(e.setup.id);
    if (m) send(m.ws, { t: 'dungeon:begin', runId: run.id, dungeonId: run.dungeonId, seed, entrants });
  }
  console.log(`    dungeon ${run.dungeonId} begins with ${entrants.length} (leader ${byId(leaderId)?.name})`);
}

// ---------------------------------------------------------------------------------------------
// Presence broadcast

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
    const myParty = partyOf.get(me.id);
    if (me.lat !== null && me.lng !== null) {
      for (const p of located) {
        if (p === me || p.id === me.id) continue;
        // Party members always see each other; everyone else only within the presence radius.
        const sameParty = !!myParty && partyOf.get(p.id!) === myParty;
        if (!sameParty && haversine({ lat: me.lat, lng: me.lng }, { lat: p.lat!, lng: p.lng! }) > PRESENCE_RADIUS_M) continue;
        players.push({ id: p.id!, name: p.name, level: p.level, look: p.look!, lat: p.lat!, lng: p.lng!, age: now - p.lastSeen, busy: p.busy });
      }
    }
    send(me.ws, { t: 'players', players, online });
  }
}, PRESENCE_TICK_MS);

console.log(`Pixel Walker presence server on ws://0.0.0.0:${wss.options.port}`);
