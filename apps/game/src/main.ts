import Phaser from 'phaser';
import './style.css';
import { WorldScene } from './scenes/WorldScene';
import { BattleScene } from './scenes/BattleScene';
import { getWorld, loadWorld } from './game/world';
import { bus } from './game/bus';
import * as rules from './game/rules';
import { walk } from './game/walk';
import { tickRegen } from './game/rules';
import { store } from './state/store';
import { mountHud, showOnboarding } from './ui/hud';
import { el } from './ui/dom';

const CITY = 'chiangmai';

async function boot() {
  const loading = el(`<div class="loading"><div class="logo">ก้าวข้ามมิติ</div><div class="logo-sub">PIXEL WALKER</div><p>กำลังโหลดแผนที่เชียงใหม่…</p></div>`);
  document.getElementById('ui')!.appendChild(loading);

  await Promise.all([loadWorld(CITY), document.fonts?.ready]);
  loading.remove();

  if (!store.load() || !store.s.starter) {
    if (store.data && !store.data.starter) store.reset();
    showOnboarding(start);
  } else {
    start();
  }
}

function start() {
  tickRegen();
  mountHud();

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    pixelArt: true,
    backgroundColor: '#1b1f2a',
    // A hidden/minimized tab can report 0×0, which breaks WebGL framebuffers — keep a floor.
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: Math.max(320, window.innerWidth),
      height: Math.max(480, window.innerHeight),
      min: { width: 320, height: 480 },
    },
    scene: [WorldScene, BattleScene],
    // ?timer keeps the loop running in hidden tabs (automated testing only).
    fps: { forceSetTimeOut: new URLSearchParams(location.search).has('timer') },
  });

  walk.startLocation();
  if (import.meta.env.DEV) Object.assign(window, { __pw: { walk, store, bus, getWorld, rules } });
  window.setInterval(tickRegen, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void walk.onVisible();
  });
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('ui')!.innerHTML = `<div class="loading"><p>โหลดเกมไม่สำเร็จ: ${String(e)}</p></div>`;
});
