/**
 * Card sounds, synthesised rather than sampled.
 *
 * A card being placed is mostly a short burst of filtered noise, and a slide
 * is that burst with the filter moving, so the whole set can be built from an
 * oscillator and a noise buffer. That keeps the download at zero bytes, works
 * offline, and means no sample licences to track.
 *
 * Everything here degrades to silence rather than throwing: there is no
 * AudioContext in tests, browsers refuse to start audio before the player has
 * interacted with the page, and a locked-down device may refuse entirely.
 */

export type SoundName =
  | 'deal'
  | 'draw'
  | 'place'
  | 'flip'
  | 'invalid'
  | 'undo'
  | 'complete'
  | 'win';

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
}

let engine: Engine | null = null;
let enabled = true;
let volume = 0.6;
/** Past this many cards the slides blur together, so stop adding them. */
const MAX_DEAL_SOUNDS = 24;
/** When the last deal started, so a repeated one is not stacked on top. */
let lastDealAt = -1;
/** Set once the browser has let us start, so callers can show the state. */
let unlocked = false;

function createEngine(): Engine | null {
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    // Two seconds of white noise, reused for every card sound.
    const frames = Math.floor(ctx.sampleRate * 2);
    const noise = ctx.createBuffer(1, frames, ctx.sampleRate);
    const channel = noise.getChannelData(0);
    for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1;

    return { ctx, master, noise };
  } catch {
    return null;
  }
}

function getEngine(): Engine | null {
  if (!engine) engine = createEngine();
  return engine;
}

/**
 * Let audio start.
 *
 * Browsers keep a new AudioContext suspended until the player has interacted
 * with the page, so this has to be called from a real event handler. Calling
 * it more than once is free.
 */
export function unlockSound(): void {
  const e = getEngine();
  if (!e) return;
  if (e.ctx.state === 'suspended') void e.ctx.resume().catch(() => undefined);
  unlocked = e.ctx.state !== 'suspended';
}

export function isSoundUnlocked(): boolean {
  return unlocked;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
}

export function setSoundVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next));
  if (engine) engine.master.gain.value = volume;
}

/** A little randomness per play, so a run of moves does not sound mechanical. */
function vary(value: number, amount = 0.03): number {
  return value * (1 + (Math.random() * 2 - 1) * amount);
}

/** One burst of filtered noise: the body of every card sound. */
function burst(
  e: Engine,
  at: number,
  opts: { freq: number; q: number; duration: number; gain: number; sweepTo?: number }
): void {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  // Start somewhere random in the buffer so repeats are not identical.
  const offset = Math.random() * (e.noise.duration - opts.duration - 0.05);

  const filter = e.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(vary(opts.freq), at);
  filter.Q.value = opts.q;
  if (opts.sweepTo !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(vary(opts.sweepTo), at + opts.duration);
  }

  const gain = e.ctx.createGain();
  // A fast attack and an exponential tail is what reads as "card", rather
  // than the click a hard cutoff would give.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(opts.gain, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + opts.duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(e.master);
  src.start(at, Math.max(0, offset), opts.duration + 0.05);
  src.stop(at + opts.duration + 0.05);
}

/** A pitched note, for the outcomes that are not a card touching another card. */
function tone(
  e: Engine,
  at: number,
  opts: { freq: number; duration: number; gain: number; type?: OscillatorType }
): void {
  const osc = e.ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, at);

  const gain = e.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(opts.gain, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + opts.duration);

  osc.connect(gain);
  gain.connect(e.master);
  osc.start(at);
  osc.stop(at + opts.duration + 0.02);
}

/**
 * The voices.
 *
 * Kept as data-ish functions so the timbre can be tuned in one place, and so
 * swapping any of them for a recorded sample later touches nothing else.
 */
