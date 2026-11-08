/**
 * Tiny synthesized sound-effects engine (Web Audio, no audio files).
 * Browsers only allow audio after a user gesture, so call sfx.resume() from a
 * click / key / pointer handler first; everything else is a no-op until then.
 */

export type SfxMode = "stretch" | "bulge" | "drum" | "shatter" | "dust";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let scrubGain: GainNode | null = null;
let scrubBand: BiquadFilterNode | null = null;
let muted = false;

const MASTER = 0.55;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  master.connect(ctx.destination);

  // two seconds of white noise, reused by every noise-based effect
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // continuous "air" that follows scroll speed
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  scrubBand = ctx.createBiquadFilter();
  scrubBand.type = "bandpass";
  scrubBand.frequency.value = 500;
  scrubBand.Q.value = 0.8;
  scrubGain = ctx.createGain();
  scrubGain.gain.value = 0;
  src.connect(scrubBand).connect(scrubGain).connect(master);
  src.start();
  return ctx;
}

type ToneOpts = { f0: number; f1?: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };
function tone({ f0, f1 = f0, dur, type = "sine", gain = 0.15, delay = 0 }: ToneOpts) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

type BurstOpts = { dur: number; type?: BiquadFilterType; freq: number; freq2?: number; q?: number; gain?: number; delay?: number };
function burst({ dur, type = "bandpass", freq, freq2 = freq, q = 0.7, gain = 0.2, delay = 0 }: BurstOpts) {
  if (!ctx || !master || !noise || muted) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.02);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export const sfx = {
  /** Call from a user gesture. */
  resume() {
    const c = ensure();
    if (c && c.state === "suspended") void c.resume();
  },

  setMuted(m: boolean) {
    muted = m;
    if (ctx && master) master.gain.setTargetAtTime(m ? 0 : MASTER, ctx.currentTime, 0.04);
  },

  /** 0..1 scroll speed -> soft airy whoosh. */
  scrub(v: number) {
    if (!ctx || !scrubGain || !scrubBand || muted) return;
    const t = ctx.currentTime;
    scrubGain.gain.setTargetAtTime(v * v * 0.1, t, 0.05);
    scrubBand.frequency.setTargetAtTime(350 + v * 1700, t, 0.06);
  },

  /** Small UI tick for buttons. */
  ui() {
    tone({ f0: 1100, f1: 640, dur: 0.06, type: "triangle", gain: 0.11 });
  },

  /** Soft tick when the pointer glides over a new cube. */
  hover() {
    tone({ f0: rand(1500, 2300), f1: rand(900, 1300), dur: 0.04, type: "triangle", gain: 0.035 });
  },

  /** Layer of the puzzle cube snapping round. */
  clack() {
    tone({ f0: 320, f1: 120, dur: 0.07, type: "triangle", gain: 0.2 });
    burst({ dur: 0.04, type: "bandpass", freq: 1800, freq2: 900, q: 1.2, gain: 0.12 });
  },

  /** The cube wall tumbling away: a deep thump, a rush of air and a clatter of blocks. */
  enter() {
    if (!ctx) return;
    tone({ f0: 130, f1: 38, dur: 0.55, gain: 0.5 });
    burst({ dur: 0.9, type: "lowpass", freq: 2200, freq2: 180, q: 0.5, gain: 0.2, delay: 0.05 });
    burst({ dur: 0.7, type: "highpass", freq: 1400, freq2: 500, q: 0.5, gain: 0.1, delay: 0.3 });
    for (let i = 0; i < 18; i++) {
      const f = rand(260, 900);
      tone({ f0: f, f1: f * 0.45, dur: 0.07, type: "square", gain: 0.035, delay: 0.25 + i * 0.05 + rand(0, 0.03) });
    }
  },

  /** A card landed in the centre: sound depends on the active effect. */
  card(mode: SfxMode) {
    if (!ctx) return;
    switch (mode) {
      case "stretch": // elastic boing
        tone({ f0: 210, f1: 540, dur: 0.17, gain: 0.16 });
        tone({ f0: 540, f1: 250, dur: 0.24, type: "triangle", gain: 0.1, delay: 0.1 });
        burst({ dur: 0.22, freq: 900, freq2: 300, gain: 0.06 });
        break;
      case "bulge": // soft bloop
        tone({ f0: 260, f1: 720, dur: 0.13, gain: 0.17 });
        tone({ f0: 720, f1: 420, dur: 0.12, delay: 0.11, gain: 0.1 });
        break;
      case "drum": // low thump
        tone({ f0: 150, f1: 46, dur: 0.3, gain: 0.5 });
        burst({ dur: 0.05, type: "lowpass", freq: 600, freq2: 200, gain: 0.22 });
        break;
      case "shatter": // glass
        burst({ dur: 0.38, type: "highpass", freq: 2600, freq2: 5200, q: 0.5, gain: 0.26 });
        tone({ f0: 95, f1: 40, dur: 0.09, type: "square", gain: 0.1 });
        for (let i = 0; i < 7; i++) {
          tone({ f0: rand(2800, 7200), dur: 0.13, gain: 0.05, delay: rand(0, 0.18) });
        }
        break;
      case "dust": // airy hiss with sparkle
        burst({ dur: 0.55, freq: 3200, freq2: 1800, q: 0.6, gain: 0.1 });
        for (let i = 0; i < 10; i++) {
          tone({ f0: rand(4200, 9500), dur: 0.05, gain: 0.025, delay: rand(0, 0.42) });
        }
        break;
    }
  },
};
