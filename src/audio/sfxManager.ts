/**
 * SFX Manager — synthesized sound effects via Web Audio API.
 *
 * Singleton. AudioContext is created lazily on first play call
 * (respects browser user-gesture requirement).
 *
 * Reads sfxEnabled / sfxVolume from the Zustand store before each play call.
 * When SFX is disabled, play functions are no-ops — mic input is unaffected.
 */

import { useBoundStore } from '../stores'

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
  }
  // Resume if suspended (autoplay policy)
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/**
 * Optionally share an existing AudioContext (e.g. from mic input).
 * Call before any play* if you want to reuse.
 */
export function setAudioContext(external: AudioContext): void {
  ctx = external;
}

// ── store integration ───────────────────────────────────────────────

/** Returns false if SFX should not play. */
function shouldPlay(): boolean {
  return useBoundStore.getState().settings.sfxEnabled;
}

/** Current SFX volume (0–1). */
function getVolume(): number {
  return useBoundStore.getState().settings.sfxVolume;
}

// ── helpers ──────────────────────────────────────────────────────────

function osc(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  endTime: number,
  gain: GainNode,
): OscillatorNode {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(gain);
  o.start(startTime);
  o.stop(endTime);
  return o;
}

function envelope(
  ac: AudioContext,
  startTime: number,
  attack: number,
  sustain: number,
  release: number,
  peak = 0.3,
): GainNode {
  const vol = getVolume();
  const scaledPeak = peak * vol;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(scaledPeak, startTime + attack);
  g.gain.setValueAtTime(scaledPeak, startTime + attack + sustain);
  g.gain.linearRampToValueAtTime(0, startTime + attack + sustain + release);
  g.connect(ac.destination);
  return g;
}

// ── sound events ────────────────────────────────────────────────────

/** Short bright chime — correct note hit */
export function playCorrect(): void {
  if (!shouldPlay()) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const g = envelope(ac, t, 0.01, 0.06, 0.15, 0.25);
  osc(ac, 'sine', 880, t, t + 0.22, g);
  osc(ac, 'sine', 1320, t + 0.03, t + 0.22, g);
}

/** Harsh buzz — wrong note */
export function playWrong(): void {
  if (!shouldPlay()) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const g = envelope(ac, t, 0.01, 0.08, 0.12, 0.2);
  osc(ac, 'sawtooth', 120, t, t + 0.21, g);
  osc(ac, 'square', 90, t, t + 0.21, g);
}

/** Quick descending pop — enemy defeated */
export function playEnemyDeath(): void {
  if (!shouldPlay()) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const g = envelope(ac, t, 0.005, 0.05, 0.1, 0.2);
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.15);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.16);
}

/** Rising arpeggio — wave starting */
export function playWaveStart(): void {
  if (!shouldPlay()) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((freq, i) => {
    const start = t + i * 0.1;
    const g = envelope(ac, start, 0.01, 0.06, 0.1, 0.2);
    osc(ac, 'triangle', freq, start, start + 0.17, g);
  });
}

/** Descending triad — wave ended */
export function playWaveEnd(): void {
  if (!shouldPlay()) return;
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [783.99, 659.25, 523.25]; // G5 E5 C5
  notes.forEach((freq, i) => {
    const start = t + i * 0.12;
    const g = envelope(ac, start, 0.01, 0.08, 0.12, 0.18);
    osc(ac, 'sine', freq, start, start + 0.21, g);
  });
}

/** Dramatic low rumble + descending tone — game over */
export function playGameOver(): void {
  if (!shouldPlay()) return;
  const ac = getCtx();
  const t = ac.currentTime;

  // Low rumble
  const g1 = envelope(ac, t, 0.05, 0.4, 0.5, 0.15);
  osc(ac, 'sawtooth', 55, t, t + 0.95, g1);

  // Descending wail
  const g2 = envelope(ac, t, 0.05, 0.3, 0.6, 0.18);
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(440, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.9);
  o.connect(g2);
  o.start(t);
  o.stop(t + 0.95);
}
