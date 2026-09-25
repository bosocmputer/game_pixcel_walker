/**
 * Chat rules shared by the client (instant local bubble) and the server (the authority, which
 * re-checks everything). Short, map-bubble sized lines; links, phone numbers and a small list of
 * swear words are masked — a real-location game must not become a way to hand strangers contacts.
 */

export type ChatChannel = 'near' | 'party';

/** Max characters per line (fits a 3-line bubble over a character). */
export const CHAT_MAX_LEN = 60;
/** Minimum gap between two lines from one player. */
export const CHAT_COOLDOWN_MS = 1500;
/** How many lines the chat window keeps. */
export const CHAT_HISTORY = 40;

export interface ChatLine {
  from: string;
  name: string;
  text: string;
  channel: ChatChannel;
  at: number;
}

/** Control, zero-width and bidi-override characters (built from code points so the source stays plain ASCII). */
const INVISIBLE = new RegExp(
  '[' +
    [[0x00, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff]]
      .map(([a, b]) => `${String.fromCharCode(a!)}-${String.fromCharCode(b!)}`)
      .join('') +
    ']',
  'g',
);
const MASK = '***';
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|co|th|io|me|ly|gg|app|link)\b\S*/gi;
/** 8+ digits, allowing spaces/dashes between them (phone numbers, account numbers). */
const PHONE = /\+?\d(?:[\s-]?\d){7,}/g;
const HANDLE = /@[\w.]{3,}/g;
/** A deliberately small starter list — extend it as the community grows. */
const SWEAR = ['fuck', 'shit', 'bitch', 'ควย', 'เหี้ย', 'สัส', 'มึง', 'เย็ด', 'แม่ง'];

/**
 * Cleans a chat line: strips control / zero-width characters, collapses spaces, cuts to
 * CHAT_MAX_LEN and masks links, phone numbers, @handles and swear words. Returns null when
 * nothing is left to send.
 */
export function sanitizeChat(raw: unknown): string | null {
  let s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .replace(INVISIBLE, '')
    .trim();
  if (!s) return null;
  s = s.replace(LINK, MASK).replace(PHONE, MASK).replace(HANDLE, MASK);
  for (const w of SWEAR) s = s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), MASK);
  s = [...s].slice(0, CHAT_MAX_LEN).join('');
  return s.replace(/\*+/g, (m) => (m.length > 3 ? MASK : m)).trim() || null;
}

/** Whether a player may send again (server and client use the same gap). */
export function chatAllowed(lastAt: number, now: number): boolean {
  return now - lastAt >= CHAT_COOLDOWN_MS;
}

/** How long a bubble stays over a character: longer lines stay longer. */
export function bubbleMs(text: string): number {
  return Math.min(8000, 3000 + [...text].length * 80);
}
