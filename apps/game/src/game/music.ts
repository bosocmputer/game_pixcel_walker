/**
 * Background music: a small arranger over synthesised instruments (no audio files).
 * - field:  calm VGM / new-age for long farming walks — string pad, harp, celesta, flute, big reverb
 * - battle: driving orchestral — spiccato strings, brass, taiko, snare, crash
 * - boss:   darker harmonic-minor version with choir and galloping taiko
 * Every voice takes its AudioContext from the node it plays into, so songs can also be rendered
 * offline (renderMusic in audio.ts) to check levels without speakers.
 */

type Ctx = BaseAudioContext;

export interface Song {
  bpm: number;
  /** Loop length in 4/4 bars. */
  bars: number;
  /** Reverb send (0..1). */
  reverb: number;
  /** Output level so the songs sit at a similar loudness. */
  level: number;
  /** Schedule everything in bar `bar` (0..bars-1), starting at context time `t`. */
  play(bar: number, t: number, beat: number, out: AudioNode): void;
}

// ---------------------------------------------------------------------------------------------
// Notes

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** 'F#4' → MIDI number. */
function nm(s: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error(`bad note ${s}`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const chord = (s: string) => s.split(' ').map(nm);

interface Step {
  n: number | null;
  b: number;
}
/** 'A4:1.5 D5:.5 E5 -:2' → notes with lengths in beats (default 1, '-' = rest). */
function line(s: string): Step[] {
  return s
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [p, b] = tok.split(':');
      return { n: p === '-' ? null : nm(p!), b: b ? Number(b) : 1 };
    });
}
function playLine(steps: Step[], t: number, beat: number, fn: (n: number, t: number, dur: number) => void) {
  let x = t;
  for (const s of steps) {
    if (s.n !== null) fn(s.n, x, s.b * beat);
    x += s.b * beat;
  }
}

/** Deterministic little hash so "random" celesta notes repeat the same way every loop. */
const hash = (i: number) => {
  let x = (i + 1) * 2654435761;
  x ^= x >>> 13;
  return Math.abs(x);
};

// ---------------------------------------------------------------------------------------------
// Building blocks

const noiseBufs = new WeakMap<Ctx, AudioBuffer>();
function noiseOf(c: Ctx): AudioBuffer {
  let b = noiseBufs.get(c);
  if (!b) {
    b = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(c, b);
  }
  return b;
}

/** Stereo reverb impulse: decaying noise, slightly different per channel. */
export function impulse(c: Ctx, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function adsr(p: AudioParam, t: number, a: number, peak: number, hold: number, r: number) {
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(peak, t + a);
  if (hold > 0) p.setValueAtTime(peak, t + a + hold);
  p.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
}

function osc(c: Ctx, type: OscillatorType, f: number, t: number, end: number, dest: AudioNode, detune = 0): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.detune.value = detune;
  o.connect(dest);
  o.start(t);
  o.stop(end);
  return o;
}

