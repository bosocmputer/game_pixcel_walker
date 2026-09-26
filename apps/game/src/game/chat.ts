/**
 * Chat state: history for the chat window, local mute list, and sending (with the same
 * sanitise / cooldown rules the server applies). Every line — ours or someone else's — is
 * published as the `chat` bus event, which draws the speech bubble on the map.
 */
import { CHAT_HISTORY, chatAllowed, sanitizeChat, type ChatChannel, type ChatLine } from '@pw/shared';
import { bus, toast } from './bus';
import { net } from './net';
import { store } from '../state/store';

const MUTE_KEY = 'pw.muted';

function loadMuted(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(MUTE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

class Chat {
  readonly lines: ChatLine[] = [];
  private muted = loadMuted();
  private lastSent = 0;
  unread = 0;

  constructor() {
    bus.on('chat:recv', (line) => {
      if (this.muted.has(line.from)) return;
      this.push(line);
    });
  }

  isMuted(id: string): boolean {
    return this.muted.has(id);
  }

  toggleMute(id: string): boolean {
    if (this.muted.has(id)) this.muted.delete(id);
    else this.muted.add(id);
    try {
      localStorage.setItem(MUTE_KEY, JSON.stringify([...this.muted]));
    } catch {
      /* ignore */
    }
    return this.muted.has(id);
  }

  /** Sends a line; returns false if it was empty or too soon. */
  send(raw: string, channel: ChatChannel): boolean {
    const text = sanitizeChat(raw);
    if (!text) return false;
    const now = Date.now();
    if (!chatAllowed(this.lastSent, now)) {
      toast('พิมพ์เร็วเกินไป รอสักครู่', 'bad');
      return false;
    }
    if (channel === 'party' && !net.inParty) channel = 'near';
    this.lastSent = now;
    net.sendChat(text, channel);
    this.push({ from: net.id, name: store.s.name, text, channel, at: now });
    return true;
  }

  private push(line: ChatLine) {
    this.lines.push(line);
    if (this.lines.length > CHAT_HISTORY) this.lines.shift();
    if (line.from !== net.id) this.unread++;
    bus.emit('chat', { ...line, mine: line.from === net.id });
  }
}

export const chat = new Chat();
