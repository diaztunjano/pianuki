/**
 * SFX Manager — synthesized sound effects via Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on the first play call
 * (satisfies the browser user-gesture requirement). All sounds are
 * synthesized with OscillatorNode + GainNode envelopes — no external
 * audio files needed.
 *
 * Exposed play functions:
 *   playCorrect()    — bright chime for hitting the right note
 *   playWrong()      — harsh buzz for a wrong note
 *   playEnemyDeath() — quick descending blip
 *   playWaveStart()  — ascending two-tone fanfare
 *   playWaveEnd()    — triumphant three-tone arpeggio
 *   playGameOver()   — low descending tones
 */

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false
let masterVolume = 0.5

function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
    masterGain = null // invalidate cached gain for old context
  }
  // Resume if suspended (e.g. after tab backgrounding)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

function getMasterGain(ac: AudioContext): GainNode {
  if (!masterGain || masterGain.context !== ac) {
    masterGain = ac.createGain()
    masterGain.gain.value = muted ? 0 : masterVolume
    masterGain.connect(ac.destination)
  }
  return masterGain
}

// ---------------------------------------------------------------------------
// Mute / volume control
// ---------------------------------------------------------------------------

export function setMuted(value: boolean): void {
  muted = value
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : masterVolume
  }
}

export function isMuted(): boolean {
  return muted
}

export function setVolume(value: number): void {
  masterVolume = Math.max(0, Math.min(1, value))
  if (masterGain && !muted) {
    masterGain.gain.value = masterVolume
  }
}

export function getVolume(): number {
  return masterVolume
}

// ---------------------------------------------------------------------------
// Helper: schedule an oscillator with a gain envelope
// ---------------------------------------------------------------------------

interface ToneParams {
  frequency: number
  type?: OscillatorType
  /** Seconds from `when` to full volume */
  attack?: number
  /** Seconds at full volume after attack */
  sustain?: number
  /** Seconds to fade to zero after sustain */
  decay?: number
  /** Peak gain (0-1) */
  gain?: number
  /** Start time relative to ctx.currentTime */
  when?: number
}

function playTone(ac: AudioContext, params: ToneParams): void {
  const {
    frequency,
    type = 'sine',
    attack = 0.01,
    sustain = 0.08,
    decay = 0.15,
    gain: peakGain = 0.3,
    when = 0,
  } = params

  const now = ac.currentTime + when
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peakGain, now + attack)
  gain.gain.setValueAtTime(peakGain, now + attack + sustain)
  gain.gain.linearRampToValueAtTime(0, now + attack + sustain + decay)

  osc.connect(gain)
  gain.connect(getMasterGain(ac))

  osc.start(now)
  osc.stop(now + attack + sustain + decay + 0.01)
}

// ---------------------------------------------------------------------------
// Public play functions
// ---------------------------------------------------------------------------

/** Bright two-note chime — correct note hit */
export function playCorrect(): void {
  if (muted) return
  const ac = getContext()
  playTone(ac, { frequency: 880, type: 'sine', attack: 0.01, sustain: 0.06, decay: 0.2, gain: 0.25 })
  playTone(ac, { frequency: 1320, type: 'sine', attack: 0.01, sustain: 0.06, decay: 0.25, gain: 0.2, when: 0.07 })
}

/** Harsh buzz — wrong note */
export function playWrong(): void {
  if (muted) return
  const ac = getContext()
  playTone(ac, { frequency: 110, type: 'sawtooth', attack: 0.01, sustain: 0.12, decay: 0.1, gain: 0.2 })
  playTone(ac, { frequency: 117, type: 'square', attack: 0.01, sustain: 0.12, decay: 0.1, gain: 0.12 })
}

/** Quick descending blip — enemy defeated */
export function playEnemyDeath(): void {
  if (muted) return
  const ac = getContext()
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = 'square'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15)

  gain.gain.setValueAtTime(0.2, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.2)

  osc.connect(gain)
  gain.connect(getMasterGain(ac))
  osc.start(now)
  osc.stop(now + 0.21)
}

/** Ascending two-tone fanfare — wave starts */
export function playWaveStart(): void {
  if (muted) return
  const ac = getContext()
  playTone(ac, { frequency: 440, type: 'triangle', attack: 0.01, sustain: 0.1, decay: 0.15, gain: 0.25 })
  playTone(ac, { frequency: 660, type: 'triangle', attack: 0.01, sustain: 0.1, decay: 0.2, gain: 0.25, when: 0.15 })
}

/** Triumphant three-note arpeggio — wave cleared */
export function playWaveEnd(): void {
  if (muted) return
  const ac = getContext()
  playTone(ac, { frequency: 523, type: 'sine', attack: 0.01, sustain: 0.08, decay: 0.15, gain: 0.25 })
  playTone(ac, { frequency: 659, type: 'sine', attack: 0.01, sustain: 0.08, decay: 0.15, gain: 0.25, when: 0.12 })
  playTone(ac, { frequency: 784, type: 'sine', attack: 0.01, sustain: 0.12, decay: 0.3, gain: 0.3, when: 0.24 })
}

/** Low descending tones — game over */
export function playGameOver(): void {
  if (muted) return
  const ac = getContext()
  playTone(ac, { frequency: 330, type: 'sawtooth', attack: 0.01, sustain: 0.2, decay: 0.3, gain: 0.2 })
  playTone(ac, { frequency: 247, type: 'sawtooth', attack: 0.01, sustain: 0.2, decay: 0.3, gain: 0.2, when: 0.3 })
  playTone(ac, { frequency: 165, type: 'sawtooth', attack: 0.01, sustain: 0.3, decay: 0.5, gain: 0.2, when: 0.6 })
}