function filter(c: Ctx, type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const b = c.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

/** A fixed gain feeding `dest` (for mixing a quieter second oscillator into a voice). */
function via(c: Ctx, v: number, dest: AudioNode): GainNode {
  const g = c.createGain();
  g.gain.value = v;
  g.connect(dest);
  return g;
}

function pan(c: Ctx, v: number, dest: AudioNode): AudioNode {
  if (!('createStereoPanner' in c)) return dest;
  const p = c.createStereoPanner();
  p.pan.value = v;
  p.connect(dest);
  return p;
}

function noiseHit(out: AudioNode, t: number, o: { dur: number; type: BiquadFilterType; f: number; f2?: number; q?: number; vol: number; attack?: number }) {
  const c = out.context;
  const src = c.createBufferSource();
  src.buffer = noiseOf(c);
  const fl = filter(c, o.type, o.f, o.q ?? 0.8);
  if (o.f2) {
    fl.frequency.setValueAtTime(o.f, t);
    fl.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
  }
  const g = c.createGain();
  adsr(g.gain, t, o.attack ?? 0.002, o.vol, 0, o.dur);
  src.connect(fl).connect(g).connect(out);
  src.start(t, (hash(Math.floor(t * 1000)) % 400) / 1000);
  src.stop(t + o.dur + 0.05);
}

// ---------------------------------------------------------------------------------------------
// Instruments

/** Warm string / choir pad: detuned saws through a slowly opening low-pass. */
function pad(out: AudioNode, notes: number[], t: number, dur: number, o: { vol: number; cutoff: number; attack?: number; release?: number; choir?: boolean }) {
  const c = out.context;
  const a = o.attack ?? 0.8;
  const r = o.release ?? 1.5;
  const hold = Math.max(0, dur - a);
  const end = t + a + hold + r + 0.05;
  const g = c.createGain();
  adsr(g.gain, t, a, o.vol, hold, r);
  const lp = filter(c, 'lowpass', o.cutoff * 0.5, 0.5);
  lp.frequency.setValueAtTime(lp.frequency.value, t);
  lp.frequency.linearRampToValueAtTime(o.cutoff, t + a + dur * 0.4);
  let last: AudioNode = lp;
  if (o.choir) {
    // Vowel-ish formants turn the saw pad into an "aah" choir.
    const f1 = filter(c, 'peaking', 800, 3);
    f1.gain.value = 10;
    const f2 = filter(c, 'peaking', 1150, 4);
    f2.gain.value = 7;
    lp.connect(f1).connect(f2);
    last = f2;
  }
  last.connect(g).connect(out);
  notes.forEach((n, i) => {
    const dest = pan(c, (i / Math.max(1, notes.length - 1) - 0.5) * 0.6, lp);
    osc(c, 'sawtooth', midi(n), t, end, dest, -7);
    osc(c, 'sawtooth', midi(n), t, end, dest, 7);
  });
}

/** Harp pluck: bright attack that mellows as it rings. */
function harp(out: AudioNode, n: number, t: number, vol: number, side = 0) {
  const c = out.context;
  const end = t + 2;
  const g = c.createGain();
  adsr(g.gain, t, 0.004, vol, 0, 1.7);
  const lp = filter(c, 'lowpass', 4200, 0.6);
  lp.frequency.setValueAtTime(lp.frequency.value, t);
  lp.frequency.exponentialRampToValueAtTime(800, t + 0.9);
  lp.connect(g).connect(pan(c, side, out));
  osc(c, 'triangle', midi(n), t, end, lp);
  osc(c, 'sine', midi(n) * 2, t, end, via(c, 0.3, lp));
}

/** Celesta / music-box bell (FM). */
function bell(out: AudioNode, n: number, t: number, vol: number, decay = 2.4, side = 0) {
  const c = out.context;
  const f0 = midi(n);
  const end = t + decay + 0.1;
  const g = c.createGain();
  adsr(g.gain, t, 0.003, vol, 0, decay);
  g.connect(pan(c, side, out));
  const car = osc(c, 'sine', f0, t, end, g);
  const mg = c.createGain();
  mg.gain.setValueAtTime(f0 * 0.9, t);
  mg.gain.exponentialRampToValueAtTime(1, t + decay * 0.5);
  mg.connect(car.frequency);
  osc(c, 'sine', f0 * 3.5, t, end, mg);
}

/** Soft flute: sine + a touch of triangle, delayed vibrato and a little breath. */
function flute(out: AudioNode, n: number, t: number, dur: number, vol: number) {
  const c = out.context;
  const f0 = midi(n);
  const a = 0.09;
  const r = 0.35;
  const hold = Math.max(0, dur - a - 0.05);
  const end = t + a + hold + r + 0.05;
  const g = c.createGain();
  adsr(g.gain, t, a, vol, hold, r);
  const lp = filter(c, 'lowpass', 2600, 0.5);
  lp.connect(g).connect(out);
  const o1 = osc(c, 'sine', f0, t, end, lp);
  const o2 = osc(c, 'triangle', f0, t, end, via(c, 0.2, lp));
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = c.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f0 * 0.006, t + Math.min(0.6, dur));
  lfo.connect(lg);
  lg.connect(o1.frequency);
  lg.connect(o2.frequency);
  lfo.start(t);
  lfo.stop(end);
  noiseHit(out, t, { dur: 0.14, type: 'bandpass', f: f0 * 2, q: 2, vol: vol * 0.35, attack: 0.03 });
}

