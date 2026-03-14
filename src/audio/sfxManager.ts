/**
 * sfxManager — Singleton for synthesized sound effects using the Web Audio API.
 *
 * Design principles:
 * - AudioContext is created lazily on the first play call to satisfy the
 *   browser's user-gesture requirement (no autoplay restriction violation).
 * - All sounds are synthesized with OscillatorNode + GainNode envelopes —
 *   zero external audio file dependencies.
 * - A simple `muted` flag silences all output without closing the context.
 * - The module exposes plain functions (not a class) for ergonomic imports.
 */

// --- Internal state ---

let _ctx: AudioContext | null = null
let _muted = false

/** Lazily obtain (or create) the shared AudioContext. */
function getContext(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext()
  }
  // Resume in case the context was suspended (e.g. tab switch)
  if (_ctx.state === 'suspended') {
    void _ctx.resume()
  }
  return _ctx
}

// --- Mute control ---

/** Mute or unmute all SFX. Does not affect mic input. */
export function setSfxMuted(muted: boolean): void {
  _muted = muted
}

/** Returns true if SFX are currently muted. */
export function isSfxMuted(): boolean {
  return _muted
}

// --- Low-level helpers ---

/**
 * Schedule a single oscillator burst.
 *
 * @param type      OscillatorType ('sine' | 'square' | 'sawtooth' | 'triangle')
 * @param frequency Start frequency in Hz
 * @param endFreq   End frequency in Hz (for pitch glide); omit to keep constant
 * @param startTime AudioContext time the note should start
 * @param duration  Total duration in seconds
 * @param peakGain  Peak gain (0–1), reached after attackTime
 * @param attackTime Seconds to ramp from 0 to peakGain
 * @param decayTime Seconds to ramp from peakGain to 0 (release)
 */
function scheduleOscillator(
  ctx: AudioContext,
  type: OscillatorType,
  frequency: number,
  endFreq: number | null,
  startTime: number,
  duration: number,
  peakGain: number,
  attackTime: number,
  decayTime: number,
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  if (endFreq !== null) {
    osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration)
  }

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime)
  // Hold briefly then decay
  const decayStart = startTime + attackTime
  gain.gain.setValueAtTime(peakGain, decayStart)
  gain.gain.linearRampToValueAtTime(0, decayStart + decayTime)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.01) // tiny buffer to avoid click
}

// --- Public play functions ---

/**
 * Correct note: bright chime — two harmonics of a high C, quick attack.
 */
export function playCorrect(): void {
  if (_muted) return
  const ctx = getContext()
  const now = ctx.currentTime

  // Fundamental ~1047 Hz (C6) + octave up
  scheduleOscillator(ctx, 'sine', 1047, null, now, 0.5, 0.5, 0.005, 0.45)
  scheduleOscillator(ctx, 'sine', 2093, null, now, 0.35, 0.25, 0.005, 0.3)
}

/**
 * Wrong note: harsh buzz — low sawtooth with a short sharp envelope.
 */
export function playWrong(): void {
  if (_muted) return
  const ctx = getContext()
  const now = ctx.currentTime

  scheduleOscillator(ctx, 'sawtooth', 110, 80, now, 0.3, 0.4, 0.005, 0.28)
  scheduleOscillator(ctx, 'square', 165, null, now, 0.2, 0.15, 0.005, 0.18)
}

/**
 * Enemy death: descending frequency sweep — satisfying "pew" / dissolve.
 */
export function playEnemyDeath(): void {
  if (_muted) return
  const ctx = getContext()
  const now = ctx.currentTime

  scheduleOscillator(ctx, 'sine', 600, 120, now, 0.4, 0.4, 0.005, 0.38)
  scheduleOscillator(ctx, 'triangle', 300, 80, now, 0.35, 0.2, 0.005, 0.33)
}

/**
 * Wave start: ascending two-tone fanfare.
 */
export function playWaveStart(): void {
  if (_muted) return
  const ctx = getContext()
  const now = ctx.currentTime

  // Three quick ascending notes
  scheduleOscillator(ctx, 'sine', 392, null, now,        0.18, 0.4, 0.01, 0.16)
  scheduleOscillator(ctx, 'sine', 523, null, now + 0.15, 0.18, 0.4, 0.01, 0.16)
  scheduleOscillator(ctx, 'sine', 659, null, now + 0.30, 0.25, 0.4, 0.01, 0.22)
}

/**
 * Wave end / wave clear: uplifting three-note chord swell.
 */
export function playWaveEnd(): void {
  if (_muted) return
  const ctx = getContext()
  const now = ctx.currentTime

  // Major triad
  scheduleOscillator(ctx, 'sine', 523, null, now, 0.6, 0.35, 0.02, 0.55)  // C5
  scheduleOscillator(ctx, 'sine', 659, null, now, 0.6, 0.30, 0.02, 0.55)  // E5
  scheduleOscillator(ctx, 'sine', 784, null, now, 0.6, 0.25, 0.02, 0.55)  // G5
}

/**
 * Game over: descending slow tone — heavy and final.
 */
export function playGameOver(): void {
  if (_muted) return
  const ctx = getContext()
  const now = ctx.currentTime

  // Slow descending sweep with longer decay
  scheduleOscillator(ctx, 'sine',     220, 55,  now, 1.2, 0.5, 0.02, 1.1)
  scheduleOscillator(ctx, 'triangle', 110, 40,  now, 1.4, 0.3, 0.02, 1.35)
  // Low rumble
  scheduleOscillator(ctx, 'sawtooth', 55,  null, now, 0.8, 0.15, 0.01, 0.78)
}
