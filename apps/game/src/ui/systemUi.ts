/**
 * The [ระบบ] layer (docs/STORY.md §5): holographic system windows for notices, daily quests and
 * gate info — the parchment/RO windows stay for things you can hold (bag, gear, shops, home).
 */
import { DAILY_BONUS, RANK_COLOR, dailyBonusReady, dailyReward, dailyTitle, rankOf, type DailyState, type Rank } from '@pw/shared';
import { esc, el } from './dom';
import { uiIcon } from './pixel';

export const SYS = '[ระบบ]';

export function rankChip(rank: Rank, prefix = ''): string {
  return `<i class="rank-chip" style="--rank:${RANK_COLOR[rank]}">${prefix}${rank}</i>`;
}

export function playerRank(level: number): string {
  return rankChip(rankOf(level), 'RANK ');
}

/** Big centred system window that fades by itself (level up, gate cleared, quest done). */
export function systemNotice(title: string, lines: string[] = [], kind: 'info' | 'gold' | 'red' = 'info') {
  const root = document.getElementById('ui');
  if (!root) return;
  const box = el(`<div class="sys-notice ${kind}"><div class="sys-head">${SYS}</div><b>${esc(title)}</b>${lines.map((l) => `<p>${l}</p>`).join('')}</div>`);
  root.appendChild(box);
  window.setTimeout(() => box.classList.add('out'), 2600);
  window.setTimeout(() => box.remove(), 3200);
}

export function questsClaimable(d: DailyState): number {
  return d.quests.filter((q) => !q.claimed && q.progress >= q.target).length + (dailyBonusReady(d) ? 1 : 0);
}

export function questWindowHtml(d: DailyState, level: number): string {
  const reward = dailyReward(level);
  const rows = d.quests
    .map((q, i) => {
      const done = q.progress >= q.target;
      const pct = Math.round((q.progress / q.target) * 100);
      const action = q.claimed
        ? '<small class="sys-ok">รับแล้ว ✓</small>'
        : done
          ? `<button type="button" class="btn primary" data-claim="${i}">รับรางวัล</button>`
          : `<small class="muted">${q.progress}/${q.target}</small>`;
      return `<div class="sq-row ${q.claimed ? 'claimed' : done ? 'done' : ''}">
        <div class="sq-info"><b>${esc(dailyTitle(q))}</b>
          <i class="sq-bar"><i style="width:${pct}%"></i></i>
          <small>รางวัล: EXP ${reward.exp.toLocaleString()} · ${uiIcon('coin', true)}${reward.gold.toLocaleString()}</small></div>
        <span class="sq-act">${action}</span></div>`;
    })
    .join('');
  const bonus = d.bonusClaimed
    ? '<small class="sys-ok">รับรางวัลพิเศษแล้ว ✓</small>'
    : dailyBonusReady(d)
      ? '<button type="button" class="btn primary" data-claim-bonus>รับรางวัลพิเศษ</button>'
      : '<small class="muted">ทำเควสครบ 3 ข้อแล้วรับรางวัล</small>';
  return `<div class="sys-win">
    <div class="sys-title"><span>${uiIcon('quest', true)}${SYS} เควสรายวัน</span><small>รีเซ็ตเที่ยงคืน</small></div>
    <p class="sys-line">ผู้ตื่นรู้ต้องฝึกฝนทุกวัน — ปราบมอนสเตอร์ตามที่ระบบกำหนด</p>
    <div class="sq-list">${rows}</div>
    <div class="sq-bonus"><span>${uiIcon('star', true)}ครบ 3 ข้อ: แต้มสเตตัส +${DAILY_BONUS.statPoints} · ยา HP ×${DAILY_BONUS.items.red_potion}</span>${bonus}</div>
  </div>`;
}
