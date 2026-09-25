/**
 * Presence client: connects to the presence server (proxied at /ws on the same origin), sends
 * our position/look and publishes nearby players on the bus. Reconnects automatically.
 * Also carries parties and dungeon runs (see apps/server).
 * Add `?player=2` to the URL to run a second, distinct player in another tab for testing.
 */
import { PARTY_RANGE_M, PRESENCE_PATH, haversine, type ChatChannel, type ClientMsg, type DungeonEntrant, type PartyInfo, type PlayerLook, type PlayerPresence, type RunTarget, type ServerMsg } from '@pw/shared';
import { bus, toast } from './bus';
import { paperdollOf } from './paperdoll';
import { playerSetup } from './party';
import { autoHunt } from './autohunt';
import { walk } from './walk';
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

export function look(): PlayerLook {
  const d = paperdollOf(store.s);
  return {
    appearance: d.appearance ?? { skin: 0, hairStyle: 'short', hairColor: 0, outfit: 0 },
    classId: store.s.classId,
    helmet: d.helmet,
    chest: d.chest,
    weapon: d.weapon,
    accessory: d.accessory,
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
  /** Current party (null = solo). */
  party: PartyInfo | null = null;
  /** Latest nearby players from the server. */
  players: PlayerPresence[] = [];

  get inParty(): boolean {
    return !!this.party;
  }

  get isLeader(): boolean {
    return !this.party || this.party.leader === this.id;
  }

  invite(to: string) {
    this.send({ t: 'party:invite', to });
  }

  answerInvite(from: string, accept: boolean) {
    this.send({ t: 'party:answer', from, accept });
  }

  leaveParty() {
    this.send({ t: 'party:leave' });
  }

  sendChat(text: string, channel: ChatChannel) {
    this.send({ t: 'chat', text, channel });
  }

  kick(id: string) {
    this.send({ t: 'party:kick', id });
  }

  /** A shared fight waiting to begin (ready check or field pull-in). */
  pendingRun: { id: string; target: RunTarget } | null = null;
  /** Set while we are the one opening a run: we answer our own prepare automatically. */
  private opening: { auto: boolean; at: number } | null = null;

  /** Another party member is close enough to join a fight with us. */
  partyNearby(): boolean {
    const me = walk.position;
    if (!this.party || !this.connected || !me) return false;
    const ids = new Set(this.party.members.map((m) => m.id));
    return this.players.some((p) => ids.has(p.id) && p.id !== this.id && haversine(me, p) <= PARTY_RANGE_M);
  }

  /** Open a shared fight: a dungeon (leader, needs everyone's accept) or a field fight (pulls in nearby members). */
  openRun(target: RunTarget, auto = false) {
    if (!this.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์', 'bad');
    if (this.pendingRun || (this.opening && Date.now() - this.opening.at < 5000)) return;
    this.opening = { auto, at: Date.now() };
    this.send({ t: 'run:open', target });
  }

  /** Answer a dungeon ready check. */
  answerRun(runId: string, accept: boolean) {
    this.send({ t: 'run:ready', runId, entrant: accept && this.canJoin() ? this.entrant() : null });
  }

  private canJoin(): boolean {
    return !this.busy && !!store.data && !walk.tooFast;
  }

  /** This player's entry for a dungeon run: combat setup with their own potions, and their look. */
  entrant(): DungeonEntrant {
    const s = store.s;
    const setup = playerSetup(s);
    setup.id = this.id;
    setup.items = { red_potion: s.bag.red_potion ?? 0, blue_elixir: s.bag.blue_elixir ?? 0 };
    return { setup, look: look() };
  }

  start() {
    this.connect();
    bus.on('position', (p) => {
      this.lastPos = { lat: p.lat, lng: p.lng };
      if (Date.now() - this.lastSent >= POS_INTERVAL_MS) this.sendPos();
    });
    window.setInterval(() => this.sendPos(), POS_INTERVAL_MS * 2); // keep-alive while standing still
    store.subscribe(() => this.sendState());
    bus.on('battle:launched', () => this.setBusy(true));
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
      this.onMessage(msg);
    };
    ws.onclose = () => {
      if (this.connected) bus.emit('net', { connected: false, online: 0 });
      this.players = [];
      this.connected = false;
      bus.emit('players', { players: [] });
      // The server keeps the party through a short reconnect; show solo until it resends.
      this.party = null;
      bus.emit('party', { party: null });
      this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  private onMessage(msg: ServerMsg) {
    switch (msg.t) {
      case 'players':
        this.players = msg.players;
        bus.emit('players', { players: msg.players });
        break;
      case 'party:state':
        this.party = msg.party;
        bus.emit('party', { party: msg.party });
        break;
      case 'party:invited':
        bus.emit('party:invited', { from: msg.from, name: msg.name, level: msg.level });
        break;
      case 'notice':
        toast(msg.text, msg.kind);
        break;
      case 'chat':
        bus.emit('chat:recv', { from: msg.from, name: msg.name, text: msg.text, channel: msg.channel, at: msg.at });
        break;
      case 'run:prepare': {
        this.pendingRun = { id: msg.runId, target: msg.target };
        const mine = !!this.opening;
        if (msg.target.kind === 'DUNGEON') autoHunt.stop();
        // Field fights join automatically; so does whoever opened the run. Dungeons wait for "accept".
        if (mine || !msg.needAccept) this.send({ t: 'run:ready', runId: msg.runId, entrant: this.canJoin() ? this.entrant() : null });
        bus.emit('run:prepare', { runId: msg.runId, target: msg.target, openedBy: msg.openedBy, needAccept: msg.needAccept, timeoutMs: msg.timeoutMs, mine });
        break;
      }
      case 'run:status':
        bus.emit('run:status', { runId: msg.runId, accepted: msg.accepted, waiting: msg.waiting });
        break;
      case 'run:cancel':
        this.pendingRun = null;
        this.opening = null;
        bus.emit('run:end', { runId: msg.runId });
        toast(msg.reason, 'bad');
        break;
      case 'run:begin': {
        const auto = this.opening ? this.opening.auto : autoHunt.enabled;
        this.pendingRun = null;
        this.opening = null;
        bus.emit('run:end', { runId: msg.runId });
        if (this.busy) return toast('เข้าร่วมไม่ได้ — กำลังต่อสู้อยู่', 'bad');
        const t = msg.target;
        if (t.kind === 'FIELD' && msg.entrants.length > 1 && !auto) toast(`👥 สู้ด้วยกันกับปาร์ตี้ (${msg.entrants.length} คน)`, 'good');
        bus.emit('battle:start', {
          kind: t.kind,
          monsterIds: t.monsterIds ?? [],
          spawn: t.spawn,
          auto: t.kind === 'FIELD' && auto,
          run: { target: t, seed: msg.seed, entrants: msg.entrants, meId: this.id },
        });
        break;
      }
    }
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
