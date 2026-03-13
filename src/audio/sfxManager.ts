/**
 * Sound Effects Manager
 *
 * Singleton that provides synthesized sound effects using Web Audio API.
 * All sounds are procedurally generated using OscillatorNode + GainNode
 * envelopes - no external audio files required.
 *
 * Key behaviors:
 * - Lazy AudioContext creation (respects user gesture requirement)
 * - Can reuse existing AudioContext from mic input if available
 * - All methods are fire-and-forget (no cleanup required by caller)
 * - Respects sfxEnabled and sfxVolume settings from store
 */

// --- Types ---

type SoundEffect =
  | 'correct'
  | 'wrong'
  | 'enemyDeath'
  | 'waveStart'
  | 'waveEnd'
  | 'gameOver'

interface SfxSettings {
  enabled: boolean
  volume: number  // 0..1
}

// --- Singleton State ---

let audioContext: AudioContext | null = null
let getSettings: (() => SfxSettings) | null = null

// --- AudioContext Management ---

/**
 * Gets or creates the shared AudioContext.
 * Lazy creation respects browser autoplay policy (user gesture requirement).
 * Can be called with an existing context from mic input to reuse it.
 */
function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * Optional: allow external code (e.g., useAudioInput) to provide
 * an already-created AudioContext to reuse.
 */
export function setSharedAudioContext(ctx: AudioContext): void {
  audioContext = ctx
}

/**
 * Sets the settings getter function that will be called before playing
 * each sound effect to check if SFX are enabled and get the volume.
 * Expected to be called once during app initialization with a Zustand selector.
 */
export function setSfxSettingsGetter(getter: () => SfxSettings): void {
  getSettings = getter
}

// --- Sound Synthesis Helpers ---

/**
 * Checks if SFX are enabled and returns the volume multiplier.
 * Returns 0 if SFX are disabled, otherwise returns the user's volume setting.
 */
function getVolumeMultiplier(): number {
  if (!getSettings) return 1 // No settings configured, play at full volume
  const settings = getSettings()
  return settings.enabled ? settings.volume : 0
}

/**
 * Creates a gain envelope with attack-decay-sustain-release shape.
 * Times are in seconds.
 */
function applyEnvelope(
  gain: GainNode,
  now: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  peakGain = 0.3,
  sustainGain = 0.2,
): void {
  const g = gain.gain
  g.setValueAtTime(0, now)
  g.linearRampToValueAtTime(peakGain, now + attack)
  g.linearRampToValueAtTime(sustainGain, now + attack + decay)
  g.setValueAtTime(sustainGain, now + attack + decay + sustain)
  g.linearRampToValueAtTime(0, now + attack + decay + sustain + release)
}

/**
 * Plays a single oscillator tone with envelope.
 */
function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  attack = 0.01,
  decay = 0.05,
  sustain = 0.1,
  release = 0.1,
  peakGain = 0.3,
  sustainGain = 0.2,
): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  const ctx = getAudioContext()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)

  const gain = ctx.createGain()
  applyEnvelope(
    gain,
    now,
    attack,
    decay,
    sustain,
    release,
    peakGain * volumeMultiplier,
    sustainGain * volumeMultiplier,
  )

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + duration)
}

/**
 * Plays multiple simultaneous tones (chord).
 */
function playChord(
  frequencies: number[],
  type: OscillatorType,
  duration: number,
  attack = 0.01,
  decay = 0.05,
  sustain = 0.1,
  release = 0.1,
  peakGain = 0.2,
  sustainGain = 0.15,
): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  for (const freq of frequencies) {
    playTone(freq, type, duration, attack, decay, sustain, release, peakGain, sustainGain)
  }
}

// --- Sound Effect Implementations ---

/**
 * Correct note: bright chime (major triad arpeggio)
 * C5 major triad (523.25, 659.25, 783.99 Hz)
 */
export function playCorrect(): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  const ctx = getAudioContext()
  const now = ctx.currentTime

  const frequencies = [523.25, 659.25, 783.99]
  const stagger = 0.04 // Delay between notes for arpeggio effect

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    const gain = ctx.createGain()
    const startTime = now + i * stagger
    const g = gain.gain
    g.setValueAtTime(0, startTime)
    g.linearRampToValueAtTime(0.25 * volumeMultiplier, startTime + 0.01)
    g.exponentialRampToValueAtTime(0.001, startTime + 0.3)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + 0.3)
  })
}

