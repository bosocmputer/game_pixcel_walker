/**
 * Chat window on the map HUD: a small pill (last line + unread count) that opens a log with
 * "ใกล้ ๆ" / "ปาร์ตี้" channels and an input. Tap a name to mute/unmute that player.
 * Speech bubbles on the map are drawn by scenes/chatBubbles.ts from the same `chat` bus event.
 */
import { CHAT_MAX_LEN, type ChatChannel } from '@pw/shared';
import { bus } from '../game/bus';
import { chat } from '../game/chat';
import { net } from '../game/net';
import { sfx } from '../game/audio';
import { el, esc } from './dom';
import { uiIcon } from './pixel';

let channel: ChatChannel = 'near';
let open = false;

function lineHtml(l: (typeof chat.lines)[number]): string {
  const mine = l.from === net.id;
  const name = mine
    ? `<b class="cl-me">${esc(l.name)}</b>`
    : `<button type="button" class="cl-name" data-mute="${esc(l.from)}" data-name="${esc(l.name)}" title="แตะเพื่อปิด/เปิดข้อความจากคนนี้">${esc(l.name)}</button>`;
  return `<div class="cl ${l.channel}">${l.channel === 'party' ? '<i class="cl-tag">ปาร์ตี้</i>' : ''}${name}<span>${esc(l.text)}</span></div>`;
}

export function mountChat(host: HTMLElement) {
  const box = el(`<div class="chat-box">
    <button type="button" class="chat-pill" data-chat-toggle>${uiIcon('chat', true)}<span class="chat-last">แชท</span><i class="badge chat-unread hidden"></i></button>
    <div class="chat-panel hidden">
      <div class="win-tabs">
        <button type="button" class="win-tab" data-chch="near">ใกล้ ๆ</button>
        <button type="button" class="win-tab" data-chch="party">ปาร์ตี้</button>
      </div>
      <div class="chat-log"></div>
      <form class="chat-form" autocomplete="off">
        <input type="text" maxlength="${CHAT_MAX_LEN}" placeholder="พิมพ์ข้อความ… (Enter ส่ง)" enterkeyhint="send" />
        <button type="submit" class="btn primary">ส่ง</button>
      </form>
      <p class="chat-help muted">คนที่เห็นตัวคุณบนแผนที่จะเห็นข้อความ · ลิงก์/เบอร์โทร/คำหยาบถูกซ่อน · แตะชื่อเพื่อปิดข้อความ</p>
    </div>
  </div>`);
  host.appendChild(box);
  const panel = box.querySelector<HTMLElement>('.chat-panel')!;
  const log = box.querySelector<HTMLElement>('.chat-log')!;
  const input = box.querySelector<HTMLInputElement>('input')!;
  const last = box.querySelector<HTMLElement>('.chat-last')!;
  const unread = box.querySelector<HTMLElement>('.chat-unread')!;

  // Typing must not walk the hero (WASD) or trigger other game keys.
  for (const ev of ['keydown', 'keyup', 'keypress'] as const) input.addEventListener(ev, (e) => e.stopPropagation());

  const renderTabs = () => {
    if (channel === 'party' && !net.inParty) channel = 'near';
    box.querySelectorAll<HTMLButtonElement>('[data-chch]').forEach((b) => {
      b.classList.toggle('on', b.dataset.chch === channel);
      b.disabled = b.dataset.chch === 'party' && !net.inParty;
    });
    input.placeholder = channel === 'party' ? 'พิมพ์ถึงปาร์ตี้… (Enter ส่ง)' : 'พิมพ์ถึงคนใกล้ ๆ… (Enter ส่ง)';
  };
  const renderLog = () => {
    log.innerHTML = chat.lines.length ? chat.lines.map(lineHtml).join('') : '<p class="muted chat-empty">ยังไม่มีข้อความ ลองทักคนที่อยู่ใกล้ ๆ ดูสิ</p>';
    log.scrollTop = log.scrollHeight;
  };
  const renderPill = () => {
    const l = chat.lines.at(-1);
    last.textContent = l ? `${l.name}: ${l.text}` : 'แชท';
    unread.classList.toggle('hidden', open || !chat.unread);
    unread.textContent = String(chat.unread);
  };
  const setOpen = (v: boolean) => {
    open = v;
    panel.classList.toggle('hidden', !open);
    box.classList.toggle('open', open);
    if (open) {
      chat.unread = 0;
      renderTabs();
      renderLog();
      input.focus();
    }
    renderPill();
  };

  box.querySelector('[data-chat-toggle]')!.addEventListener('click', () => setOpen(!open));
  box.querySelectorAll<HTMLElement>('[data-chch]').forEach((b) =>
    b.addEventListener('click', () => {
      channel = b.dataset.chch as ChatChannel;
      renderTabs();
      input.focus();
    }),
  );
  box.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    if (chat.send(input.value, channel)) input.value = '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  log.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-mute]');
    if (!b) return;
    const name = b.dataset.name ?? 'ผู้เล่น';
    const muted = chat.isMuted(b.dataset.mute!);
    if (!confirm(muted ? `เปิดรับข้อความจาก ${name} อีกครั้ง?` : `ปิดข้อความจาก ${name}? (จะไม่เห็นข้อความและกรอบคำพูดของคนนี้)`)) return;
    chat.toggleMute(b.dataset.mute!);
  });

  bus.on('chat', (line) => {
    if (!line.mine && line.channel === 'party') sfx('notice');
    if (open) {
      chat.unread = 0;
      renderLog();
    }
    renderPill();
  });
  bus.on('party', () => renderTabs());
  renderPill();
}
