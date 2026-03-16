// Singleton SFX manager — synthesizes all game sounds via Web Audio API.
// No external audio files required. AudioContext is created lazily on first
// play call to respect the browser's user-gesture requirement.

let ctx: AudioContext | null = null

function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  // Resume if suspended (e.g. after browser auto-suspend policy)
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator → gain envelope and auto-disconnect after release. */
function playTone(
  frequency: number,
  type: OscillatorType,
  attackMs: number,
  sustainMs: number,
  releaseMs: number,
  volume: number,
): void {
  const ac = getContext()
  const now = ac.currentTime
  const attack = attackMs / 1000
  const sustain = sustainMs / 1000
  const release = releaseMs / 1000

  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = frequency

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

/** Play multiple tones sequentially with a delay between each. */
function playSequence(
  notes: { freq: number; type: OscillatorType; dur: number; vol: number }[],
  delayMs: number,
): void {
  const ac = getContext()
  const baseTime = ac.currentTime

  notes.forEach((n, i) => {
    const offset = (i * delayMs) / 1000
    const attack = 0.01
    const sustain = n.dur / 1000
    const release = 0.08

    const osc = ac.createOscillator()
    osc.type = n.type
    osc.frequency.value = n.freq

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, baseTime + offset)
    gain.gain.linearRampToValueAtTime(n.vol, baseTime + offset + attack)
    gain.gain.setValueAtTime(n.vol, baseTime + offset + attack + sustain)
    gain.gain.linearRampToValueAtTime(0, baseTime + offset + attack + sustain + release)

    osc.connect(gain)
    gain.connect(ac.destination)

    osc.start(baseTime + offset)
    osc.stop(baseTime + offset + attack + sustain + release + 0.01)
  })
}

// ---------------------------------------------------------------------------
// Public API — one function per sound event
// ---------------------------------------------------------------------------

/** Correct note hit — bright ascending chime (C6 → E6). */
export function playCorrect(): void {
  playSequence(
    [
      { freq: 1047, type: 'sine', dur: 80, vol: 0.25 },  // C6
      { freq: 1319, type: 'sine', dur: 120, vol: 0.2 },  // E6
    ],
    70,
  )
}

/** Wrong note — short dissonant buzz. */
export function playWrong(): void {
  const ac = getContext()
  const now = ac.currentTime

  // Two detuned square waves for a harsh buzz
  for (const freq of [150, 157]) {
    const osc = ac.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01)
    gain.gain.setValueAtTime(0.15, now + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + 0.2)

    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.21)
  }
}

/** Enemy defeated — quick descending pop (G5 → C5). */
export function playEnemyDeath(): void {
  playSequence(
    [
      { freq: 784, type: 'triangle', dur: 60, vol: 0.2 },  // G5
      { freq: 523, type: 'triangle', dur: 100, vol: 0.15 }, // C5
    ],
    50,
  )
}

/** Wave start — rising fanfare (C5 → E5 → G5). */
export function playWaveStart(): void {
  playSequence(
    [
      { freq: 523, type: 'sine', dur: 100, vol: 0.2 },  // C5
      { freq: 659, type: 'sine', dur: 100, vol: 0.2 },  // E5
      { freq: 784, type: 'sine', dur: 150, vol: 0.25 }, // G5
    ],
    120,
  )
}

/** Wave end / clear — triumphant arpeggio (G5 → B5 → D6 → G6). */
export function playWaveEnd(): void {
  playSequence(
    [
      { freq: 784, type: 'sine', dur: 100, vol: 0.2 },   // G5
      { freq: 988, type: 'sine', dur: 100, vol: 0.2 },   // B5
      { freq: 1175, type: 'sine', dur: 100, vol: 0.2 },  // D6
      { freq: 1568, type: 'sine', dur: 200, vol: 0.25 }, // G6
    ],
    100,
  )
}

/** Game over — descending minor tones (E4 → C4 → A3) with longer decay. */
export function playGameOver(): void {
  playSequence(
    [
      { freq: 330, type: 'sawtooth', dur: 200, vol: 0.15 },  // E4
      { freq: 262, type: 'sawtooth', dur: 200, vol: 0.15 },  // C4
      { freq: 220, type: 'sawtooth', dur: 400, vol: 0.12 },  // A3
    ],
    250,
  )
}
