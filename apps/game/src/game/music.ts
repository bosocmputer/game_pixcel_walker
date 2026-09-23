/**
 * Background music: a small arranger over synthesised instruments (no audio files).
 * - field:  town waltz for walking the map (3/4, style ref: classic MMO town themes) — oboe/flute
 *           lead over pizzicato "oom-pah-pah", harp, celesta, tambourine
 * - home:   calm VGM / new-age inside the house — string pad, harp, celesta, flute, big reverb
 * - battle: driving orchestral — spiccato strings, brass, taiko, snare, crash
 * - boss:   darker harmonic-minor version with choir and galloping taiko
 * Every voice takes its AudioContext from the node it plays into, so songs can also be rendered
 * offline (renderMusic in audio.ts) to check levels without speakers.
 */

type Ctx = BaseAudioContext;

export interface Song {
  bpm: number;
  /** Loop length in bars. */
  bars: number;
  /** Beats per bar (default 4; 3 = waltz). */
  meter?: number;
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

/** Pizzicato string: a quick pluck with a woody body. */
function pizz(out: AudioNode, n: number, t: number, vol: number, side = 0) {
  const c = out.context;
  const g = c.createGain();
  adsr(g.gain, t, 0.004, vol, 0, 0.32);
  const lp = filter(c, 'lowpass', 2600, 1);
  lp.frequency.setValueAtTime(2600, t);
  lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
  lp.connect(g).connect(pan(c, side, out));
  osc(c, 'sawtooth', midi(n), t, t + 0.4, via(c, 0.5, lp));
  osc(c, 'triangle', midi(n), t, t + 0.4, lp);
}

/** Oboe-ish reed: nasal saw/square blend with a formant bump and gentle vibrato. */
function oboe(out: AudioNode, n: number, t: number, dur: number, vol: number) {
  const c = out.context;
  const f0 = midi(n);
  const a = 0.05;
  const hold = Math.max(0, dur - a - 0.04);
  const end = t + a + hold + 0.3;
  const g = c.createGain();
  adsr(g.gain, t, a, vol, hold, 0.22);
  const lp = filter(c, 'lowpass', 2400, 0.7);
  const nasal = filter(c, 'peaking', 1300, 2);
  nasal.gain.value = 6;
  lp.connect(nasal).connect(g).connect(out);
  const o1 = osc(c, 'sawtooth', f0, t, end, via(c, 0.5, lp));
  const o2 = osc(c, 'square', f0, t, end, via(c, 0.35, lp));
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.5;
  const lg = c.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f0 * 0.005, t + Math.min(0.5, dur));
  lfo.connect(lg);
  lg.connect(o1.frequency);
  lg.connect(o2.frequency);
  lfo.start(t);
  lfo.stop(end);
}

