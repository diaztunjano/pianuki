/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton module that lazily creates an AudioContext on first play call
 * (respects the browser's user-gesture requirement). All sounds are
 * synthesized with OscillatorNode + GainNode envelopes — no audio files.
 */

let ctx: AudioContext | null = null

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator that plays a tone with an ADSR-ish envelope. */
function playTone(
  ac: AudioContext,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  volume = 0.3,
): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)

  // Quick attack, sustain, then release over last 30% of duration
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01)
  const releaseStart = startTime + duration * 0.7
  gain.gain.setValueAtTime(volume, releaseStart)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

/** Play a quick noise burst (used for buzz / death effects). */
function playNoiseBurst(
  ac: AudioContext,
  startTime: number,
  duration: number,
  volume = 0.25,
): void {
  const bufferSize = Math.ceil(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume
  }

  const source = ac.createBufferSource()
  source.buffer = buffer

  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  source.connect(gain)
  gain.connect(ac.destination)

  source.start(startTime)
  source.stop(startTime + duration)
}

// ---------------------------------------------------------------------------
// Public API — one function per game sound event
// ---------------------------------------------------------------------------

/** Bright ascending chime — correct note hit. */
export function playCorrect(): void {
  const ac = getContext()
  const t = ac.currentTime
  // Two-note ascending arpeggio (C6 → E6)
  playTone(ac, 1047, 'sine', t, 0.12, 0.25)
  playTone(ac, 1319, 'sine', t + 0.08, 0.15, 0.2)
}

/** Low distorted buzz — wrong note. */
export function playWrong(): void {
  const ac = getContext()
  const t = ac.currentTime
  // Dissonant square wave + noise
  playTone(ac, 110, 'square', t, 0.18, 0.15)
  playTone(ac, 117, 'sawtooth', t, 0.18, 0.1)
  playNoiseBurst(ac, t, 0.12, 0.1)
}

/** Quick descending pop — enemy defeated. */
export function playEnemyDeath(): void {
  const ac = getContext()
  const t = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  // Descending pitch sweep
  osc.frequency.setValueAtTime(800, t)
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.2)

  gain.gain.setValueAtTime(0.25, t)
  gain.gain.linearRampToValueAtTime(0, t + 0.25)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.25)
}

/** Rising three-note fanfare — wave starting. */
export function playWaveStart(): void {
  const ac = getContext()
  const t = ac.currentTime
  // C5 → E5 → G5 quick arpeggio
  playTone(ac, 523, 'triangle', t, 0.12, 0.2)
  playTone(ac, 659, 'triangle', t + 0.1, 0.12, 0.2)
  playTone(ac, 784, 'triangle', t + 0.2, 0.2, 0.25)
}

/** Descending resolution — wave cleared. */
export function playWaveEnd(): void {
  const ac = getContext()
  const t = ac.currentTime
  // G5 → E5 → C5 → C6 (triumphant resolution)
  playTone(ac, 784, 'sine', t, 0.12, 0.2)
  playTone(ac, 659, 'sine', t + 0.1, 0.12, 0.2)
  playTone(ac, 523, 'sine', t + 0.2, 0.12, 0.2)
  playTone(ac, 1047, 'sine', t + 0.3, 0.35, 0.25)
}

/** Dramatic low drone + dissonance — game over. */
export function playGameOver(): void {
  const ac = getContext()
  const t = ac.currentTime
  // Low drone
  playTone(ac, 80, 'sawtooth', t, 1.0, 0.15)
  playTone(ac, 85, 'sawtooth', t, 1.0, 0.1)
  // Descending tone
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, t)
  osc.frequency.exponentialRampToValueAtTime(60, t + 1.2)
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.linearRampToValueAtTime(0, t + 1.2)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 1.2)
  // Noise burst for impact
  playNoiseBurst(ac, t + 0.05, 0.4, 0.12)
}
