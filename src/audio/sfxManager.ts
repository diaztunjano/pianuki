/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * AudioContext is created lazily on first play call, satisfying the browser's
 * user gesture requirement for AudioContext creation.
 *
 * An external AudioContext (e.g., from mic input setup in useAudioInput) can
 * be injected via provideAudioContext() to avoid spinning up a second context.
 */

import { useBoundStore } from '../stores'

let ctx: AudioContext | null = null

// --- Context management ---

/**
 * Inject an existing AudioContext so sfxManager doesn't create a second one.
 * Call this from useAudioInput after the AudioContext is created.
 */
export function provideAudioContext(audioContext: AudioContext): void {
  ctx = audioContext
}

/** Get or create the shared AudioContext. Resumes it if suspended. */
async function getCtx(): Promise<AudioContext> {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  return ctx
}

// --- Internal synthesis helper ---

interface OscillatorParams {
  type: OscillatorType
  frequency: number
  startTime: number
  /** Total duration before the node stops. */
  duration: number
  /** Peak gain amplitude (0–1). */
  gainPeak: number
  /** Attack ramp time in seconds. */
  attackTime?: number
  /** Decay ramp time in seconds — defaults to duration. */
  decayTime?: number
}

function scheduleOscillator(ac: AudioContext, volume: number, params: OscillatorParams): void {
  const {
    type,
    frequency,
    startTime,
    duration,
    gainPeak,
    attackTime = 0.01,
    decayTime = duration,
  } = params

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)

  const scaledPeak = gainPeak * volume
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(scaledPeak, startTime + attackTime)
  // exponentialRamp requires a positive non-zero target value
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.05) // slight tail so the ramp finishes
}

// --- Named play functions ---

/**
 * Play a two-tone ascending chime when the player hits the correct note.
 * C5 + G5 (perfect fifth), sine wave, quick decay.
 */
export async function playCorrect(): Promise<void> {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return
  const ac = await getCtx()
  const t = ac.currentTime
  scheduleOscillator(ac, sfxVolume, { type: 'sine', frequency: 523.25, startTime: t, duration: 0.3, gainPeak: 0.3, attackTime: 0.005, decayTime: 0.3 })
  scheduleOscillator(ac, sfxVolume, { type: 'sine', frequency: 783.99, startTime: t + 0.05, duration: 0.25, gainPeak: 0.2, attackTime: 0.005, decayTime: 0.25 })
}

/**
 * Play a short dissonant buzz when the player hits a wrong note.
 * Low sawtooth at 110 Hz — cuts through without being too harsh.
 */
export async function playWrong(): Promise<void> {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return
  const ac = await getCtx()
  const t = ac.currentTime
  scheduleOscillator(ac, sfxVolume, { type: 'sawtooth', frequency: 110, startTime: t, duration: 0.15, gainPeak: 0.25, attackTime: 0.005, decayTime: 0.15 })
}

/**
 * Play a short descending pitch-drop when an enemy is defeated.
 * Square wave sweeps from 440 Hz → 55 Hz over 200 ms.
 */
export async function playEnemyDeath(): Promise<void> {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return
  const ac = await getCtx()
  const t = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = 'square'
  osc.frequency.setValueAtTime(440, t)
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.2)

  gain.gain.setValueAtTime(0.2 * sfxVolume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.25)
}

/**
 * Play a three-note ascending arpeggio (C4–E4–G4) to signal wave start.
 * Triangle wave gives a softer, atmospheric feel.
 */
export async function playWaveStart(): Promise<void> {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return
  const ac = await getCtx()
  const t = ac.currentTime
  const notes = [261.63, 329.63, 392.0] // C4, E4, G4
  notes.forEach((freq, i) => {
    scheduleOscillator(ac, sfxVolume, { type: 'triangle', frequency: freq, startTime: t + i * 0.1, duration: 0.2, gainPeak: 0.25, attackTime: 0.01, decayTime: 0.2 })
  })
}

/**
 * Play a three-note ascending resolution (G4–C5–E5) when a wave is cleared.
 * Sine wave sounds triumphant and clean.
 */
export async function playWaveEnd(): Promise<void> {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return
  const ac = await getCtx()
  const t = ac.currentTime
  const notes = [392.0, 523.25, 659.25] // G4, C5, E5
  notes.forEach((freq, i) => {
    scheduleOscillator(ac, sfxVolume, { type: 'sine', frequency: freq, startTime: t + i * 0.1, duration: 0.35, gainPeak: 0.3, attackTime: 0.01, decayTime: 0.35 })
  })
}

/**
 * Play a four-note descending dirge (D4–B3–A3–G3) for game over.
 * Sawtooth gives a gloomy, dramatic tone.
 */
export async function playGameOver(): Promise<void> {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return
  const ac = await getCtx()
  const t = ac.currentTime
  const notes = [293.66, 246.94, 220.0, 196.0] // D4, B3, A3, G3
  notes.forEach((freq, i) => {
    scheduleOscillator(ac, sfxVolume, { type: 'sawtooth', frequency: freq, startTime: t + i * 0.2, duration: 0.35, gainPeak: 0.2, attackTime: 0.01, decayTime: 0.35 })
  })
}