/** Tambourine shake: a few quick jingles. */
function tambourine(out: AudioNode, t: number, vol: number) {
  [0, 0.025, 0.05].forEach((d, i) => noiseHit(out, t + d, { dur: 0.09, type: 'bandpass', f: 7800, q: 2.5, vol: vol * (1 - i * 0.3) }));
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

/**
 * Drum lanes, one character per step of `step` seconds (any lane length):
 * K/k drum big/small, s snare, r snare roll (crescendo), t/j tambourine accent/light, h hat, o open hat.
 */
function drums(out: AudioNode, t: number, step: number, lanes: string[], v = 1, drumF = 90) {
  for (const lane of lanes) {
    for (let i = 0; i < lane.length; i++) {
      const ch = lane[i];
      const at = t + i * step;
      if (ch === 'K') taiko(out, at, 0.5 * v, drumF);
      else if (ch === 'k') taiko(out, at, 0.3 * v, drumF * 1.2);
      else if (ch === 's') snare(out, at, 0.18 * v);
      else if (ch === 'r') snare(out, at, (0.05 + 0.13 * (i / lane.length)) * v);
      else if (ch === 't') tambourine(out, at, 0.06 * v);
      else if (ch === 'j') tambourine(out, at, 0.03 * v);
      else if (ch === 'h') hat(out, at, 0.035 * v);
      else if (ch === 'o') hat(out, at, 0.045 * v, true);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// FIELD — "Waltz of the old moat": G major town waltz, 3/4, 40 bars (A1 A2 B A3 + harp interlude).
// Style reference only (bright MMO town waltz); melody and harmony are original.

const W_A = ['G', 'D', 'Em', 'C', 'G', 'Am', 'D7', 'G'];
const W_B = ['Em', 'Bm', 'C', 'G', 'Am', 'Em', 'A7', 'D'];
const W_CHORD: Record<string, { root: string; tones: string }> = {
  G: { root: 'G2', tones: 'G3 B3 D4' },
  D: { root: 'D3', tones: 'F#3 A3 D4' },
  D7: { root: 'D3', tones: 'F#3 C4 D4' },
  Em: { root: 'E2', tones: 'G3 B3 E4' },
  C: { root: 'C3', tones: 'G3 C4 E4' },
  Am: { root: 'A2', tones: 'A3 C4 E4' },
  Bm: { root: 'B2', tones: 'F#3 B3 D4' },
  A7: { root: 'A2', tones: 'G3 C#4 E4' },
};
const W_MEL_A1 = ['B4 D5 G5', 'F#5:1.5 E5:.5 D5', 'G5:1.5 F#5:.5 E5', 'C5:2 E5', 'D5 B4 D5', 'C5:1.5 B4:.5 A4', 'F#4 A4 C5', 'B4:2 -'].map(line);
const W_MEL_A2 = ['G5:1.5 A5:.5 B5', 'A5 F#5 D5', 'E5:1.5 F#5:.5 G5', 'E5:2 C5', 'B4:1.5 C5:.5 D5', 'E5 C5 A4', 'D5:1.5 E5:.5 F#5', 'G5:2 -'].map(line);
const W_MEL_B = ['B4:2 E5', 'F#5:2 D5', 'E5:1.5 D5:.5 C5', 'D5:2 B4', 'C5 E5 A5', 'G5:1.5 F#5:.5 E5', 'C#5 E5 G5', 'F#5:2 -'].map(line);

const WALTZ: Song = {
  bpm: 138,
  bars: 40,
  meter: 3,
  reverb: 0.35,
  level: 1.5,
  play(bar, t, beat, out) {
    const sec = Math.floor(bar / 8);
    const i = bar % 8;
    const name = (sec === 2 ? W_B : W_A)[i]!;
    const ch = W_CHORD[name]!;
    const tones = chord(ch.tones);
    const h = hash(bar);
    // Oom-pah-pah: bass on 1, plucked chord on 2 and 3.
    pizz(out, nm(ch.root), t, 0.16);
    softBass(out, nm(ch.root), t, beat * 0.9, 0.06);
    for (const b of [1, 2]) tones.forEach((n, k) => pizz(out, n + 12, t + b * beat, 0.035, (k - 1) * 0.35));
    pad(out, tones, t, beat * 3, { vol: sec === 4 ? 0.02 : 0.012, cutoff: 1300, attack: 0.3, release: 0.8 });
    if (sec === 0) playLine(W_MEL_A1[i]!, t, beat, (n, at, d) => oboe(out, n, at, d, 0.06));
    if (sec === 1) {
      playLine(W_MEL_A2[i]!, t, beat, (n, at, d) => flute(out, n, at, d, 0.085));
      if (i % 2 === 0) bell(out, tones[h % 3]! + 24, t, 0.03, 1.8, 0.3);
    }
    if (sec === 2) playLine(W_MEL_B[i]!, t, beat, (n, at, d) => oboe(out, n, at, d, 0.055));
    if (sec === 3) {
      playLine(W_MEL_A1[i]!, t, beat, (n, at, d) => oboe(out, n, at, d, 0.06));
      playLine(W_MEL_A1[i]!, t, beat, (n, at, d) => flute(out, n + 12, at, d, 0.035));
      bell(out, tones[h % 3]! + 24, t + beat, 0.025, 1.6, -0.3);
    }
    if (sec === 4) {
      // Interlude: rolling harp, a celesta call, no lead — a breather before the loop.
      const up = [...tones.map((n) => n + 12), ...tones.map((n) => n + 24)];
      [0, 1, 2, 3, 4, 3].forEach((k, s) => harp(out, up[k]!, t + s * beat * 0.5, s === 0 ? 0.07 : 0.05, (k / 5 - 0.5) * 0.5));
      if (i % 2 === 1) bell(out, up[3 + (h % 3)]! + 12, t + beat * 1.5, 0.03, 2, 0.2);
    }
    // Light percussion: tambourine on the downbeat, a triangle ping to mark phrases.
    if (sec !== 4) tambourine(out, t, i % 2 === 0 ? 0.05 : 0.03);
    if (sec === 3) tambourine(out, t + beat * 2, 0.025);
    if (i === 0) bell(out, nm('D7'), t, 0.02, 1.2, 0.5);
  },
};

// ---------------------------------------------------------------------------------------------
// HOME — "Morning over the old city": D major, calm, 32 bars (dawn → walk → bright → rest)

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
// Battle + boss share the town band (oboe, flute, pizzicato, harp, celesta, tambourine) so all music
// feels like one soundtrack. Both sit in E minor — the relative minor of the map waltz (G major) —
// and in 6/8, i.e. the waltz's lilt sped up into a charge. Beat unit here = one eighth note.

interface Chord6 {
  root: number;
  /** root, third, fifth, top (octave or 7th) — the ostinato walks these. */
  tones: number[];
}
const K6 = (root: string, tones: string): Chord6 => ({ root: nm(root), tones: chord(tones) });
const E_CHORD: Record<string, Chord6> = {
  Em: K6('E2', 'E3 G3 B3 E4'),
  C: K6('C3', 'C3 E3 G3 C4'),
  D: K6('D3', 'D3 F#3 A3 D4'),
  G: K6('G2', 'G2 B2 D3 G3'),
  Am: K6('A2', 'A2 C3 E3 A3'),
  B: K6('B2', 'B2 D#3 F#3 B3'),
  B7: K6('B2', 'B2 D#3 F#3 A3'),
};
/** Galloping strings: eighths (6) or sixteenth pairs (12) per 6/8 bar, as indices into Chord6.tones. */
const GALLOP8 = [0, 3, 2, 3, 1, 2];
const GALLOP16 = [0, 0, 3, 3, 2, 2, 3, 3, 1, 1, 2, 2];

function gallop(out: AudioNode, ch: Chord6, t: number, e: number, vol: number, fast: boolean, oct = 12) {
  const sides = [pan(out.context, -0.3, out), pan(out.context, 0.3, out)];
  const shape = fast ? GALLOP16 : GALLOP8;
  const step = fast ? e / 2 : e;
  const accent = fast ? 6 : 3;
  shape.forEach((k, s) => spic(sides[s % 2]!, ch.tones[k]! + oct, t + s * step, step, s % accent === 0 ? vol : vol * 0.7));
}

// BATTLE — "Skirmish on the moat road": 6/8, dotted quarter = 100, 40 bars (A1 · B · A2 · harp break · B2).
// Theme A opens with the map waltz's rising arpeggio, now in minor.
const BT_A = ['Em', 'C', 'D', 'B7', 'Em', 'Am', 'B7', 'Em'];
const BT_B = ['G', 'D', 'Em', 'C', 'Am', 'Em', 'C', 'B7'];
const BT_MEL_A = ['B4:2 E5 G5:2 F#5', 'E5:2 D5 C5:2 E5', 'D5:2 F#5 A5:2 F#5', 'D#5:3 B4:3', 'B4:2 E5 G5:2 B5', 'A5:2 G5 E5:2 C5', 'D#5:2 F#5 A5:2 F#5', 'E5:3 B4:3'].map(line);
const BT_MEL_B = ['D5:2 G5 B5:2 A5', 'A5:3 F#5:2 D5', 'G5:2 F#5 E5:2 B4', 'C5:2 E5 G5:3', 'A5:2 G5 E5:2 C5', 'B4:2 E5 G5:2 E5', 'C6:2 B5 A5:2 G5', 'F#5:3 D#5:3'].map(line);

const BATTLE: Song = {
  bpm: 300,
  bars: 40,
  meter: 6,
  reverb: 0.25,
  level: 0.8,
  play(bar, t, e, out) {
    const sec = Math.floor(bar / 8);
    const i = bar % 8;
    const bSec = sec === 1 || sec === 4;
    const ch = E_CHORD[(bSec ? BT_B : BT_A)[i]!]!;
    const fast = sec === 2 || sec === 4;
    const h = hash(bar);
    // Band: galloping strings, pizzicato bass on 1 and 4, a soft string bed.
    gallop(out, ch, t, e, fast ? 0.04 : 0.045, fast);
    pizz(out, ch.root, t, 0.18);
    pizz(out, ch.root + (i % 2 ? 12 : 7), t + 3 * e, 0.12);
    softBass(out, ch.root, t, e * 5.5, 0.07);
    pad(out, ch.tones.slice(0, 3).map((n) => n + 12), t, e * 6, { vol: 0.012, cutoff: 1600, attack: 0.15, release: 0.4 });
    // Leads — the same voices as the town, pushed harder.
    if (sec === 0) playLine(BT_MEL_A[i]!, t, e, (n, at, d) => oboe(out, n, at, d, 0.065));
    if (sec === 1) {
      playLine(BT_MEL_B[i]!, t, e, (n, at, d) => flute(out, n, at, d, 0.09));
      if (i % 2 === 0) bell(out, ch.tones[h % 3]! + 36, t, 0.025, 1.4, 0.3);
    }
    if (sec === 2) {
      playLine(BT_MEL_A[i]!, t, e, (n, at, d) => oboe(out, n, at, d, 0.065));
      playLine(BT_MEL_A[i]!, t, e, (n, at, d) => flute(out, n + 12, at, d, 0.035));
    }
    if (sec === 3) {
      // Break: rolling harp over the band, celesta answers, drums build into B2.
      const up = [...ch.tones.map((n) => n + 12), ...ch.tones.map((n) => n + 24)];
      for (let s = 0; s < 12; s++) harp(out, up[s % 8]!, t + s * (e / 2), s % 6 === 0 ? 0.065 : 0.045, ((s % 8) / 7 - 0.5) * 0.6);
      if (i % 2 === 1) bell(out, up[5 + (h % 3)]!, t + 3 * e, 0.03, 1.6, -0.3);
    }
    if (sec === 4) {
      playLine(BT_MEL_B[i]!, t, e, (n, at, d) => flute(out, n, at, d, 0.09));
      playLine(BT_MEL_B[i]!, t, e, (n, at, d) => oboe(out, n - 12, at, d, 0.045));
    }
    // Harp sweep into each B section.
    if (bSec && i === 0) ch.tones.concat(ch.tones.map((n) => n + 12), ch.tones.map((n) => n + 24)).forEach((n, k) => harp(out, n + 12, Math.max(0, t - 0.3) + k * 0.025, 0.04));
    // Frame drum + tambourine (12 sixteenth steps per bar).
    if (i === 0 && sec > 0) crash(out, t, 0.07);
    const lanes =
      i === 7 && (sec === 3 || sec === 4) ? ['K.K.K.KKKKKK', '......rrrrrr', 't.....t.....']
      : sec === 0 ? ['K.....k...k.', 't.j.j.t.j.j.']
      : sec === 3 ? ['K.....k.....', 'j.j.j.j.j.j.']
      : fast ? ['K..k..K..k.k', '......s.....', 'tjjjjjtjjjjj']
      : ['K.....K...k.', '......s.....', 't.j.j.t.j.j.'];
    drums(out, t, e / 2, lanes, 1, 120);
  },
};

// BOSS — "Trial of the guardian": E harmonic minor, 6/8, dotted quarter = 88, 32 bars.
// Same band, darker: choir, low galloping strings, heavy drum; oboe then flute carry the melody.
const BS_A = ['Em', 'Em', 'C', 'B', 'Am', 'Em', 'Am', 'B'];
const BS_B = ['C', 'D', 'B', 'Em', 'C', 'D', 'B7', 'B'];
const BS_MEL_A = ['E5:3 G5:2 F#5', 'E5:2 D#5 E5:3', 'G5:3 E5:2 C5', 'D#5:3 F#5:3', 'A5:3 C6:2 B5', 'G5:2 F#5 E5:3', 'C5:2 E5 A5:2 G5', 'F#5:3 D#5:2 B4'].map(line);
const BS_MEL_B = ['E5:2 G5 C6:3', 'A5:2 F#5 D5:3', 'D#5:2 F#5 B5:3', 'B5:3 G5:2 E5', 'E5:2 G5 C6:2 B5', 'A5:2 F#5 D6:3', 'D#6:3 C6:2 A5', 'B5:6'].map(line);

const BOSS: Song = {
  bpm: 264,
  bars: 32,
  meter: 6,
  reverb: 0.3,
  level: 0.66,
  play(bar, t, e, out) {
    const sec = Math.floor(bar / 8);
    const i = bar % 8;
    const ch = E_CHORD[(sec === 2 ? BS_B : BS_A)[i]!]!;
    gallop(out, ch, t, e, 0.05, true, 0);
    pizz(out, ch.root, t, 0.2);
    pizz(out, ch.root, t + 3 * e, 0.14);
    softBass(out, ch.root, t, e * 5.5, 0.09);
    pad(out, ch.tones.slice(0, 3).map((n) => n + 24), t, e * 6, { vol: sec === 2 ? 0.032 : 0.026, cutoff: 2200, attack: 0.25, release: 0.5, choir: true });
    if (sec === 1 || sec === 3) {
      playLine(BS_MEL_A[i]!, t, e, (n, at, d) => oboe(out, n, at, d, 0.07));
      playLine(BS_MEL_A[i]!, t, e, (n, at, d) => pad(out, [n - 12], at, d, { vol: 0.018, cutoff: 1800, attack: 0.05, release: 0.25 }));
    }
    if (sec === 3) playLine(BS_MEL_A[i]!, t, e, (n, at, d) => flute(out, n + 12, at, d, 0.04));
    if (sec === 2) {
      playLine(BS_MEL_B[i]!, t, e, (n, at, d) => flute(out, n, at, d, 0.085));
      if (i % 2 === 0) bell(out, ch.tones[hash(bar) % 3]! + 36, t, 0.025, 1.6, 0.3);
    }
    if (i === 0) crash(out, t, 0.08);
    const lanes =
      i === 7 ? ['K..K..KKKKKK', '......rrrrrr', 't.....t.....']
      : sec === 0 ? ['K.....K..k..', 't.....t.....']
      : ['K..K..K..k.k', '......s.....', 'tjjjjjtjjjjj'];
    drums(out, t, e / 2, lanes, 1.1, 75);
  },
};

export const SONGS = { field: WALTZ, home: FIELD, battle: BATTLE, boss: BOSS };

// ---------------------------------------------------------------------------------------------
// Jingles (played on the SFX bus)

/** Victory fanfare (~3.5 s): harp run → brass call → full D-major chord with taiko, crash and celesta. */
export function victoryFanfare(out: AudioNode, t: number) {
  const e = 0.19;
  ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'D6'].map(nm).forEach((n, i) => harp(out, n, t + i * 0.035, 0.07, (i / 9 - 0.5) * 0.6));
  let x = t + 0.4;
  taiko(out, x, 0.4, 85);
  ['A4', 'D5', 'F#5'].map(nm).forEach((n, i) => brass(out, n, x + i * e, e * 0.85, 0.08));
  chord('D4 F#4 A4').forEach((n, k) => brass(out, n, x, e * 2.6, 0.03, (k - 1) * 0.4));
  x += 3 * e;
  crash(out, x, 0.08);
  taiko(out, x, 0.35, 85);
  brass(out, nm('A5'), x, e * 2.8, 0.085);
  pad(out, chord('D3 A3 D4 F#4'), x, e * 3, { vol: 0.02, cutoff: 2400, attack: 0.05, release: 0.3 });
  x += 3 * e;
  const walk: [string, string][] = [['G5', 'B3 D4 G4'], ['F#5', 'A3 D4 F#4'], ['E5', 'C#4 E4 A4']];
  walk.forEach(([m, c], i) => {
    brass(out, nm(m), x + i * e, e * 0.9, 0.08);
    chord(c).forEach((n, k) => brass(out, n, x + i * e, e * 0.8, 0.025, (k - 1) * 0.4));
  });
  taiko(out, x + 2 * e, 0.25, 110);
  x += 3 * e;
  // Final chord: held horns + strings, drum roll, crash and a celesta sparkle.
  brass(out, nm('F#5'), x, 1.4, 0.085);
  chord('D4 F#4 A4 D5').forEach((n, k) => brass(out, n, x, 1.3, 0.03, (k - 1.5) * 0.3));
  pad(out, chord('D3 A3 D4 F#4 A4'), x, 1.4, { vol: 0.022, cutoff: 2600, attack: 0.08, release: 1.2 });
  softBass(out, nm('D2'), x, 1.4, 0.12);
  crash(out, x, 0.11);
  [0, 0.06, 0.12, 0.18].forEach((d, i) => taiko(out, x + d, 0.2 + i * 0.07, 90));
  ['D6', 'F#6', 'A6', 'D7'].map(nm).forEach((n, i) => bell(out, n, x + 0.15 + i * 0.09, 0.035, 2, (i / 3 - 0.5) * 0.8));
}
