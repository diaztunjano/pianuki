/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (respects browser user-gesture requirement). All sounds are generated
 * with OscillatorNode + GainNode envelopes — no external audio files.
 */

let ctx: AudioContext | null = null
let muted = false
let masterVolume = 0.5

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator with an ADSR-ish gain envelope. */
function playTone(
  frequency: number,
  type: OscillatorType,
  attack: number,
  sustain: number,
  release: number,
  volume = 0.3,
): void {
  const ac = getContext()
  const now = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)

  const v = volume * masterVolume
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(v, now + attack)
  gain.gain.setValueAtTime(v, now + attack)
  gain.gain.linearRampToValueAtTime(v * 0.6, now + attack + sustain)
  gain.gain.linearRampToValueAtTime(0, now + attack + sustain + release)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start(now)
  osc.stop(now + attack + sustain + release + 0.01)
}

/** Play a short noise burst (used for buzz / explosion textures). */
function playNoise(duration: number, volume = 0.15): void {
  const ac = getContext()
  const now = ac.currentTime
  const sampleRate = ac.sampleRate
  const length = Math.floor(sampleRate * duration)

  const buffer = ac.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1)
  }

  const source = ac.createBufferSource()
  source.buffer = buffer

  const gain = ac.createGain()
  const v = volume * masterVolume
  gain.gain.setValueAtTime(v, now)
  gain.gain.linearRampToValueAtTime(0, now + duration)

  source.connect(gain)
  gain.connect(ac.destination)
  source.start(now)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Bright ascending chime — correct note played. */
export function playCorrect(): void {
  if (muted) return
  // Two-note ascending arpeggio (C6 → E6)
  playTone(1047, 'sine', 0.01, 0.06, 0.12, 0.25)
  setTimeout(() => {
    if (muted) return
    playTone(1319, 'sine', 0.01, 0.06, 0.15, 0.2)
  }, 60)
}

/** Low distorted buzz — wrong note played. */
export function playWrong(): void {
  if (muted) return
  playTone(110, 'sawtooth', 0.005, 0.08, 0.1, 0.2)
  playNoise(0.12, 0.1)
}

/** Quick descending pop — enemy defeated. */
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
  gain.connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.21)

  playNoise(0.08, 0.08)
}

/** Rising fanfare — wave starting. */
export function playWaveStart(): void {
  if (muted) return
  // Three ascending tones: C5 → E5 → G5
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    setTimeout(() => {
      if (muted) return
      playTone(freq, 'triangle', 0.01, 0.08, 0.1, 0.2)
    }, i * 100)
  })
}

/** Resolved chord — wave cleared. */
export function playWaveEnd(): void {
  if (muted) return
  // Major chord played together: C5 + E5 + G5
  playTone(523, 'sine', 0.01, 0.15, 0.3, 0.15)
  playTone(659, 'sine', 0.01, 0.15, 0.3, 0.12)
  playTone(784, 'sine', 0.01, 0.15, 0.3, 0.12)
}

/** Dramatic descending tones — game over. */
export function playGameOver(): void {
  if (muted) return
  // Descending minor arpeggio: E5 → C5 → A4 → low rumble
  const notes: [number, OscillatorType][] = [
    [659, 'triangle'],
    [523, 'triangle'],
    [440, 'triangle'],
    [220, 'sawtooth'],
  ]
  notes.forEach(([freq, type], i) => {
    setTimeout(() => {
      if (muted) return
      playTone(freq, type, 0.02, 0.12, 0.2 + i * 0.05, 0.2)
    }, i * 180)
  })
  // Final noise rumble
  setTimeout(() => {
    if (muted) return
    playNoise(0.4, 0.12)
  }, notes.length * 180)
}

// ---------------------------------------------------------------------------
// Mute control
// ---------------------------------------------------------------------------

export function setSfxMuted(value: boolean): void {
  muted = value
}

export function isSfxMuted(): boolean {
  return muted
}

export function setSfxMasterVolume(value: number): void {
  masterVolume = Math.max(0, Math.min(1, value))
}

export function getSfxMasterVolume(): number {
  return masterVolume
}
