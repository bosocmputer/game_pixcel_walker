import Phaser from 'phaser';
import './style.css';
import { WorldScene } from './scenes/WorldScene';
import { BattleScene } from './scenes/BattleScene';
import { ensureAround, initWorld, landmarksAround, toTile } from './game/world';
import { bus } from './game/bus';
import * as rules from './game/rules';
import { DEFAULT_POS, lastKnownPosition, walk } from './game/walk';
import { tickRegen } from './game/rules';
import { store } from './state/store';
import { mountHud, showOnboarding } from './ui/hud';
import { createMap, getMap } from './game/map';
import { autoHunt } from './game/autohunt';
import { net } from './game/net';
import { el } from './ui/dom';
import { loadAvatarPack, USE_AVATAR_PACK } from './game/avatar';

/** First GPS fix (or last known / default spot) so the map can be centred before rendering. */
function initialPosition(): Promise<{ lat: number; lng: number }> {
  const fallback = lastKnownPosition() ?? DEFAULT_POS;
  if (!('geolocation' in navigator)) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), 8000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        window.clearTimeout(timer);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(fallback);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

async function boot() {
  await document.fonts?.ready;
  if (USE_AVATAR_PACK) {
    try {
      await loadAvatarPack();
    } catch (e) {
      console.warn('[AvatarPack] failed to load, using procedural fallback:', e);
    }
  }
  if (!store.load() || !store.s.starter) {
    if (store.data && !store.data.starter) store.reset();
    showOnboarding(start);
  } else {
    void start();
  }
}

async function start() {
  const loading = el(`<div class="loading"><div class="logo">ก้าวข้ามมิติ</div><div class="logo-sub">PIXEL WALKER</div><p>กำลังหาตำแหน่งของคุณ…</p></div>`);
  document.getElementById('ui')!.appendChild(loading);
  const pos = await initialPosition();
  initWorld(pos.lat, pos.lng);
  const t = toTile(pos.lat, pos.lng);
  ensureAround(t.x, t.y, 1);
  await createMap(document.getElementById('map')!, pos.lat, pos.lng);
  loading.remove();

  tickRegen();
  mountHud();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    pixelArt: true,
    transparent: true,
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

  autoHunt.init(game);
  net.start();
  walk.startLocation();
  if (import.meta.env.DEV) Object.assign(window, { __pw: { walk, store, bus, rules, landmarksAround, game, getMap } });
  window.setInterval(tickRegen, 15000);
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('ui')!.innerHTML = `<div class="loading"><p>โหลดเกมไม่สำเร็จ: ${String(e)}</p></div>`;
});
