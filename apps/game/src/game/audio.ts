/**
 * Game audio, synthesised live with the Web Audio API — no sound files, no licences.
 * - sfx(name): short 8/16-bit style effects (square/triangle/noise with pitch sweeps)
 * - music(theme): orchestral / ambient songs from music.ts (calm map song, driving battle + boss)
 * Browsers only allow audio after a user gesture: the first tap/key unlocks it (unlockAudio).
 */

import { impulse, SONGS, type Song } from './music';

type Wave = OscillatorType;
export type Sfx =
  | 'click' | 'open' | 'close' | 'coin' | 'levelup' | 'encounter' | 'warp' | 'notice' | 'step'
  | 'slash' | 'hit' | 'crit' | 'miss' | 'block' | 'fire' | 'water' | 'thunder' | 'ice' | 'earth'
  | 'holy' | 'shadow' | 'poison' | 'heal' | 'shield' | 'buff' | 'debuff' | 'stun' | 'cast' | 'death'
  | 'shoot' | 'ultimate' | 'victory' | 'defeat' | 'wave';
export type Theme = 'field' | 'battle' | 'boss' | null;

const SETTINGS_KEY = 'pw.audio';
const settings = (() => {
  try {
    return { music: true, sfx: true, musicVol: 0.35, sfxVol: 0.6, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { music: true, sfx: true, musicVol: 0.35, sfxVol: 0.6 };
  }
})() as { music: boolean; sfx: boolean; musicVol: number; sfxVol: number };

let ctx: AudioContext | null = null;
let musicGain: GainNode;
let sfxGain: GainNode;
let noiseBuf: AudioBuffer;
let square12: PeriodicWave;

function save() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function init(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  // 32 kHz is plenty for synth audio and roughly a third cheaper than 48 kHz on phones.
  try {
    ctx = new AC({ sampleRate: 32000, latencyHint: 'balanced' });
  } catch {
    ctx = new AC();
  }
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain.connect(master);
  sfxGain.connect(master);
  applyVolumes();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 12.5% pulse: the classic thin NES lead.
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.125);
  square12 = ctx.createPeriodicWave(re, im);
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  musicGain.gain.value = settings.music ? settings.musicVol : 0;
  sfxGain.gain.value = settings.sfx ? settings.sfxVol : 0;
}

/** Call from any user gesture; safe to call repeatedly. */
export function unlockAudio() {
  const c = init();
  if (!c) return;
  // resume() is async: start the waiting song once the context is actually running.
  if (c.state !== 'running') void c.resume().then(flushPending, () => undefined);
  else flushPending();
}

function flushPending() {
  if (pendingTheme === undefined || !ctx || ctx.state !== 'running') return;
  const t = pendingTheme;
  pendingTheme = undefined;
  music(t);
}

/** True once the browser let us start the audio context (after a user gesture). */
export const audioRunning = () => ctx?.state === 'running';

/** The song currently playing (for tests and the settings panel). */
export const currentTheme = () => current;

export function audioSettings() {
  return { ...settings };
}

export function setAudio(patch: Partial<typeof settings>) {
  Object.assign(settings, patch);
  save();
  applyVolumes();
}

// ---------------------------------------------------------------------------------------------
// Synth voices

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function tone(o: { f: number; f2?: number; dur: number; wave?: Wave | 'pulse'; vol?: number; at?: number; attack?: number; out?: AudioNode }) {
  if (!ctx) return;
  const t = ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  if (o.wave === 'pulse') osc.setPeriodicWave(square12);
  else osc.type = o.wave ?? 'square';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
  const g = ctx.createGain();
  const v = o.vol ?? 0.25;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g).connect(o.out ?? sfxGain);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
}

function noise(o: { dur: number; freq?: number; freq2?: number; q?: number; vol?: number; at?: number; type?: BiquadFilterType; out?: AudioNode }) {
  if (!ctx) return;
  const t = ctx.currentTime + (o.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filt = ctx.createBiquadFilter();
  filt.type = o.type ?? 'bandpass';
  filt.frequency.setValueAtTime(o.freq ?? 2000, t);
  if (o.freq2) filt.frequency.exponentialRampToValueAtTime(o.freq2, t + o.dur);
  filt.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.vol ?? 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(filt).connect(g).connect(o.out ?? sfxGain);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.02);
}

function arp(notes: number[], step: number, o: { wave?: Wave | 'pulse'; vol?: number; dur?: number } = {}) {
  notes.forEach((n, i) => tone({ f: midi(n), dur: o.dur ?? step * 1.4, wave: o.wave ?? 'square', vol: o.vol ?? 0.18, at: i * step }));
}

