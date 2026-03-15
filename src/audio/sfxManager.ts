/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (satisfies browser user-gesture requirement). All sounds are synthesized
 * with OscillatorNode + GainNode envelopes — no external audio files.
 */

let ctx: AudioContext | null = null
let muted = false

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  // Resume if suspended (browsers suspend until user gesture)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/**
 * Schedule an oscillator with an envelope.
 * Utility used by all play functions below.
 */
function playTone(
  frequency: number,
  type: OscillatorType,
  attack: number,
  sustain: number,
  release: number,
  volume: number,
  detune = 0,
): void {
  const ac = getContext()
  const now = ac.currentTime

  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  osc.detune.value = detune

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + attack)
  gain.gain.setValueAtTime(volume, now + attack + sustain)
  gain.gain.linearRampToValueAtTime(0, now + attack + sustain + release)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start(now)
  osc.stop(now + attack + sustain + release + 0.01)
}

/** Correct note — bright ascending chime (two harmonics) */
export function playCorrect(): void {
  if (muted) return
  playTone(880, 'sine', 0.01, 0.08, 0.15, 0.25)
  playTone(1320, 'sine', 0.03, 0.06, 0.12, 0.15)
}

/** Wrong note — short dissonant buzz */
export function playWrong(): void {
  if (muted) return
  playTone(150, 'sawtooth', 0.01, 0.12, 0.08, 0.2)
  playTone(157, 'sawtooth', 0.01, 0.12, 0.08, 0.15)
}

/** Enemy death — descending tone pop */
export function playEnemyDeath(): void {
  if (muted) return
  const ac = getContext()
  const now = ac.currentTime

  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.2)

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.25)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.26)
}

/** Wave start — ascending arpeggio (3 quick notes) */
export function playWaveStart(): void {
  if (muted) return
  const ac = getContext()
  const now = ac.currentTime
  const notes = [523.25, 659.25, 783.99] // C5, E5, G5

  notes.forEach((freq, i) => {
    const offset = i * 0.1
    const osc = ac.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.02)
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.15)

    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.16)
  })
}

/** Wave end — two-note success fanfare */
export function playWaveEnd(): void {
  if (muted) return
  playTone(523.25, 'triangle', 0.02, 0.1, 0.15, 0.2) // C5
  const ac = getContext()
  const now = ac.currentTime

  const osc = ac.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 783.99 // G5

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0, now + 0.15)
  gain.gain.linearRampToValueAtTime(0.25, now + 0.17)
  gain.gain.setValueAtTime(0.25, now + 0.3)
  gain.gain.linearRampToValueAtTime(0, now + 0.55)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(now + 0.15)
  osc.stop(now + 0.56)
}

/** Game over — descending minor arpeggio */
export function playGameOver(): void {
  if (muted) return
  const ac = getContext()
  const now = ac.currentTime
  const notes = [493.88, 440, 369.99, 329.63] // B4, A4, F#4, E4

  notes.forEach((freq, i) => {
    const offset = i * 0.18
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.02)
    gain.gain.setValueAtTime(0.2, now + offset + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.25)

    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.26)
  })
}

/** Set mute state for all SFX (independent of mic input) */
export function setSfxMuted(value: boolean): void {
  muted = value
}

/** Get current mute state */
export function isSfxMuted(): boolean {
  return muted
}
