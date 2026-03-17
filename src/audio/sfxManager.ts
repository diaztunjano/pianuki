/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * AudioContext is created lazily on the first play call so browser
 * user-gesture requirements are satisfied automatically.
 *
 * All sounds are synthesized with OscillatorNode + GainNode envelopes;
 * no external audio files are needed.
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  // Resume if suspended (e.g. after tab backgrounding)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

// --- Helpers ---

/** Schedule an oscillator that plays for a given duration with an ADSR-ish envelope. */
function tone(
  ac: AudioContext,
  frequency: number,
  type: OscillatorType,
  duration: number,
  volume: number,
  attackTime = 0.01,
  releaseTime = 0.08,
): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.value = frequency

  const now = ac.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + attackTime)
  gain.gain.setValueAtTime(volume, now + duration - releaseTime)
  gain.gain.linearRampToValueAtTime(0, now + duration)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start(now)
  osc.stop(now + duration)
}

// --- Public API ---

/** Correct note hit — bright ascending two-tone chime. */
export function playCorrect(): void {
  const ac = getContext()
  tone(ac, 880, 'sine', 0.12, 0.25, 0.005, 0.04)
  tone(ac, 1320, 'sine', 0.15, 0.2, 0.06, 0.06)
}

/** Wrong note — low dissonant buzz. */
export function playWrong(): void {
  const ac = getContext()
  tone(ac, 150, 'sawtooth', 0.2, 0.2, 0.005, 0.08)
  tone(ac, 155, 'square', 0.18, 0.1, 0.005, 0.06)
}

/** Enemy defeated — quick descending pop. */
export function playEnemyDeath(): void {
  const ac = getContext()
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = 'sine'
  const now = ac.currentTime
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15)

  gain.gain.setValueAtTime(0.3, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.18)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

/** Wave start — rising sweep with a bright attack. */
export function playWaveStart(): void {
  const ac = getContext()
  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = 'triangle'
  const now = ac.currentTime
  osc.frequency.setValueAtTime(330, now)
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.25)

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.25, now + 0.04)
  gain.gain.setValueAtTime(0.25, now + 0.18)
  gain.gain.linearRampToValueAtTime(0, now + 0.3)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.32)
}

/** Wave end / clear — triumphant three-note arpeggio (C5-E5-G5). */
export function playWaveEnd(): void {
  const ac = getContext()
  // C5, E5, G5
  const notes = [523.25, 659.25, 783.99]
  notes.forEach((freq, i) => {
    const delay = i * 0.08
    const osc = ac.createOscillator()
    const gain = ac.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    const start = ac.currentTime + delay
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
    gain.gain.setValueAtTime(0.2, start + 0.12)
    gain.gain.linearRampToValueAtTime(0, start + 0.2)

    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.22)
  })
}

/** Game over — low descending tone with rumble. */
export function playGameOver(): void {
  const ac = getContext()
  const now = ac.currentTime

  // Main descending tone
  const osc1 = ac.createOscillator()
  const gain1 = ac.createGain()
  osc1.type = 'sawtooth'
  osc1.frequency.setValueAtTime(440, now)
  osc1.frequency.exponentialRampToValueAtTime(80, now + 0.6)
  gain1.gain.setValueAtTime(0.25, now)
  gain1.gain.linearRampToValueAtTime(0, now + 0.7)
  osc1.connect(gain1)
  gain1.connect(ac.destination)
  osc1.start(now)
  osc1.stop(now + 0.75)

  // Sub-bass rumble
  const osc2 = ac.createOscillator()
  const gain2 = ac.createGain()
  osc2.type = 'sine'
  osc2.frequency.value = 55
  gain2.gain.setValueAtTime(0.15, now)
  gain2.gain.linearRampToValueAtTime(0, now + 0.8)
  osc2.connect(gain2)
  gain2.connect(ac.destination)
  osc2.start(now)
  osc2.stop(now + 0.85)
}