const lastPlayed = new Map<Sfx, number>();

/** Play a sound effect (rate-limited per name so fast battles don't turn into noise). */
export function sfx(name: Sfx) {
  if (!ctx || !settings.sfx || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? 0) < 45) return;
  lastPlayed.set(name, now);
  switch (name) {
    case 'click': tone({ f: 1200, f2: 900, dur: 0.04, wave: 'square', vol: 0.08 }); break;
    case 'open': arp([72, 79], 0.04, { vol: 0.1 }); break;
    case 'close': arp([79, 72], 0.04, { vol: 0.08 }); break;
    case 'coin': arp([88, 93], 0.06, { wave: 'pulse', vol: 0.14 }); break;
    case 'levelup': arp([72, 76, 79, 84, 79, 84, 88], 0.08, { wave: 'pulse', vol: 0.16 }); break;
    case 'encounter': arp([64, 71, 76], 0.05, { vol: 0.14 }); noise({ dur: 0.15, freq: 5000, vol: 0.08, at: 0.12 }); break;
    case 'warp': tone({ f: 200, f2: 1800, dur: 0.35, wave: 'triangle', vol: 0.2 }); break;
    case 'notice': arp([81, 84], 0.07, { wave: 'triangle', vol: 0.14 }); break;
    case 'step': noise({ dur: 0.05, freq: 900, vol: 0.05 }); break;
    case 'slash': noise({ dur: 0.12, freq: 6000, freq2: 1200, q: 2, vol: 0.28 }); break;
    case 'hit': tone({ f: 220, f2: 70, dur: 0.12, wave: 'square', vol: 0.22 }); noise({ dur: 0.08, freq: 1500, vol: 0.2 }); break;
    case 'crit': tone({ f: 330, f2: 60, dur: 0.22, wave: 'square', vol: 0.28 }); noise({ dur: 0.18, freq: 3000, freq2: 600, vol: 0.28 }); arp([96, 100], 0.03, { vol: 0.08 }); break;
    case 'miss': tone({ f: 700, f2: 1400, dur: 0.1, wave: 'triangle', vol: 0.12 }); break;
    case 'block': tone({ f: 1500, f2: 1300, dur: 0.12, wave: 'square', vol: 0.12 }); tone({ f: 2200, dur: 0.08, wave: 'triangle', vol: 0.1, at: 0.02 }); break;
    case 'fire': noise({ dur: 0.45, freq: 800, freq2: 3000, q: 0.7, vol: 0.3, type: 'lowpass' }); tone({ f: 120, f2: 60, dur: 0.3, wave: 'sawtooth', vol: 0.12 }); break;
    case 'water': for (let i = 0; i < 4; i++) tone({ f: 500 + i * 220, f2: 1400 + i * 200, dur: 0.07, wave: 'sine', vol: 0.16, at: i * 0.05 }); break;
    case 'thunder': noise({ dur: 0.5, freq: 400, freq2: 120, vol: 0.35, type: 'lowpass' }); noise({ dur: 0.1, freq: 6000, vol: 0.25 }); break;
    case 'ice': for (let i = 0; i < 5; i++) tone({ f: 2000 + i * 330, dur: 0.06, wave: 'triangle', vol: 0.1, at: i * 0.035 }); break;
    case 'earth': tone({ f: 90, f2: 40, dur: 0.35, wave: 'square', vol: 0.25 }); noise({ dur: 0.3, freq: 300, vol: 0.28, type: 'lowpass' }); break;
    case 'holy': arp([84, 88, 91, 96], 0.05, { wave: 'triangle', vol: 0.14, dur: 0.4 }); break;
    case 'shadow': tone({ f: 300, f2: 90, dur: 0.4, wave: 'sawtooth', vol: 0.12 }); tone({ f: 310, f2: 95, dur: 0.4, wave: 'sawtooth', vol: 0.1 }); break;
    case 'poison': for (let i = 0; i < 3; i++) tone({ f: 300 + i * 90, f2: 180, dur: 0.1, wave: 'sine', vol: 0.14, at: i * 0.07 }); break;
    case 'heal': arp([76, 79, 84, 88], 0.06, { wave: 'triangle', vol: 0.14, dur: 0.3 }); break;
    case 'shield': tone({ f: 400, f2: 900, dur: 0.25, wave: 'triangle', vol: 0.16 }); tone({ f: 800, f2: 1600, dur: 0.25, wave: 'sine', vol: 0.1 }); break;
    case 'buff': arp([67, 71, 74, 79], 0.05, { wave: 'pulse', vol: 0.12 }); break;
    case 'debuff': arp([74, 70, 67, 62], 0.05, { wave: 'pulse', vol: 0.12 }); break;
    case 'stun': for (let i = 0; i < 3; i++) tone({ f: 1800, f2: 1200, dur: 0.08, wave: 'square', vol: 0.07, at: i * 0.08 }); break;
    case 'cast': tone({ f: 300, f2: 1200, dur: 0.25, wave: 'triangle', vol: 0.14 }); break;
    case 'death': tone({ f: 440, f2: 55, dur: 0.6, wave: 'square', vol: 0.18 }); noise({ dur: 0.4, freq: 600, vol: 0.12, type: 'lowpass', at: 0.1 }); break;
    case 'shoot': noise({ dur: 0.1, freq: 3000, freq2: 5000, q: 3, vol: 0.18 }); break;
    case 'ultimate': tone({ f: 80, f2: 40, dur: 0.8, wave: 'sawtooth', vol: 0.25 }); noise({ dur: 0.7, freq: 200, freq2: 1200, vol: 0.3, type: 'lowpass' }); break;
    case 'victory': arp([72, 72, 72, 72, 68, 70, 72, 70, 72], 0.1, { wave: 'pulse', vol: 0.16, dur: 0.14 }); break;
    case 'defeat': arp([67, 66, 65, 64, 60], 0.18, { wave: 'triangle', vol: 0.16, dur: 0.3 }); break;
    case 'wave': arp([69, 76, 81], 0.07, { wave: 'pulse', vol: 0.14 }); break;
  }
}

