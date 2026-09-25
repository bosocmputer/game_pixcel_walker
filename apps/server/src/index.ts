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
  DUNGEON_ACCEPT_TIMEOUT_MS,
  DUNGEON_BY_ID,
  FIELD_READY_TIMEOUT_MS,
  MONSTERS,
  PARTY_INVITE_TTL_MS,
  PARTY_LEASH_GRACE_MS,
  PARTY_MAX,
  PARTY_RANGE_M,
  PRESENCE_PORT,
  PRESENCE_RADIUS_M,
  PRESENCE_TICK_MS,
  PRESENCE_TIMEOUT_MS,
  chatAllowed,
  haversine,
  sanitizeChat,
  isolatedMembers,
  type ClientMsg,
  type DungeonEntrant,
  type PartyInfo,
  type PlayerLook,
  type PlayerPresence,
  type RunTarget,
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
  lastChat: number;
}

interface Party {
  id: string;
  leader: string;
  members: string[];
}

interface Run {
  id: string;
  target: RunTarget;
  openedBy: string;
  needAccept: boolean;
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
/** Player -> pending run they are part of (one at a time). */
const runOf = new Map<string, string>();
/** Party member -> when they were first seen out of range. */
const outSince = new Map<string, number>();
let counter = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

const wss = new WebSocketServer({ port: Number(process.env.PORT ?? PRESENCE_PORT) });

const send = (ws: WebSocket, msg: ServerMsg) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

const clampStr = (s: unknown, n: number) => String(s ?? '').slice(0, n);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

wss.on('connection', (ws, req) => {
  const s: Session = { ws, id: null, name: '', level: 1, look: null, lat: null, lng: null, busy: false, lastSeen: Date.now(), lastChat: 0 };
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
      case 'chat':
        if (s.id) handleChat(s, msg.text, msg.channel);
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
  outSince.delete(id);
  p.members = p.members.filter((m) => m !== id);
  const s = byId(id);
  if (s) send(s.ws, { t: 'party:state', party: null });
  if (p.members.length <= 1) {
    // A party of one is no party.
    for (const m of p.members) {
      partyOf.delete(m);
      outSince.delete(m);
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
    case 'run:open':
      if (msg.target?.kind === 'DUNGEON') openDungeon(s, String(msg.target.dungeonId));
      else if (msg.target?.kind === 'FIELD') openField(s, msg.target);
      break;
    case 'run:ready': {
      const run = runs.get(String(msg.runId));
      if (!run || !run.members.includes(me) || run.entrants.has(me)) return;
      const entrant = sanitizeEntrant(s, msg.entrant);
      run.entrants.set(me, entrant);
      if (run.needAccept) {
        // Dungeons: everyone must accept - one "no" cancels the run.
        if (!entrant) return cancelRun(run, `${s.name} ปฏิเสธการเข้าดันเจี้ยน`);
        sendStatus(run);
      }
      if (run.entrants.size === run.members.length) beginRun(run);
      break;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Dungeon runs

function partyOfSession(s: Session): Party | undefined {
  return parties.get(partyOf.get(s.id!) ?? '');
}

function startRun(target: RunTarget, opener: Session, members: string[], needAccept: boolean) {
  const timeoutMs = needAccept ? DUNGEON_ACCEPT_TIMEOUT_MS : FIELD_READY_TIMEOUT_MS;
  const run: Run = {
    id: newId('run_'),
    target,
    openedBy: opener.id!,
    needAccept,
    members,
    entrants: new Map(),
    timer: setTimeout(() => (needAccept ? cancelRun(run, `หมดเวลา — ${waitingNames(run).join(', ')} ไม่ได้กดยอมรับ`) : beginRun(run)), timeoutMs),
  };
  runs.set(run.id, run);
  for (const id of members) {
    runOf.set(id, run.id);
    const m = byId(id);
    if (m) send(m.ws, { t: 'run:prepare', runId: run.id, target, openedBy: opener.name, needAccept, timeoutMs });
  }
  if (needAccept) sendStatus(run);
  console.log(`    run ${target.kind} ${target.dungeonId ?? target.monsterIds?.join('+')} opened by ${opener.name} for ${members.length}`);
}

/** Why a party member can't join a run right now ('' = can). */
function unavailable(opener: Session, id: string, minLevel = 1): string {
  const m = byId(id);
  if (!m) return 'ออฟไลน์';
  if (runOf.has(id)) return 'กำลังเตรียมเข้าต่อสู้อื่น';
  if (m.busy) return 'กำลังต่อสู้';
  if (distance(opener, m) > PARTY_RANGE_M) return `อยู่ไกลเกิน ${PARTY_RANGE_M} ม.`;
  if (m.level < minLevel) return `เลเวลไม่ถึง ${minLevel}`;
  return '';
}

function openDungeon(s: Session, dungeonId: string) {
  const def = DUNGEON_BY_ID[dungeonId];
  if (!def) return;
  const p = partyOfSession(s);
  if (p && p.leader !== s.id) return notice(s, 'หัวหน้าปาร์ตี้เป็นคนเปิดดันเจี้ยน', 'bad');
  if (runOf.has(s.id!)) return;
  if (s.level < def.minLevel) return notice(s, `ต้อง Lv.${def.minLevel} ขึ้นไป`, 'bad');
  // The whole party goes in together, so everyone has to be able to.
  for (const id of p?.members ?? []) {
    if (id === s.id) continue;
    const why = unavailable(s, id, def.minLevel);
    if (why) return notice(s, `${byId(id)?.name ?? 'สมาชิก'} เข้าไม่ได้ (${why})`, 'bad');
  }
  const members = [s.id!, ...(p?.members ?? []).filter((id) => id !== s.id)];
  startRun({ kind: 'DUNGEON', dungeonId }, s, members, true);
}

function openField(s: Session, target: RunTarget) {
  const monsterIds = (target.monsterIds ?? []).map(String).filter((id) => MONSTERS[id] && !MONSTERS[id]!.boss).slice(0, 5);
  if (!monsterIds.length || runOf.has(s.id!)) return;
  const p = partyOfSession(s);
  // Party members nearby are pulled in automatically; the rest keep doing their thing.
  const members = [s.id!, ...(p?.members ?? []).filter((id) => id !== s.id && !unavailable(s, id))];
  const spawn = target.spawn && typeof target.spawn.id === 'string' ? { id: target.spawn.id.slice(0, 80), expiresAt: Number(target.spawn.expiresAt) || 0 } : undefined;
  startRun({ kind: 'FIELD', monsterIds, spawn }, s, members, false);
}

function waitingNames(run: Run): string[] {
  return run.members.filter((id) => !run.entrants.get(id)).map((id) => byId(id)?.name ?? '…');
}

function sendStatus(run: Run) {
  const accepted = run.members.filter((id) => run.entrants.get(id)).map((id) => byId(id)?.name ?? '…');
  const waiting = waitingNames(run);
  for (const id of run.members) {
    const m = byId(id);
    if (m) send(m.ws, { t: 'run:status', runId: run.id, accepted, waiting });
  }
}

function endRun(run: Run) {
  runs.delete(run.id);
  clearTimeout(run.timer);
  for (const id of run.members) if (runOf.get(id) === run.id) runOf.delete(id);
}

function cancelRun(run: Run, reason: string) {
  if (!runs.has(run.id)) return;
  endRun(run);
  for (const id of run.members) {
    const m = byId(id);
    if (m) send(m.ws, { t: 'run:cancel', runId: run.id, reason });
  }
  console.log(`    run cancelled: ${reason}`);
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
  endRun(run);
  if (!run.entrants.get(run.openedBy)) {
    for (const id of run.members) {
      const m = byId(id);
      if (m) send(m.ws, { t: 'run:cancel', runId: run.id, reason: 'ยกเลิกการต่อสู้' });
    }
    return;
  }
  const entrants = run.members.map((id) => run.entrants.get(id)).filter((e): e is DungeonEntrant => !!e);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const openedBy = byId(run.openedBy)?.name ?? '';
  for (const id of run.members) {
    const m = byId(id);
    if (!m) continue;
    if (run.entrants.get(id)) send(m.ws, { t: 'run:begin', runId: run.id, target: run.target, seed, entrants, openedBy });
    else send(m.ws, { t: 'run:cancel', runId: run.id, reason: 'ไม่ได้เข้าร่วมการต่อสู้รอบนี้' });
  }
  console.log(`    run ${run.target.kind} begins with ${entrants.length} (opened by ${openedBy})`);
}

// ---------------------------------------------------------------------------------------------
// Party leash: wander out of range of everyone else in the party and you drop out.

// ---------------------------------------------------------------------------------------------
// Chat — the server is the authority: re-sanitise, rate-limit, and pick who hears the line.
// "near" = exactly the players who can already see you on their map (presence radius), so a
// stranger never learns more than they already see; "party" = your party wherever they are.

function handleChat(s: Session, raw: unknown, channel: unknown) {
  const now = Date.now();
  if (!chatAllowed(s.lastChat, now)) return notice(s, 'พิมพ์เร็วเกินไป รอสักครู่', 'bad');
  const text = sanitizeChat(raw);
  if (!text) return;
  s.lastChat = now;
  const ch = channel === 'party' ? 'party' : 'near';
  const partyId = partyOf.get(s.id!);
  if (ch === 'party' && !partyId) return notice(s, 'ยังไม่มีปาร์ตี้', 'bad');
  const line: ServerMsg = { t: 'chat', from: s.id!, name: s.name, text, channel: ch, at: now };
  for (const o of sessions) {
    if (o === s || !o.id || o.id === s.id) continue;
    const hears =
      ch === 'party'
        ? partyOf.get(o.id) === partyId
        : s.lat !== null && s.lng !== null && o.lat !== null && o.lng !== null &&
          (partyOf.get(o.id) === partyId && !!partyId
            ? true
            : haversine({ lat: s.lat, lng: s.lng }, { lat: o.lat, lng: o.lng }) <= PRESENCE_RADIUS_M);
    if (hears) send(o.ws, line);
  }
}

function checkLeash(now: number) {
  for (const p of [...parties.values()]) {
    const located = p.members
      .map((id) => byId(id))
      .filter((m): m is Session => !!m && !m.busy && !runOf.has(m.id!))
      .map((m) => ({ id: m.id!, lat: m.lat, lng: m.lng }));
    const out = new Set(isolatedMembers(located, PARTY_RANGE_M));
    for (const id of [...p.members]) {
      if (!out.has(id)) {
        if (outSince.delete(id)) notice(byId(id), 'กลับเข้าระยะปาร์ตี้แล้ว', 'good');
        continue;
      }
      const since = outSince.get(id);
      if (since === undefined) {
        outSince.set(id, now);
        notice(byId(id), `⚠️ ออกนอกระยะปาร์ตี้ ${PARTY_RANGE_M} ม. — กลับมาภายใน ${PARTY_LEASH_GRACE_MS / 1000} วิ ไม่งั้นจะหลุดปาร์ตี้`, 'bad');
      } else if (now - since > PARTY_LEASH_GRACE_MS) {
        const name = byId(id)?.name ?? 'สมาชิก';
        for (const other of p.members) if (other !== id) notice(byId(other), `${name} ออกนอกระยะ — หลุดจากปาร์ตี้`);
        notice(byId(id), 'คุณออกนอกระยะ — หลุดจากปาร์ตี้แล้ว', 'bad');
        leaveParty(id);
        if (!parties.has(p.id)) break;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Presence broadcast

setInterval(() => {
  const now = Date.now();
  checkLeash(now);
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
