import { describe, expect, it } from 'vitest';
import { CHAT_COOLDOWN_MS, CHAT_MAX_LEN, bubbleMs, chatAllowed, sanitizeChat } from './chat';

describe('chat', () => {
  it('trims, collapses spaces and drops empty or invisible-only lines', () => {
    expect(sanitizeChat('  สวัสดี   ครับ  ')).toBe('สวัสดี ครับ');
    expect(sanitizeChat(String.fromCharCode(0x200b, 0x200b))).toBeNull();
    expect(sanitizeChat(undefined)).toBeNull();
    expect(sanitizeChat('a\nb\tc')).toBe('a b c');
  });

  it('cuts long lines to the bubble size', () => {
    const s = sanitizeChat('ก'.repeat(200))!;
    expect([...s].length).toBe(CHAT_MAX_LEN);
  });

  it('masks links, phone numbers, handles and swear words', () => {
    expect(sanitizeChat('มาที่ https://example.com/x นะ')).toBe('มาที่ *** นะ');
    expect(sanitizeChat('เว็บ shop.co.th เลย')).toBe('เว็บ *** เลย');
    expect(sanitizeChat('โทร 081-234-5678 ได้')).toBe('โทร *** ได้');
    expect(sanitizeChat('แอดมา @someone123')).toBe('แอดมา ***');
    expect(sanitizeChat('โคตร เหี้ย เลย')).toBe('โคตร *** เลย');
    expect(sanitizeChat('boss lv 25 hp 13500')).toBe('boss lv 25 hp 13500');
  });

  it('rate-limits one player and keeps bubbles readable', () => {
    expect(chatAllowed(1000, 1000 + CHAT_COOLDOWN_MS - 1)).toBe(false);
    expect(chatAllowed(1000, 1000 + CHAT_COOLDOWN_MS)).toBe(true);
    expect(bubbleMs('ok')).toBeLessThan(bubbleMs('ข้อความยาวกว่านี้มากหน่อยนะครับ'));
    expect(bubbleMs('ก'.repeat(500))).toBe(8000);
  });
});
