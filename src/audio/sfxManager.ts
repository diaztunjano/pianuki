/**
 * SFX Manager — singleton that synthesizes game sound effects via Web Audio API.
 *
 * AudioContext is created lazily on the first play call to satisfy the browser
 * user-gesture requirement. An existing AudioContext (e.g. from mic input) can
 * be injected via setContext() to avoid creating a second audio graph.
 *
 * All sounds are synthesised entirely with OscillatorNode + GainNode — no
 * external audio file dependencies.
 */

let ctx: AudioContext | null = null
let muted = false

function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  // Resume if suspended (can happen after a period of inactivity)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/**
 * Inject an existing AudioContext so SFX share the same audio graph as mic
 * input. Call this from useAudioInput after the context is created.
 */
export function setContext(externalCtx: AudioContext): void {
  ctx = externalCtx
}

/** Mute / unmute all SFX without destroying the AudioContext. */
export function setSfxMuted(value: boolean): void {
  muted = value
}

export function isSfxMuted(): boolean {
  return muted
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Schedule a single oscillator burst and release it cleanly. */
function playTone(
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  peakGain: number,
  attackTime = 0.005,
  releaseTime = 0.05,
): void {
  const ac = getContext()

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime)
  gain.gain.setValueAtTime(peakGain, startTime + duration - releaseTime)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

/** Schedule a frequency glide (portamento) tone. */
function playGlide(
  freqStart: number,
  freqEnd: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  peakGain: number,
): void {
  const ac = getContext()

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freqStart, startTime)
  osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005)
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
 * Correct note hit — bright ascending chime (two short sine tones).
 */
export function playCorrect(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(880, 'sine', t, 0.12, 0.4, 0.005, 0.06)
  playTone(1320, 'sine', t + 0.07, 0.12, 0.3, 0.005, 0.06)
}

/**
 * Wrong note — harsh short buzz (sawtooth, slightly detuned).
 */
export function playWrong(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(180, 'sawtooth', t, 0.18, 0.25, 0.003, 0.12)
  playTone(185, 'square', t, 0.18, 0.1, 0.003, 0.12)
}

/**
 * Enemy defeated — short descending glide (sine).
 */
export function playEnemyDeath(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playGlide(600, 200, 'sine', t, 0.2, 0.35)
}

/**
 * Wave start — ascending three-note fanfare.
 */
export function playWaveStart(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(523.25, 'sine', t, 0.1, 0.35)        // C5
  playTone(659.25, 'sine', t + 0.1, 0.1, 0.35)  // E5
  playTone(783.99, 'sine', t + 0.2, 0.18, 0.4)  // G5
}

/**
 * Wave cleared — triumphant upward glide followed by a chord shimmer.
 */
export function playWaveEnd(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(523.25, 'sine', t, 0.15, 0.3)         // C5
  playTone(659.25, 'sine', t + 0.05, 0.15, 0.3)  // E5
  playTone(783.99, 'sine', t + 0.1, 0.15, 0.3)   // G5
  playTone(1046.5, 'sine', t + 0.15, 0.3, 0.35)  // C6 — held
}

/**
 * Game over — slow descending tones, ominous.
 */
export function playGameOver(): void {
  if (muted) return
  const ac = getContext()
  const t = ac.currentTime
  playTone(220, 'sawtooth', t, 0.35, 0.3, 0.01, 0.2)
  playTone(196, 'sawtooth', t + 0.3, 0.35, 0.3, 0.01, 0.2)
  playTone(174.61, 'sawtooth', t + 0.6, 0.5, 0.35, 0.01, 0.3)
}