/**
 * Wrong note: dissonant buzz (low sawtooth with rapid vibrato)
 */
export function playWrong(): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  const ctx = getAudioContext()
  const now = ctx.currentTime

  // Base tone: low sawtooth
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(110, now) // A2

  // Vibrato via frequency modulation
  const vibrato = ctx.createOscillator()
  vibrato.type = 'sine'
  vibrato.frequency.setValueAtTime(8, now) // 8 Hz vibrato

  const vibratoGain = ctx.createGain()
  vibratoGain.gain.setValueAtTime(15, now) // ±15 Hz deviation

  vibrato.connect(vibratoGain)
  vibratoGain.connect(osc.frequency)

  const gain = ctx.createGain()
  const g = gain.gain
  g.setValueAtTime(0, now)
  g.linearRampToValueAtTime(0.2 * volumeMultiplier, now + 0.02)
  g.linearRampToValueAtTime(0, now + 0.15)

  osc.connect(gain)
  gain.connect(ctx.destination)

  vibrato.start(now)
  osc.start(now)
  vibrato.stop(now + 0.15)
  osc.stop(now + 0.15)
}

/**
 * Enemy death: descending glitch (square wave pitch drop)
 */
export function playEnemyDeath(): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  const ctx = getAudioContext()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'square'

  // Rapid pitch drop from 400 Hz to 100 Hz
  const f = osc.frequency
  f.setValueAtTime(400, now)
  f.exponentialRampToValueAtTime(100, now + 0.2)

  const gain = ctx.createGain()
  const g = gain.gain
  g.setValueAtTime(0, now)
  g.linearRampToValueAtTime(0.15 * volumeMultiplier, now + 0.01)
  g.linearRampToValueAtTime(0, now + 0.2)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.2)
}

/**
 * Wave start: rising alert (ascending triangle wave)
 */
export function playWaveStart(): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  const ctx = getAudioContext()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'triangle'

  // Ascending pitch from 300 Hz to 600 Hz
  const f = osc.frequency
  f.setValueAtTime(300, now)
  f.linearRampToValueAtTime(600, now + 0.3)

  const gain = ctx.createGain()
  const g = gain.gain
  g.setValueAtTime(0, now)
  g.linearRampToValueAtTime(0.2 * volumeMultiplier, now + 0.02)
  g.setValueAtTime(0.2 * volumeMultiplier, now + 0.28)
  g.linearRampToValueAtTime(0, now + 0.3)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.3)
}

/**
 * Wave end: completion fanfare (major chord)
 */
export function playWaveEnd(): void {
  // G major chord (392, 493.88, 587.33 Hz)
  playChord(
    [392, 493.88, 587.33],
    'sine',
    0.5,
    0.01,
    0.1,
    0.2,
    0.2,
    0.18,
    0.12,
  )
}

/**
 * Game over: descending minor chord (somber)
 */
export function playGameOver(): void {
  const volumeMultiplier = getVolumeMultiplier()
  if (volumeMultiplier === 0) return // SFX disabled or muted

  const ctx = getAudioContext()
  const now = ctx.currentTime

  // A minor chord (220, 261.63, 329.63 Hz)
  const frequencies = [220, 261.63, 329.63]

  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    const gain = ctx.createGain()
    const g = gain.gain
    g.setValueAtTime(0, now)
    g.linearRampToValueAtTime(0.15 * volumeMultiplier, now + 0.05)
    g.setValueAtTime(0.15 * volumeMultiplier, now + 0.5)
    g.linearRampToValueAtTime(0, now + 1.2)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 1.2)
  })
}

// --- Optional: Generic Play Function ---

/**
 * Generic dispatcher - can be used by calling code that wants
 * to select sound effect by name rather than calling specific functions.
 */
export function playSFX(effect: SoundEffect): void {
  switch (effect) {
    case 'correct':
      playCorrect()
      break
    case 'wrong':
      playWrong()
      break
    case 'enemyDeath':
      playEnemyDeath()
      break
    case 'waveStart':
      playWaveStart()
      break
    case 'waveEnd':
      playWaveEnd()
      break
    case 'gameOver':
      playGameOver()
      break
  }
}