/** Round bass for calm songs: sine body + triangle an octave up so phones can hear it. */
function softBass(out: AudioNode, n: number, t: number, dur: number, vol: number) {
  const c = out.context;
  const end = t + dur + 0.6;
  const g = c.createGain();
  adsr(g.gain, t, 0.05, vol, Math.max(0, dur - 0.05), 0.5);
  const lp = filter(c, 'lowpass', 600);
  lp.connect(g).connect(out);
  osc(c, 'sine', midi(n), t, end, lp);
  osc(c, 'triangle', midi(n + 12), t, end, via(c, 0.35, lp));
}

/** Short bowed string note (spiccato) for battle ostinatos. */
function spic(out: AudioNode, n: number, t: number, len: number, vol: number) {
  const c = out.context;
  const g = c.createGain();
  adsr(g.gain, t, 0.008, vol, len * 0.25, len * 0.9);
  const lp = filter(c, 'lowpass', 2300, 0.8);
  lp.connect(g).connect(out);
  osc(c, 'sawtooth', midi(n), t, t + len * 1.3 + 0.05, lp);
}

/** Brass: saws with a "blat" filter envelope. */
function brass(out: AudioNode, n: number, t: number, dur: number, vol: number, side = 0) {
  const c = out.context;
  const a = 0.035;
  const hold = Math.max(0, dur - a - 0.04);
  const end = t + a + hold + 0.25;
  const g = c.createGain();
  adsr(g.gain, t, a, vol, hold, 0.18);
  const lp = filter(c, 'lowpass', 350, 1.4);
  lp.frequency.setValueAtTime(lp.frequency.value, t);
  lp.frequency.exponentialRampToValueAtTime(2900, t + 0.07);
  lp.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
  lp.connect(g).connect(pan(c, side, out));
  osc(c, 'sawtooth', midi(n), t, end, lp, -5);
  osc(c, 'sawtooth', midi(n), t, end, lp, 5);
}

/** Pumping bass for battles. */
function driveBass(out: AudioNode, n: number, t: number, len: number, vol: number) {
  const c = out.context;
  const g = c.createGain();
  adsr(g.gain, t, 0.005, vol, len * 0.45, len * 0.5);
  const lp = filter(c, 'lowpass', 1100, 1.2);
  lp.frequency.setValueAtTime(lp.frequency.value, t);
  lp.frequency.exponentialRampToValueAtTime(320, t + len);
  lp.connect(g).connect(out);
  const end = t + len + 0.1;
  osc(c, 'sawtooth', midi(n), t, end, lp);
}

function taiko(out: AudioNode, t: number, vol: number, f = 90) {
  const c = out.context;
  const g = c.createGain();
  adsr(g.gain, t, 0.003, vol, 0, 0.5);
  g.connect(out);
  const o = osc(c, 'sine', f * 1.7, t, t + 0.6, g);
  o.frequency.setValueAtTime(o.frequency.value, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.35);
  noiseHit(out, t, { dur: 0.18, type: 'lowpass', f: 700, f2: 200, vol: vol * 0.45 });
}

