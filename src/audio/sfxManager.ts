/**
 * SFX Manager — synthesizes game sound effects using Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (satisfies browser user-gesture requirement). All sounds are synthesized
 * with OscillatorNode + GainNode envelopes — no audio files needed.
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

/** Schedule an oscillator with an amplitude envelope. */
function playTone(
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gain: number,
  ac: AudioContext,
): void {
  const osc = ac.createOscillator()
  const vol = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)

  vol.gain.setValueAtTime(0, startTime)
  vol.gain.linearRampToValueAtTime(gain, startTime + 0.01)
  vol.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(vol)
  vol.connect(ac.destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Correct note — bright two-note chime (C6 + E6). */
export function playCorrect(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(1047, 'sine', t, 0.15, 0.25, ac)       // C6
  playTone(1319, 'sine', t + 0.08, 0.15, 0.25, ac) // E6
}

/** Wrong note — short dissonant buzz. */
export function playWrong(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(110, 'sawtooth', t, 0.2, 0.2, ac)  // A2 sawtooth
  playTone(116, 'sawtooth', t, 0.2, 0.2, ac)  // Slightly detuned — beat frequency creates buzz
}

/** Enemy death — quick descending blip. */
export function playEnemyDeath(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime

  const osc = ac.createOscillator()
  const vol = ac.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(800, t)
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.15)
  vol.gain.setValueAtTime(0.2, t)
  vol.gain.linearRampToValueAtTime(0, t + 0.2)
  osc.connect(vol)
  vol.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.2)
}

/** Wave start — ascending three-note arpeggio (C5 E5 G5). */
export function playWaveStart(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(523, 'sine', t, 0.12, 0.2, ac)         // C5
  playTone(659, 'sine', t + 0.1, 0.12, 0.2, ac)   // E5
  playTone(784, 'sine', t + 0.2, 0.15, 0.25, ac)  // G5
}

/** Wave end — triumphant chord resolved with a high note. */
export function playWaveEnd(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(523, 'sine', t, 0.3, 0.15, ac)         // C5
  playTone(659, 'sine', t, 0.3, 0.15, ac)         // E5
  playTone(784, 'sine', t, 0.3, 0.15, ac)         // G5
  playTone(1047, 'sine', t + 0.15, 0.25, 0.2, ac) // C6 resolve
}

/** Game over — slow descending minor tones. */
export function playGameOver(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(440, 'triangle', t, 0.3, 0.2, ac)         // A4
  playTone(349, 'triangle', t + 0.25, 0.3, 0.2, ac)  // F4
  playTone(294, 'triangle', t + 0.5, 0.3, 0.2, ac)   // D4
  playTone(262, 'triangle', t + 0.75, 0.5, 0.2, ac)  // C4 — hold longer
}

/** Mute/unmute SFX independently from mic input. */
export function setSfxMuted(value: boolean): void {
  muted = value
}

/** Returns current mute state. */
export function isSfxMuted(): boolean {
  return muted
}