const VOICES: Record<SoundName, (e: Engine, at: number) => void> = {
  // A card landing on a pile: a soft slap with a little body under it.
  place: (e, at) => {
    burst(e, at, { freq: 1400, q: 0.9, duration: 0.07, gain: 0.5 });
    tone(e, at, { freq: vary(160), duration: 0.05, gain: 0.12 });
  },
  // A card sliding off the deck: the same burst with the filter falling.
  deal: (e, at) => {
    burst(e, at, { freq: 2600, q: 0.7, duration: 0.11, gain: 0.32, sweepTo: 900 });
  },
  // Turning one card over, brighter and shorter than a landing.
  flip: (e, at) => {
    burst(e, at, { freq: 2400, q: 1.1, duration: 0.05, gain: 0.34, sweepTo: 1500 });
  },
  // Taking a card from the stock: quieter than dealing a whole row.
  draw: (e, at) => {
    burst(e, at, { freq: 2000, q: 0.8, duration: 0.08, gain: 0.28, sweepTo: 1100 });
  },
  // A refused move. Low and short, so it reads as "no" without scolding.
  invalid: (e, at) => {
    tone(e, at, { freq: 150, duration: 0.1, gain: 0.16, type: 'triangle' });
  },
  // Taking a move back: the deal sweep, running the other way.
  undo: (e, at) => {
    burst(e, at, { freq: 900, q: 0.7, duration: 0.1, gain: 0.26, sweepTo: 2200 });
  },
  // A foundation finished, or a Spider suit cleared.
  complete: (e, at) => {
    tone(e, at, { freq: 587.33, duration: 0.16, gain: 0.16 });
    tone(e, at + 0.08, { freq: 880, duration: 0.2, gain: 0.14 });
  },
  // The whole game. A major triad, arpeggiated.
  win: (e, at) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      tone(e, at + i * 0.11, { freq, duration: 0.34, gain: 0.16 });
    });
  },
};

/**
 * Play a sound, if sound is on and the browser has let us start.
 *
 * Never throws and never blocks: a game must not fail because audio did.
 */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  const e = getEngine();
  if (!e || e.ctx.state !== 'running') return;
  try {
    VOICES[name](e, e.ctx.currentTime);
  } catch {
    // A device that refuses to build audio nodes just gets a quiet game.
  }
}

/**
 * Play one sound per card in quick succession, for dealing a row.
 * The stagger is what makes a deal sound like a deal rather than a thud.
 */
/**
 * How long a hand takes to go out, whatever its size.
 *
 * Fixed rather than per-card so that Spider's 54 cards and Klondike's 28 both
 * finish in the same brisk moment, and so the sound and the animation start
 * and end together instead of drifting apart.
 */
export const DEAL_TOTAL_MS = 850;

/** The gap between one card and the next, for a hand of this size. */
export function dealStepMs(count: number): number {
  return count <= 1 ? 0 : DEAL_TOTAL_MS / count;
}

export function playDealSequence(count: number): void {
  if (!enabled) return;
  const e = getEngine();
  if (!e || e.ctx.state !== 'running') return;
  // React's StrictMode runs mount effects twice in development, which deals
  // twice. One deal should still sound like one deal.
  const now = e.ctx.currentTime;
  if (now - lastDealAt < DEAL_TOTAL_MS / 1000) return;
  lastDealAt = now;
  // Past a couple of dozen the slides blur into noise, so play fewer of them
  // spread across the same window rather than one per card.
  const voices = Math.min(count, MAX_DEAL_SOUNDS);
  const step = voices <= 1 ? 0 : DEAL_TOTAL_MS / voices;
  try {
    for (let i = 0; i < voices; i++) {
      VOICES.deal(e, e.ctx.currentTime + (i * step) / 1000);
    }
  } catch {
    // as above
  }
}

/** Test seam: forget the engine so a fresh one is built on next use. */
export function resetSoundEngineForTests(): void {
  engine = null;
  lastDealAt = -1;
  unlocked = false;
  enabled = true;
  volume = 0.6;
}