function snare(out: AudioNode, t: number, vol: number) {
  const c = out.context;
  noiseHit(out, t, { dur: 0.17, type: 'bandpass', f: 1900, q: 0.8, vol });
  const g = c.createGain();
  adsr(g.gain, t, 0.002, vol * 0.6, 0, 0.08);
  g.connect(out);
  const o = osc(c, 'triangle', 210, t, t + 0.12, g);
  o.frequency.setValueAtTime(o.frequency.value, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
}

const hat = (out: AudioNode, t: number, vol: number, open = false) =>
  noiseHit(out, t, { dur: open ? 0.26 : 0.045, type: 'highpass', f: 7500, q: 0.7, vol });
const crash = (out: AudioNode, t: number, vol: number) => noiseHit(out, t, { dur: 1.9, type: 'highpass', f: 4200, q: 0.5, vol });

/** Drum lanes: 16 steps per bar. K/k taiko big/small, s snare, h hat, o open hat, '.' rest. */
function drums(out: AudioNode, t: number, beat: number, lanes: string[], v = 1, taikoF = 90) {
  const s16 = beat / 4;
  for (const lane of lanes) {
    for (let i = 0; i < 16; i++) {
      const ch = lane[i];
      const at = t + i * s16;
      if (ch === 'K') taiko(out, at, 0.5 * v, taikoF);
      else if (ch === 'k') taiko(out, at, 0.3 * v, taikoF * 1.2);
      else if (ch === 's') snare(out, at, 0.2 * v);
      else if (ch === 'r') snare(out, at, (0.07 + 0.12 * (i / 16)) * v); // roll, crescendo
      else if (ch === 'h') hat(out, at, (i % 4 === 0 ? 0.05 : 0.03) * v);
      else if (ch === 'o') hat(out, at, 0.045 * v, true);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// FIELD — "Morning over the old city": D major, calm, 32 bars (dawn → walk → bright → rest)

const F_CHORDS = [
  'A3 C#4 E4 F#4', // Dmaj9
  'F#3 A3 D4 E4', // Bm11
  'F#3 B3 D4 G4', // Gmaj7
  'E3 A3 D4 E4', // Asus4
  'E3 A3 C#4 F#4', // F#m7
  'F#3 A3 B3 D4', // Gmaj9
  'F#3 G3 B3 D4', // Em9
  'E3 A3 B3 E4', // Asus2
].map(chord);
const F_BASS = ['D2', 'B1', 'G1', 'A1', 'F#2', 'G1', 'E2', 'A1'].map(nm);
const F_MEL1 = [
  'A4 -:.5 D5:.5 E5 F#5',
  'F#5:2 E5 D5',
  'B4:1.5 D5:.5 E5:2',
  'E5:3 -',
  'A4:1.5 C#5:.5 E5 F#5',
  'A5:2 F#5 E5',
  'D5:1.5 E5:.5 B4 D5',
  'E5:3 -',
].map(line);
const F_MEL2 = [
  'F#5 A5 B5 A5',
  'F#5:3 E5',
  'D5 E5 F#5 B5',
  'A5:4',
  'C#6:1.5 B5:.5 A5 F#5',
  'B5:2 A5 F#5',
  'E5:1.5 F#5:.5 D5 B4',
  'A4:2 -:2',
].map(line);
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];

const FIELD: Song = {
  bpm: 76,
  bars: 32,
  reverb: 0.55,
  level: 1,
  play(bar, t, beat, out) {
    const sec = Math.floor(bar / 8);
    const i = bar % 8;
    const ch = F_CHORDS[i]!;
    const len = beat * 4;
    const h = hash(bar);
    pad(out, ch, t, len, { vol: 0.03, cutoff: sec === 2 ? 1500 : sec === 0 ? 850 : 1150, attack: 1.3, release: 2.4 });
    softBass(out, F_BASS[i]!, t, len * 0.95, 0.1);
    const up = [...ch.map((n) => n + 12), ...ch.map((n) => n + 24)];
    if (sec === 0) {
      bell(out, ch[h % 4]! + 24, t, 0.05, 2.6, -0.3);
      bell(out, ch[(h >> 3) % 4]! + 24, t + beat * 2.5, 0.04, 2.6, 0.3);
    }
    if (sec === 1 || sec === 2) ARP.forEach((k, s) => harp(out, up[k]!, t + s * beat * 0.5, s === 0 ? 0.085 : 0.065, (k / 4 - 0.5) * 0.5));
    if (sec === 1) playLine(F_MEL1[i]!, t, beat, (n, at, d) => flute(out, n, at, d, 0.09));
    if (sec === 2) {
      playLine(F_MEL2[i]!, t, beat, (n, at, d) => flute(out, n, at, d, 0.09));
      bell(out, up[(h >> 5) % 8]! + 12, t + beat * 1.5, 0.03, 2.2, 0.4);
    }
    if (sec === 3) {
      [0, 2, 4, 2].forEach((k, s) => harp(out, up[k]!, t + s * beat, 0.05, (k / 4 - 0.5) * 0.4));
      bell(out, ch[h % 4]! + 24, t + beat * 3, 0.035, 2.6, 0.2);
    }
  },
};

// ---------------------------------------------------------------------------------------------
// BATTLE — "Clash in the alley": A minor, 152 bpm, 32 bars (intro stabs → theme A → theme B → B')

interface Chord {
  root: number;
  minor: boolean;
}
const C = (s: string): Chord => ({ root: nm(s.replace('m', '')), minor: s.endsWith('m') });
const triad = (c: Chord, oct: number) => [c.root + oct, c.root + oct + (c.minor ? 3 : 4), c.root + oct + 7];

const B_A = ['A2m', 'F2', 'C3', 'G2', 'A2m', 'F2', 'E2', 'E2'].map(C);
const B_B = ['D3m', 'A2m', 'F2', 'C3', 'D3m', 'A2m', 'E2', 'E2'].map(C);
const B_MEL_A = [
  'A4 -:.5 E5:.5 E5 D5:.5 C5:.5',
  'C5:1.5 A4:.5 F5:2',
  'E5 G5 E5 C5',
  'D5:3 B4:.5 D5:.5',
  'E5:1.5 A5:.5 A5 G5:.5 E5:.5',
  'F5:1.5 E5:.5 C5 A4',
  'B4 G#4 B4 D5',
  'E5:3 -',
].map(line);
const B_MEL_B = [
  'D5 F5 A5:1.5 G5:.5',
  'E5:2 C5 E5',
  'F5 A5 C6:1.5 A5:.5',
  'G5:3 E5',
  'F5:1.5 E5:.5 D5 F5',
  'E5:1.5 D5:.5 C5 A4',
  'G#4 B4 E5 G#5',
  'B5:2 A5:.5 G#5:.5 E5',
].map(line);

function ostinato(out: AudioNode, c: Chord, t: number, beat: number, vol: number, shape: number[], oct = 12) {
  const third = c.minor ? 3 : 4;
  // Two desks, left and right, share one panner each (cheap on phones).
  const sides = [pan(out.context, -0.3, out), pan(out.context, 0.3, out)];
  shape.forEach((o, s) => spic(sides[s % 2]!, c.root + oct + (o === 3 ? third : o === 15 ? 12 + third : o), t + s * (beat / 4), beat / 4, s % 4 === 0 ? vol : vol * 0.7));
}
const OST_BATTLE = [0, 0, 7, 0, 12, 0, 7, 0, 0, 0, 7, 0, 15, 7, 12, 7];

const BATTLE: Song = {
  bpm: 152,
  bars: 32,
  reverb: 0.22,
  level: 0.9,
  play(bar, t, beat, out) {
    const sec = Math.floor(bar / 8);
    const i = bar % 8;
    const c = (sec < 2 ? B_A : B_B)[i]!;
    const len = beat * 4;
    const last = i === 7;
    if (i === 0) crash(out, t, 0.09);
    pad(out, triad(c, 12), t, len, { vol: 0.016, cutoff: 1600, attack: 0.25, release: 0.5 });
    ostinato(out, c, t, beat, sec === 0 ? 0.045 : 0.055, OST_BATTLE, sec === 3 ? 24 : 12);
    [0, 0, 12, 0, 0, 12, 0, 12].forEach((o, s) => driveBass(out, c.root - 12 + o, t + s * beat * 0.5, beat * 0.5, 0.09));
    drums(out, t, beat, last
      ? ['K.....k.K.k.K.K.', '....s...rrrrrrrr']
      : ['K.....k.K..k....', '....s.......s...', sec >= 2 ? 'hhhhhhhhhhhhhhoh' : 'h.h.h.h.h.h.h.o.']);
    if (sec === 0) {
      // Horn stabs on 1 and the "and" of 2.
      for (const [at, d] of [[0, 1], [1.5, 0.5]] as const) triad(c, 24).forEach((n, k) => brass(out, n, t + at * beat, d * beat, 0.03, (k - 1) * 0.4));
    }
    if (sec === 1) playLine(B_MEL_A[i]!, t, beat, (n, at, d) => brass(out, n, at, d, 0.07));
    if (sec >= 2) playLine(B_MEL_B[i]!, t, beat, (n, at, d) => brass(out, n, at, d, 0.07));
    if (sec === 3) playLine(B_MEL_B[i]!, t, beat, (n, at, d) => pad(out, [n + 12], at, d, { vol: 0.025, cutoff: 3200, attack: 0.05, release: 0.25 }));
  },
};

// ---------------------------------------------------------------------------------------------
// BOSS — "Guardian's wrath": D harmonic minor, 164 bpm, choir + galloping taiko

const X_1 = ['D2m', 'D2m', 'Bb2', 'Bb2', 'G2m', 'A2', 'D2m', 'A2'].map(C);
const X_2 = ['G2m', 'D2m', 'Bb2', 'A2', 'G2m', 'D2m', 'Eb2', 'A2'].map(C);
const X_MEL_LOW = [
  'D4:2 F4 A4',
  'G4:1.5 F4:.5 E4 D4',
  'F4:2 D4 Bb3',
  'C4 D4 F4:2',
  'G4:1.5 Bb4:.5 D5:2',
  'C#5:1.5 E5:.5 A4:2',
  'F4 E4 D4 A3',
  'C#4:2 E4 A4',
].map(line);
const X_MEL_HIGH = [
  'D5:1.5 Bb4:.5 G5:2',
  'F5 E5:.5 D5:.5 A5:2',
  'Bb5:1.5 A5:.5 F5 D5',
  'E5 C#5 E5 A5',
  'G5:1.5 A5:.5 Bb5 G5',
  'A5:2 F5 D5',
  'Eb5:1.5 G5:.5 Bb5 G5',
  'A5:2 C#6 E6',
].map(line);
const OST_BOSS = [0, 12, 0, 12, 7, 12, 0, 12, 0, 12, 0, 12, 7, 12, 3, 12];

const BOSS: Song = {
  bpm: 164,
  bars: 32,
  reverb: 0.3,
  level: 0.72,
  play(bar, t, beat, out) {
    const sec = Math.floor(bar / 8);
    const i = bar % 8;
    const c = (sec === 2 ? X_2 : X_1)[i]!;
    const len = beat * 4;
    const last = i === 7;
    if (i === 0) crash(out, t, 0.1);
    pad(out, triad(c, 24), t, len, { vol: sec === 0 ? 0.03 : 0.022, cutoff: 2200, attack: 0.3, release: 0.6, choir: true });
    ostinato(out, c, t, beat, 0.05, OST_BOSS, 12);
    [0, 12, 0, 12, 0, 12, 0, 12].forEach((o, s) => driveBass(out, c.root + o, t + s * beat * 0.5, beat * 0.5, 0.08));
    drums(out, t, beat, last
      ? ['K..K..K.K.K.KKKK', '........rrrrrrrr']
      : ['K..K..K.K..K..k.', '....s.......s...', 'hhhhhhhhhhhhhhhh'], 1, 75);
    if (sec === 0) triad(c, 12).forEach((n) => [0, 0.75, 1.5].forEach((at) => brass(out, n, t + at * beat, 0.5 * beat, 0.028)));
    if (sec === 1 || sec === 3) playLine(X_MEL_LOW[i]!, t, beat, (n, at, d) => brass(out, n + (sec === 3 ? 12 : 0), at, d, 0.065));
    if (sec === 2) playLine(X_MEL_HIGH[i]!, t, beat, (n, at, d) => brass(out, n, at, d, 0.055));
    if (sec === 3) playLine(X_MEL_LOW[i]!, t, beat, (n, at, d) => pad(out, [n + 24], at, d, { vol: 0.02, cutoff: 3000, attack: 0.05, release: 0.3, choir: true }));
  },
};

export const SONGS = { field: FIELD, battle: BATTLE, boss: BOSS };