// ---------------------------------------------------------------------------------------------
// Music scheduler: songs live in music.ts; each gets its own gain (for crossfades) + a reverb send.

let current: Theme = null;
let pendingTheme: Theme | undefined;
let timer: number | null = null;
let songOut: GainNode | null = null;
let reverb: ConvolverNode | null = null;

function reverbOf(c: BaseAudioContext, dest: AudioNode): ConvolverNode {
  const r = c.createConvolver();
  r.buffer = impulse(c, 3.2, 2.8);
  r.connect(dest);
  return r;
}

/** Song output: level gain → dry to `dest`, plus a send into the reverb. */
function songBus(c: BaseAudioContext, song: Song, dest: AudioNode, rev: AudioNode): GainNode {
  const g = c.createGain();
  g.gain.value = song.level;
  g.connect(dest);
  const send = c.createGain();
  send.gain.value = song.reverb;
  g.connect(send).connect(rev);
  return g;
}

/** Switch the background song (null = silence) with a short crossfade. Starts once audio is unlocked. */
export function music(theme: Theme) {
  if (!ctx || ctx.state !== 'running') {
    pendingTheme = theme;
    return;
  }
  if (theme === current) return;
  current = theme;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  const now = ctx.currentTime;
  if (songOut) {
    const old = songOut;
    old.gain.cancelScheduledValues(now);
    old.gain.setValueAtTime(old.gain.value, now);
    old.gain.linearRampToValueAtTime(0, now + 0.9);
    window.setTimeout(() => old.disconnect(), 6000);
    songOut = null;
  }
  if (!theme) return;
  reverb ??= reverbOf(ctx, musicGain);
  const song = SONGS[theme];
  const out = songBus(ctx, song, musicGain, reverb);
  songOut = out;
  const beat = 60 / song.bpm;
  let bar = 0;
  let next = now + 0.1;
  const tick = () => {
    if (!ctx) return;
    // Throttled background tabs: skip ahead instead of bursting a backlog of bars.
    if (next < ctx.currentTime - 0.05) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.5) {
      song.play(bar % song.bars, next, beat, out);
      next += beat * 4;
      bar++;
    }
  };
  tick();
  timer = window.setInterval(tick, 100);
}

/** Dev helper: render a song offline (no speakers needed) to check levels and clipping. */
export async function renderMusic(theme: Exclude<Theme, null>, seconds: number, sampleRate = 22050): Promise<AudioBuffer> {
  const c = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
  const song = SONGS[theme];
  const out = songBus(c, song, c.destination, reverbOf(c, c.destination));
  const beat = 60 / song.bpm;
  for (let bar = 0, t = 0.05; t < seconds; bar++, t += beat * 4) song.play(bar % song.bars, t, beat, out);
  return c.startRendering();
}
