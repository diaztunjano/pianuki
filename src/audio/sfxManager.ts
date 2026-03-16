/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton module that lazily creates an AudioContext on first play call
 * (respects browser user-gesture requirement). All sounds are synthesized
 * with OscillatorNode + GainNode envelopes — no external audio files needed.
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

// --- Helpers ---

function createOsc(
  ac: AudioContext,
  type: OscillatorType,
  frequency: number,
): { osc: OscillatorNode; gain: GainNode } {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = frequency

  const gain = ac.createGain()
  gain.gain.value = 0
  osc.connect(gain)
  gain.connect(ac.destination)

  return { osc, gain }
}

// --- Sound Definitions ---

/** Pleasant two-tone chime for correct note */
export function playCorrect(): void {
  const ac = getContext()
  const now = ac.currentTime

  // First tone — C6 (1046 Hz)
  const { osc: o1, gain: g1 } = createOsc(ac, 'sine', 1046.5)
  g1.gain.setValueAtTime(0, now)
  g1.gain.linearRampToValueAtTime(0.3, now + 0.02)
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  o1.start(now)
  o1.stop(now + 0.25)

  // Second tone — E6 (1318 Hz), slightly delayed
  const { osc: o2, gain: g2 } = createOsc(ac, 'sine', 1318.5)
  g2.gain.setValueAtTime(0, now + 0.08)
  g2.gain.linearRampToValueAtTime(0.25, now + 0.1)
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  o2.start(now + 0.08)
  o2.stop(now + 0.35)
}

/** Harsh buzz for wrong note */
export function playWrong(): void {
  const ac = getContext()
  const now = ac.currentTime

  const { osc, gain } = createOsc(ac, 'sawtooth', 110)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.2, now + 0.01)
  gain.gain.linearRampToValueAtTime(0.2, now + 0.12)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.start(now)
  osc.stop(now + 0.2)
}

/** Quick descending pop for enemy death */
export function playEnemyDeath(): void {
  const ac = getContext()
  const now = ac.currentTime

  const { osc, gain } = createOsc(ac, 'sine', 800)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.25, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.start(now)
  osc.stop(now + 0.2)
}

/** Ascending three-note fanfare for wave start */
export function playWaveStart(): void {
  const ac = getContext()
  const now = ac.currentTime

  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  notes.forEach((freq, i) => {
    const offset = i * 0.1
    const { osc, gain } = createOsc(ac, 'triangle', freq)
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.2, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25)
    osc.start(now + offset)
    osc.stop(now + offset + 0.25)
  })
}

/** Resolving chord for wave end */
export function playWaveEnd(): void {
  const ac = getContext()
  const now = ac.currentTime

  // C major chord: C5, E5, G5 played simultaneously with longer sustain
  const freqs = [523.25, 659.25, 783.99]
  freqs.forEach((freq) => {
    const { osc, gain } = createOsc(ac, 'sine', freq)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.03)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc.start(now)
    osc.stop(now + 0.6)
  })
}

/** Ominous descending tone for game over */
export function playGameOver(): void {
  const ac = getContext()
  const now = ac.currentTime

  // Low descending tone
  const { osc: o1, gain: g1 } = createOsc(ac, 'sawtooth', 220)
  o1.frequency.exponentialRampToValueAtTime(55, now + 0.8)
  g1.gain.setValueAtTime(0, now)
  g1.gain.linearRampToValueAtTime(0.15, now + 0.03)
  g1.gain.linearRampToValueAtTime(0.12, now + 0.5)
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
  o1.start(now)
  o1.stop(now + 0.9)

  // Dissonant minor second layer
  const { osc: o2, gain: g2 } = createOsc(ac, 'sine', 233.08)
  o2.frequency.exponentialRampToValueAtTime(58.27, now + 0.8)
  g2.gain.setValueAtTime(0, now)
  g2.gain.linearRampToValueAtTime(0.1, now + 0.03)
  g2.gain.linearRampToValueAtTime(0.08, now + 0.5)
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
  o2.start(now)
  o2.stop(now + 0.9)
}
