/**
 * Chiptune audio, synthesised live with the Web Audio API — no sound files, no licences.
 * - sfx(name): short 8/16-bit style effects (square/triangle/noise with pitch sweeps)
 * - music(theme): small looping tracker songs (lead + bass + drums) for the map and battles
 * Browsers only allow audio after a user gesture: the first tap/key unlocks it (unlockAudio).
 */

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
  ctx = new AC();
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
// Music: tiny tracker. Each song = bpm + 8th-note steps per bar + chord roots + melody pattern.

interface Song {
  bpm: number;
  /** One entry per 8th note; 0 = rest. MIDI notes. */
  lead: number[];
  /** One entry per 8th note (bass), same length as lead. */
  bass: number[];
  /** 'k' kick, 's' snare, 'h' hat, '.' rest — one per 8th note. */
  drums: string;
  leadWave: Wave | 'pulse';
}

// Thai-flavoured major pentatonic (C D E G A) walk for the map; driving A-minor for battles.
const FIELD: Song = {
  bpm: 96,
  leadWave: 'pulse',
  lead: [
    76, 0, 79, 81, 79, 0, 76, 74, 72, 0, 74, 76, 74, 0, 0, 0,
    76, 0, 79, 81, 84, 0, 81, 79, 81, 0, 79, 76, 79, 0, 0, 0,
    81, 0, 84, 86, 84, 0, 81, 79, 76, 0, 79, 81, 79, 0, 76, 74,
    72, 0, 74, 76, 79, 0, 76, 74, 72, 0, 0, 0, 72, 0, 0, 0,
  ],
  bass: [
    48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0,
    41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 50, 0,
    45, 0, 52, 0, 45, 0, 52, 0, 41, 0, 48, 0, 41, 0, 48, 0,
    43, 0, 50, 0, 43, 0, 50, 0, 48, 0, 55, 0, 48, 0, 0, 0,
  ],
  drums: 'k.h.s.h.'.repeat(7) + 'k.h.skss',
};

const BATTLE: Song = {
  bpm: 148,
  leadWave: 'square',
  lead: [
    81, 0, 81, 84, 0, 81, 79, 0, 77, 0, 77, 81, 0, 77, 76, 0,
    79, 0, 79, 83, 0, 79, 77, 0, 76, 0, 76, 79, 81, 0, 0, 0,
    81, 0, 81, 84, 0, 88, 86, 0, 84, 0, 83, 81, 0, 79, 77, 0,
    79, 0, 77, 76, 0, 74, 76, 0, 81, 0, 0, 80, 81, 0, 0, 0,
  ],
  bass: [
    45, 45, 57, 45, 45, 57, 45, 57, 41, 41, 53, 41, 41, 53, 41, 53,
    43, 43, 55, 43, 43, 55, 43, 55, 45, 45, 57, 45, 44, 44, 56, 44,
    45, 45, 57, 45, 45, 57, 45, 57, 41, 41, 53, 41, 41, 53, 41, 53,
    43, 43, 55, 43, 43, 55, 43, 55, 45, 45, 57, 45, 45, 0, 45, 0,
  ],
  drums: 'k.hsk.hsk.hsk.hsk.hsk.hsk.hskkhs'.repeat(2),
};

const BOSS: Song = {
  bpm: 164,
  leadWave: 'square',
  lead: [
    74, 0, 77, 0, 81, 0, 80, 81, 86, 0, 84, 81, 80, 0, 77, 0,
    74, 0, 77, 0, 81, 0, 80, 81, 89, 0, 88, 86, 85, 0, 0, 0,
    86, 85, 86, 0, 81, 0, 77, 0, 82, 81, 82, 0, 77, 0, 74, 0,
    79, 77, 76, 0, 73, 0, 76, 0, 74, 0, 0, 0, 73, 74, 0, 0,
  ],
  bass: [
    38, 50, 38, 50, 38, 50, 38, 50, 34, 46, 34, 46, 34, 46, 34, 46,
    36, 48, 36, 48, 36, 48, 36, 48, 37, 49, 37, 49, 37, 49, 37, 49,
    38, 50, 38, 50, 38, 50, 38, 50, 34, 46, 34, 46, 34, 46, 34, 46,
    36, 48, 36, 48, 33, 45, 33, 45, 38, 50, 38, 50, 37, 49, 37, 49,
  ],
  drums: 'kshskshskshskshs'.repeat(4),
};

const SONGS: Record<Exclude<Theme, null>, Song> = { field: FIELD, battle: BATTLE, boss: BOSS };

let current: Theme = null;
let pendingTheme: Theme | undefined;
let timer: number | null = null;
let step = 0;
let nextTime = 0;

function scheduleStep(song: Song, i: number, t: number) {
  const len = 60 / song.bpm / 2;
  const at = t - ctx!.currentTime;
  const ln = song.lead[i % song.lead.length]!;
  if (ln) tone({ f: midi(ln), dur: len * 0.95, wave: song.leadWave, vol: 0.11, at, out: musicGain });
  const bn = song.bass[i % song.bass.length]!;
  if (bn) tone({ f: midi(bn), dur: len * 0.9, wave: 'triangle', vol: 0.22, at, out: musicGain });
  const dr = song.drums[i % song.drums.length];
  if (dr === 'k') tone({ f: 150, f2: 45, dur: 0.12, wave: 'sine', vol: 0.35, at, out: musicGain });
  else if (dr === 's') noise({ dur: 0.1, freq: 1800, vol: 0.14, at, out: musicGain });
  else if (dr === 'h') noise({ dur: 0.03, freq: 8000, q: 0.8, vol: 0.05, at, out: musicGain });
}

/** Switch the background song (null = silence). Starts once audio has been unlocked. */
export function music(theme: Theme) {
  if (!ctx || ctx.state !== 'running') {
    pendingTheme = theme;
    return;
  }
  if (theme === current) return;
  current = theme;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  if (!theme) return;
  const song = SONGS[theme];
  step = 0;
  nextTime = ctx.currentTime + 0.08;
  timer = window.setInterval(() => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(song, step, nextTime);
      nextTime += 60 / song.bpm / 2;
      step++;
    }
  }, 30);
}
