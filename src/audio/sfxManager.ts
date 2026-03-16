/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton module that lazily creates an AudioContext on first play call,
 * respecting browser user-gesture requirements. All sounds are synthesized
 * with OscillatorNode + GainNode envelopes — no external audio files needed.
 *
 * Reads sfxEnabled / sfxVolume from the Zustand store so that the settings
 * panel controls all SFX output without affecting mic input.
 */

import { useBoundStore } from '../stores'

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.connect(audioCtx.destination)
  }
  // Resume if suspended (browsers suspend until user gesture)
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function getMasterGain(): GainNode {
  getContext() // ensure initialised
  return masterGain!
}

/** Check store state; returns false (skip play) when SFX is disabled. */
function shouldPlay(): boolean {
  const { sfxEnabled } = useBoundStore.getState().settings
  return sfxEnabled
}

/** Sync the master gain node with the store's sfxVolume. */
function syncVolume(): void {
  const { sfxVolume } = useBoundStore.getState().settings
  const gain = getMasterGain()
  gain.gain.setValueAtTime(sfxVolume, getContext().currentTime)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator that plays a tone with an ADSR-style gain envelope. */
function playTone(
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  attackTime: number,
  releaseTime: number,
  ctx: AudioContext,
  destination: AudioNode = getMasterGain(),
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)

  // Envelope: ramp up (attack), hold, ramp down (release)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attackTime)
  gain.gain.setValueAtTime(gainPeak, startTime + duration - releaseTime)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(gain)
  gain.connect(destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

// ---------------------------------------------------------------------------
// Sound effects
// ---------------------------------------------------------------------------

/**
 * Correct note — bright ascending chime (two quick sine tones).
 */
export function playCorrect(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ctx = getContext()
  const now = ctx.currentTime

  playTone(880, 'sine', now, 0.15, 0.3, 0.01, 0.08, ctx)
  playTone(1320, 'sine', now + 0.08, 0.15, 0.3, 0.01, 0.08, ctx)
}

/**
 * Wrong note — short low buzz (sawtooth oscillator).
 */
export function playWrong(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ctx = getContext()
  const now = ctx.currentTime

  playTone(110, 'sawtooth', now, 0.2, 0.25, 0.01, 0.1, ctx)
}

/**
 * Enemy death — descending "pop" (sine sweep from high to low).
 */
export function playEnemyDeath(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ctx = getContext()
  const now = ctx.currentTime
  const dest = getMasterGain()

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.2)

  gain.gain.setValueAtTime(0.3, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.25)

  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + 0.25)
}

/**
 * Wave start — rising fanfare (three ascending triangle tones).
 */
export function playWaveStart(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ctx = getContext()
  const now = ctx.currentTime

  playTone(440, 'triangle', now, 0.15, 0.25, 0.01, 0.06, ctx)
  playTone(554, 'triangle', now + 0.12, 0.15, 0.25, 0.01, 0.06, ctx)
  playTone(660, 'triangle', now + 0.24, 0.2, 0.3, 0.01, 0.1, ctx)
}

/**
 * Wave end — triumphant chord (three simultaneous triangle tones with longer sustain).
 */
export function playWaveEnd(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ctx = getContext()
  const now = ctx.currentTime

  playTone(523, 'triangle', now, 0.4, 0.25, 0.01, 0.2, ctx)
  playTone(659, 'triangle', now, 0.4, 0.25, 0.01, 0.2, ctx)
  playTone(784, 'triangle', now, 0.4, 0.25, 0.01, 0.2, ctx)
}

/**
 * Game over — ominous descending sequence (three low sine tones stepping down).
 */
export function playGameOver(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ctx = getContext()
  const now = ctx.currentTime

  playTone(330, 'sine', now, 0.3, 0.3, 0.01, 0.15, ctx)
  playTone(262, 'sine', now + 0.25, 0.3, 0.3, 0.01, 0.15, ctx)
  playTone(196, 'sine', now + 0.5, 0.5, 0.3, 0.01, 0.3, ctx)
}

// ---------------------------------------------------------------------------
// Legacy mute control (kept for backward compatibility during transition)
// ---------------------------------------------------------------------------

export function setSfxMuted(value: boolean): void {
  useBoundStore.getState().setSfxEnabled(!value)
}

export function isSfxMuted(): boolean {
  return !useBoundStore.getState().settings.sfxEnabled
}
