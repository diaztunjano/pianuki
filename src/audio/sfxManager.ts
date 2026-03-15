/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (respects browser user-gesture requirement). All sounds are generated
 * with OscillatorNode + GainNode envelopes — no external audio files.
 */

import { useBoundStore } from '../stores/audioStore'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null

async function getContext(): Promise<AudioContext> {
  if (!ctx) {
    ctx = new AudioContext()
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  return ctx
}

function getMasterGain(ac: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ac.createGain()
    masterGain.connect(ac.destination)
  }
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  masterGain.gain.value = sfxEnabled ? sfxVolume : 0
  return masterGain
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator with an ADSR-ish gain envelope. */
function playTone(
  ac: AudioContext,
  frequency: number,
  type: OscillatorType,
  attack: number,
  sustain: number,
  release: number,
  volume = 0.3,
): void {
  const now = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + attack)
  gain.gain.setValueAtTime(volume, now + attack)
  gain.gain.linearRampToValueAtTime(volume * 0.6, now + attack + sustain)
  gain.gain.linearRampToValueAtTime(0, now + attack + sustain + release)

  osc.connect(gain)
  gain.connect(getMasterGain(ac))

  osc.start(now)
  osc.stop(now + attack + sustain + release + 0.01)
}

/** Play a short noise burst (used for buzz / explosion textures). */
function playNoise(ac: AudioContext, duration: number, volume = 0.15): void {
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
  gain.gain.setValueAtTime(volume, now)
  gain.gain.linearRampToValueAtTime(0, now + duration)

  source.connect(gain)
  gain.connect(getMasterGain(ac))
  source.start(now)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Bright ascending chime — correct note played. */
export async function playCorrect(): Promise<void> {
  const ac = await getContext()
  // Two-note ascending arpeggio (C6 → E6)
  playTone(ac, 1047, 'sine', 0.01, 0.06, 0.12, 0.25)
  setTimeout(() => {
    playTone(ac, 1319, 'sine', 0.01, 0.06, 0.15, 0.2)
  }, 60)
}

/** Low distorted buzz — wrong note played. */
export async function playWrong(): Promise<void> {
  const ac = await getContext()
  playTone(ac, 110, 'sawtooth', 0.005, 0.08, 0.1, 0.2)
  playNoise(ac, 0.12, 0.1)
}

/** Quick descending pop — enemy defeated. */
export async function playEnemyDeath(): Promise<void> {
  const ac = await getContext()
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

  playNoise(ac, 0.08, 0.08)
}

/** Rising fanfare — wave starting. */
export async function playWaveStart(): Promise<void> {
  const ac = await getContext()
  // Three ascending tones: C5 → E5 → G5
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(ac, freq, 'triangle', 0.01, 0.08, 0.1, 0.2)
    }, i * 100)
  })
}

/** Resolved chord — wave cleared. */
export async function playWaveEnd(): Promise<void> {
  const ac = await getContext()
  // Major chord played together: C5 + E5 + G5
  playTone(ac, 523, 'sine', 0.01, 0.15, 0.3, 0.15)
  playTone(ac, 659, 'sine', 0.01, 0.15, 0.3, 0.12)
  playTone(ac, 784, 'sine', 0.01, 0.15, 0.3, 0.12)
}

/** Dramatic descending tones — game over. */
export async function playGameOver(): Promise<void> {
  const ac = await getContext()
  // Descending minor arpeggio: E5 → C5 → A4 → low rumble
  const notes: [number, OscillatorType][] = [
    [659, 'triangle'],
    [523, 'triangle'],
    [440, 'triangle'],
    [220, 'sawtooth'],
  ]
  notes.forEach(([freq, type], i) => {
    setTimeout(() => {
      playTone(ac, freq, type, 0.02, 0.12, 0.2 + i * 0.05, 0.2)
    }, i * 180)
  })
  // Final noise rumble
  setTimeout(() => {
    playNoise(ac, 0.4, 0.12)
  }, notes.length * 180)
}

// ---------------------------------------------------------------------------
// Mute control (kept for backwards compatibility with AppShell sync)
// ---------------------------------------------------------------------------

export function setSfxMuted(_value: boolean): void {
  // No-op: mute is now controlled via the master gain node reading store state
}

export function isSfxMuted(): boolean {
  return !useBoundStore.getState().settings.sfxEnabled
}

export function setSfxMasterVolume(_value: number): void {
  // No-op: volume is now controlled via the master gain node reading store state
}

export function getSfxMasterVolume(): number {
  return useBoundStore.getState().settings.sfxVolume
}
