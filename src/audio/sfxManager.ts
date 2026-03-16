/**
 * SFX Manager — synthesized sound effects via Web Audio API.
 *
 * Lazily creates an AudioContext on first play call (respects browser
 * user-gesture requirement). All sounds are synthesized with
 * OscillatorNode + GainNode envelopes — no external audio files needed.
 *
 * Reads sfxEnabled / sfxVolume from the Zustand store before each play
 * call so SFX can be muted independently from mic input.
 */

import { useBoundStore } from '../stores'

let audioCtx: AudioContext | null = null

async function getContext(): Promise<AudioContext> {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  // Resume if suspended (browsers suspend until user gesture)
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume()
  }
  return audioCtx
}

// --- Helper: schedule an oscillator with gain envelope ---

interface ToneParams {
  frequency: number
  type: OscillatorType
  attackMs: number
  decayMs: number
  peakGain: number
  /** Optional detune in cents */
  detune?: number
}

function getSfxSettings() {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  return { sfxEnabled, sfxVolume }
}

async function playTone(params: ToneParams): Promise<void> {
  const ctx = await getContext()
  const { sfxVolume } = getSfxSettings()
  const now = ctx.currentTime
  const attack = params.attackMs / 1000
  const decay = params.decayMs / 1000

  const osc = ctx.createOscillator()
  osc.type = params.type
  osc.frequency.value = params.frequency
  if (params.detune) {
    osc.detune.value = params.detune
  }

  const gain = ctx.createGain()
  const scaledPeak = params.peakGain * sfxVolume
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(scaledPeak, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + attack + decay + 0.01)
}

// --- Public API ---

/** Bright chime — two harmonious tones for a correct note hit */
export async function playCorrect(): Promise<void> {
  if (!getSfxSettings().sfxEnabled) return
  await playTone({ frequency: 880, type: 'sine', attackMs: 5, decayMs: 200, peakGain: 0.3 })
  playTone({ frequency: 1320, type: 'sine', attackMs: 5, decayMs: 150, peakGain: 0.15 })
}

/** Harsh buzz — low sawtooth for a wrong note */
export async function playWrong(): Promise<void> {
  if (!getSfxSettings().sfxEnabled) return
  await playTone({ frequency: 150, type: 'sawtooth', attackMs: 10, decayMs: 250, peakGain: 0.25 })
  playTone({ frequency: 155, type: 'sawtooth', attackMs: 10, decayMs: 250, peakGain: 0.2 })
}

/** Short pop/burst when an enemy is defeated */
export async function playEnemyDeath(): Promise<void> {
  if (!getSfxSettings().sfxEnabled) return
  await playTone({ frequency: 600, type: 'triangle', attackMs: 5, decayMs: 120, peakGain: 0.25 })
  playTone({ frequency: 900, type: 'sine', attackMs: 5, decayMs: 80, peakGain: 0.15 })
}

/** Rising arpeggio to signal a new wave starting */
export async function playWaveStart(): Promise<void> {
  const { sfxEnabled, sfxVolume } = getSfxSettings()
  if (!sfxEnabled) return
  const ctx = await getContext()
  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  notes.forEach((freq, i) => {
    const now = ctx.currentTime
    const offset = i * 0.08
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.25 * sfxVolume, now + offset + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.26)
  })
}

/** Descending resolved chord — wave cleared successfully */
export async function playWaveEnd(): Promise<void> {
  const { sfxEnabled, sfxVolume } = getSfxSettings()
  if (!sfxEnabled) return
  const ctx = await getContext()
  const notes = [783.99, 659.25, 523.25] // G5, E5, C5 descending
  notes.forEach((freq, i) => {
    const now = ctx.currentTime
    const offset = i * 0.1
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.2 * sfxVolume, now + offset + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.36)
  })
}

/** Dramatic low rumble + descending tone for game over */
export async function playGameOver(): Promise<void> {
  const { sfxEnabled, sfxVolume } = getSfxSettings()
  if (!sfxEnabled) return
  // Low rumble
  await playTone({ frequency: 80, type: 'sawtooth', attackMs: 20, decayMs: 600, peakGain: 0.3 })
  // Descending whine
  const ctx = await getContext()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, now)
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.8)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.25 * sfxVolume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.91)
}
