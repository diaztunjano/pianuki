/**
 * SFX Manager — synthesizes game sound effects using Web Audio API.
 *
 * All sounds are built from OscillatorNode + GainNode envelopes,
 * requiring no external audio files. The AudioContext is created lazily
 * on the first play call to respect the browser user-gesture requirement.
 */

let ctx: AudioContext | null = null
let muted = false
let masterVolume = 0.7

/** Lazily initialise (or resume) the shared AudioContext. */
function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  // Browsers suspend contexts created before a user gesture — resume if needed
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/**
 * Allow external code to provide an already-running AudioContext
 * (e.g. the one created by mic input) so we share a single context.
 */
export function setAudioContext(externalCtx: AudioContext): void {
  ctx = externalCtx
}

export function setSfxMuted(value: boolean): void {
  muted = value
}

export function isSfxMuted(): boolean {
  return muted
}

export function setSfxVolume(value: number): void {
  masterVolume = Math.max(0, Math.min(1, value))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator that plays for a given duration with an ADSR-ish envelope. */
function playTone(
  ac: AudioContext,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  volume: number,
  attackTime = 0.01,
  releaseTime = 0.05,
): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const scaledVol = volume * masterVolume
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(scaledVol, startTime + attackTime)
  gain.gain.setValueAtTime(scaledVol, startTime + duration - releaseTime)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

// ---------------------------------------------------------------------------
// Public play functions
// ---------------------------------------------------------------------------

/**
 * Correct note — bright ascending two-tone chime (C6 → E6).
 */
export function playCorrect(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(ac, 1047, 'sine', t, 0.12, 0.25, 0.005, 0.04)       // C6
  playTone(ac, 1319, 'sine', t + 0.08, 0.14, 0.25, 0.005, 0.06) // E6
}

/**
 * Wrong note — short low buzz.
 */
export function playWrong(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(ac, 110, 'sawtooth', t, 0.18, 0.2, 0.005, 0.06)
  playTone(ac, 92, 'square', t, 0.18, 0.1, 0.005, 0.06)
}

/**
 * Enemy death — quick descending blip (G5 → C5).
 */
export function playEnemyDeath(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(784, t)          // G5
  osc.frequency.exponentialRampToValueAtTime(523, t + 0.15) // → C5
  gain.gain.setValueAtTime(0.3 * masterVolume, t)
  gain.gain.linearRampToValueAtTime(0, t + 0.2)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.2)
}

/**
 * Wave start — ascending arpeggio (C5 → E5 → G5).
 */
export function playWaveStart(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(ac, 523, 'sine', t, 0.12, 0.2, 0.005, 0.04)        // C5
  playTone(ac, 659, 'sine', t + 0.1, 0.12, 0.2, 0.005, 0.04)  // E5
  playTone(ac, 784, 'sine', t + 0.2, 0.18, 0.25, 0.005, 0.08) // G5
}

/**
 * Wave end — descending two-tone resolution (G5 → C5), longer sustain.
 */
export function playWaveEnd(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(ac, 784, 'sine', t, 0.15, 0.2, 0.005, 0.05)        // G5
  playTone(ac, 523, 'sine', t + 0.12, 0.25, 0.25, 0.005, 0.1) // C5
}

/**
 * Game over — ominous descending minor sequence (E4 → D#4 → D4 → C4)
 * with longer sustain to convey finality.
 */
export function playGameOver(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  const notes = [330, 311, 294, 262] // E4, D#4, D4, C4
  for (let i = 0; i < notes.length; i++) {
    playTone(ac, notes[i], 'triangle', t + i * 0.2, 0.3, 0.25, 0.01, 0.1)
  }
}
