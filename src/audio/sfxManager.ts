/**
 * sfxManager — Web Audio API sound effects synthesizer.
 *
 * Singleton module that lazily creates an AudioContext and synthesizes
 * all game sound effects using OscillatorNode + GainNode envelopes.
 * No external audio files are required.
 *
 * Usage:
 *   import { playCorrect, playWrong } from '../audio/sfxManager'
 *   playCorrect()
 *
 * AudioContext lifecycle:
 *   Created on first play call (satisfies browser user-gesture requirement).
 *   Call setSharedAudioContext() to reuse an existing context (e.g. from mic input)
 *   before the first play call to avoid creating a second AudioContext.
 */

let ctx: AudioContext | null = null

/**
 * Returns the singleton AudioContext, creating it lazily if needed.
 * Resumes the context automatically if it is in the 'suspended' state.
 */
function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/**
 * Inject an existing AudioContext (e.g. the one created by useAudioInput)
 * to avoid instantiating a second context. Must be called before the first
 * play* invocation to take effect.
 */
export function setSharedAudioContext(audioContext: AudioContext): void {
  if (!ctx || ctx.state === 'closed') {
    ctx = audioContext
  }
}

// --- Internal helper ---

interface ToneParams {
  type: OscillatorType
  frequency: number
  gainPeak: number
  /** Duration of linear ramp from 0 to gainPeak (seconds) */
  attackTime: number
  /** Duration of exponential decay from gainPeak to near-zero (seconds) */
  decayTime: number
  /** Schedule offset from context.currentTime (seconds, default 0) */
  startOffset?: number
}

function playTone({
  type,
  frequency,
  gainPeak,
  attackTime,
  decayTime,
  startOffset = 0,
}: ToneParams): void {
  const context = getContext()
  const t = context.currentTime + startOffset

  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, t)

  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(gainPeak, t + attackTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attackTime + decayTime)

  osc.connect(gain)
  gain.connect(context.destination)

  osc.start(t)
  // Extra 0.01s buffer so the node is not stopped before the envelope finishes
  osc.stop(t + attackTime + decayTime + 0.01)
}

// --- Sound events ---

/**
 * Pleasant two-tone chime — played when the user hits the correct note.
 */
export function playCorrect(): void {
  // C6 + E6 — bright, rewarding chime
  playTone({ type: 'sine', frequency: 1046.5, gainPeak: 0.3, attackTime: 0.005, decayTime: 0.4 })
  playTone({ type: 'sine', frequency: 1318.5, gainPeak: 0.2, attackTime: 0.005, decayTime: 0.35, startOffset: 0.03 })
}

/**
 * Dissonant downward buzz — played when the user plays a wrong note.
 */
export function playWrong(): void {
  const context = getContext()
  const t = context.currentTime

  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(120, t)
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.2)

  gain.gain.setValueAtTime(0.4, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)

  osc.connect(gain)
  gain.connect(context.destination)

  osc.start(t)
  osc.stop(t + 0.3)
}

/**
 * Short downward sweep — played when an enemy is defeated.
 */
export function playEnemyDeath(): void {
  const context = getContext()
  const t = context.currentTime

  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.type = 'square'
  osc.frequency.setValueAtTime(400, t)
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.15)

  gain.gain.setValueAtTime(0.25, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)

  osc.connect(gain)
  gain.connect(context.destination)

  osc.start(t)
  osc.stop(t + 0.25)
}

/**
 * Rising three-note arpeggio — played at the start of a new wave.
 */
export function playWaveStart(): void {
  // C4 → E4 → G4
  const notes = [261.63, 329.63, 392.0]
  notes.forEach((frequency, i) => {
    playTone({
      type: 'triangle',
      frequency,
      gainPeak: 0.25,
      attackTime: 0.02,
      decayTime: 0.18,
      startOffset: i * 0.1,
    })
  })
}

/**
 * Ascending four-note fanfare — played when all enemies in a wave are cleared.
 */
export function playWaveEnd(): void {
  // G4 → C5 → E5 → G5
  const notes = [392.0, 523.25, 659.25, 783.99]
  notes.forEach((frequency, i) => {
    playTone({
      type: 'sine',
      frequency,
      gainPeak: 0.3,
      attackTime: 0.02,
      decayTime: 0.4,
      startOffset: i * 0.08,
    })
  })
}

/**
 * Dramatic descending minor arpeggio with low rumble — played on game over.
 */
export function playGameOver(): void {
  // C4 → A3 → F3 → C3 descending
  const notes = [261.63, 220.0, 174.61, 130.81]
  notes.forEach((frequency, i) => {
    playTone({
      type: 'triangle',
      frequency,
      gainPeak: 0.3,
      attackTime: 0.03,
      decayTime: 0.5,
      startOffset: i * 0.18,
    })
  })

  // Low rumble underneath the descending melody
  const context = getContext()
  const t = context.currentTime

  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(65, t + 0.1)
  osc.frequency.exponentialRampToValueAtTime(40, t + 1.0)

  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.15, t + 0.2)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)

  osc.connect(gain)
  gain.connect(context.destination)

  osc.start(t + 0.1)
  osc.stop(t + 1.3)
}
