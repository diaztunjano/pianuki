/**
 * SFX Manager — synthesizes game sound effects using Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (respects browser user-gesture requirement). All sounds are synthesized
 * with OscillatorNode + GainNode envelopes — no external audio files.
 *
 * Reads sfxEnabled / sfxVolume from the Zustand store before every play call
 * so settings changes take effect immediately.
 */

import { useBoundStore } from '../stores'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/** Returns the master GainNode that all SFX route through. */
function getMasterGain(): GainNode {
  getContext()
  return masterGain!
}

/** Read current SFX settings from the store. Returns false if SFX should not play. */
function shouldPlay(): boolean {
  return useBoundStore.getState().settings.sfxEnabled
}

/** Sync the master gain value with the store's sfxVolume. */
function syncVolume(): void {
  const vol = useBoundStore.getState().settings.sfxVolume
  const mg = getMasterGain()
  mg.gain.setValueAtTime(vol, mg.context.currentTime)
}

// ---------------------------------------------------------------------------
// Sound synthesis helpers
// ---------------------------------------------------------------------------

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  volume: number,
  rampDown = true,
): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(volume, ac.currentTime)

  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  }

  osc.connect(gain)
  gain.connect(getMasterGain())
  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + duration)
}

function playChord(
  frequencies: number[],
  type: OscillatorType,
  duration: number,
  volume: number,
): void {
  if (!shouldPlay()) return
  const perOsc = volume / frequencies.length
  for (const freq of frequencies) {
    playTone(freq, type, duration, perOsc)
  }
}

// ---------------------------------------------------------------------------
// Public play functions
// ---------------------------------------------------------------------------

/** Correct note — bright ascending chime (major third interval). */
export function playCorrect(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const now = ac.currentTime
  const output = getMasterGain()

  // Two quick ascending sine tones
  const notes = [523.25, 659.25] // C5, E5
  for (let i = 0; i < notes.length; i++) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = notes[i]
    gain.gain.setValueAtTime(0, now + i * 0.08)
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2)
    osc.connect(gain)
    gain.connect(output)
    osc.start(now + i * 0.08)
    osc.stop(now + i * 0.08 + 0.2)
  }
}

/** Wrong note — dissonant buzz. */
export function playWrong(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const now = ac.currentTime
  const output = getMasterGain()

  // Two detuned sawtooth oscillators for a harsh buzz
  const freqs = [110, 117] // close frequencies = beat frequency buzz
  for (const freq of freqs) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(output)
    osc.start(now)
    osc.stop(now + 0.3)
  }
}

/** Enemy death — quick descending "pop". */
export function playEnemyDeath(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const now = ac.currentTime
  const output = getMasterGain()

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15)
  gain.gain.setValueAtTime(0.3, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  osc.connect(gain)
  gain.connect(output)
  osc.start(now)
  osc.stop(now + 0.15)
}

/** Wave start — rising sweep. */
export function playWaveStart(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const now = ac.currentTime
  const output = getMasterGain()

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, now)
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.3)
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(gain)
  gain.connect(output)
  osc.start(now)
  osc.stop(now + 0.4)
}

/** Wave end — triumphant major chord arpeggio. */
export function playWaveEnd(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const now = ac.currentTime
  const output = getMasterGain()

  // C major arpeggio: C5, E5, G5
  const notes = [523.25, 659.25, 783.99]
  for (let i = 0; i < notes.length; i++) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = notes[i]
    const start = now + i * 0.1
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.2, start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
    osc.connect(gain)
    gain.connect(output)
    osc.start(start)
    osc.stop(start + 0.4)
  }
}

/** Game over — descending minor chord, slow fade. */
export function playGameOver(): void {
  if (!shouldPlay()) return
  syncVolume()
  const ac = getContext()
  const now = ac.currentTime
  const output = getMasterGain()

  // Descending minor triad: Eb4, C4, Ab3
  const notes = [311.13, 261.63, 207.65]
  for (let i = 0; i < notes.length; i++) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = notes[i]
    const start = now + i * 0.2
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.2, start + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8)
    osc.connect(gain)
    gain.connect(output)
    osc.start(start)
    osc.stop(start + 0.8)
  }
}
