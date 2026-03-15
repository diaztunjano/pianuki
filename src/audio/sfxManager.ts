/**
 * SFX Manager — synthesizes game sound effects using Web Audio API.
 *
 * All sounds are built from OscillatorNode + GainNode envelopes,
 * requiring no external audio files. The AudioContext is created lazily
 * on the first play call to respect the browser user-gesture requirement.
 */

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null

/** Lazily initialise (or resume) the shared AudioContext. */
async function getContext(): Promise<AudioContext> {
  if (!ctx) {
    ctx = new AudioContext()
  }
  // Browsers suspend contexts created before a user gesture — resume if needed
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  return ctx
}

/** Return (or create) the master GainNode that all sounds route through. */
function getMasterGain(ac: AudioContext): GainNode {
  if (!masterGain || masterGain.context !== ac) {
    masterGain = ac.createGain()
    masterGain.connect(ac.destination)
  }
  return masterGain
}

/**
 * Allow external code to provide an already-running AudioContext
 * (e.g. the one created by mic input) so we share a single context.
 */
export function setAudioContext(externalCtx: AudioContext): void {
  if (ctx && ctx !== externalCtx) {
    ctx.close()
  }
  ctx = externalCtx
  // Reset masterGain so it gets recreated on the new context
  masterGain = null
}

/**
 * Called by the SFX Zustand slice whenever enabled/volume changes.
 * Adjusts the master gain node so all sounds respect the setting.
 */
export function applySettings(enabled: boolean, volume: number): void {
  if (!ctx || !masterGain) return
  const targetValue = enabled ? Math.max(0, Math.min(1, volume)) : 0
  masterGain.gain.setTargetAtTime(targetValue, ctx.currentTime, 0.01)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Schedule an oscillator that plays for a given duration with an ADSR-ish envelope. */
function playTone(
  ac: AudioContext,
  destination: AudioNode,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  volume: number,
  attackTime = 0.01,
  releaseTime = 0.05,
): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + attackTime)
  gain.gain.setValueAtTime(volume, startTime + duration - releaseTime)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.connect(gain)
  gain.connect(destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

// ---------------------------------------------------------------------------
// Public play functions
// ---------------------------------------------------------------------------

/**
 * Correct note — bright ascending two-tone chime (C6 → E6).
 */
export async function playCorrect(): Promise<void> {
  const ac = await getContext()
  const dest = getMasterGain(ac)
  const t = ac.currentTime
  playTone(ac, dest, 1047, 'sine', t, 0.12, 0.25, 0.005, 0.04)       // C6
  playTone(ac, dest, 1319, 'sine', t + 0.08, 0.14, 0.25, 0.005, 0.06) // E6
}

/**
 * Wrong note — short low buzz.
 */
export async function playWrong(): Promise<void> {
  const ac = await getContext()
  const dest = getMasterGain(ac)
  const t = ac.currentTime
  playTone(ac, dest, 110, 'sawtooth', t, 0.18, 0.2, 0.005, 0.06)
  playTone(ac, dest, 92, 'square', t, 0.18, 0.1, 0.005, 0.06)
}

/**
 * Enemy death — quick descending blip (G5 → C5).
 */
export async function playEnemyDeath(): Promise<void> {
  const ac = await getContext()
  const dest = getMasterGain(ac)
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(784, t)          // G5
  osc.frequency.exponentialRampToValueAtTime(523, t + 0.15) // → C5
  gain.gain.setValueAtTime(0.3, t)
  gain.gain.linearRampToValueAtTime(0, t + 0.2)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(t)
  osc.stop(t + 0.2)
}

/**
 * Wave start — ascending arpeggio (C5 → E5 → G5).
 */
export async function playWaveStart(): Promise<void> {
  const ac = await getContext()
  const dest = getMasterGain(ac)
  const t = ac.currentTime
  playTone(ac, dest, 523, 'sine', t, 0.12, 0.2, 0.005, 0.04)        // C5
  playTone(ac, dest, 659, 'sine', t + 0.1, 0.12, 0.2, 0.005, 0.04)  // E5
  playTone(ac, dest, 784, 'sine', t + 0.2, 0.18, 0.25, 0.005, 0.08) // G5
}

/**
 * Wave end — descending two-tone resolution (G5 → C5), longer sustain.
 */
export async function playWaveEnd(): Promise<void> {
  const ac = await getContext()
  const dest = getMasterGain(ac)
  const t = ac.currentTime
  playTone(ac, dest, 784, 'sine', t, 0.15, 0.2, 0.005, 0.05)        // G5
  playTone(ac, dest, 523, 'sine', t + 0.12, 0.25, 0.25, 0.005, 0.1) // C5
}

/**
 * Game over — ominous descending minor sequence (E4 → D#4 → D4 → C4)
 * with longer sustain to convey finality.
 */
export async function playGameOver(): Promise<void> {
  const ac = await getContext()
  const dest = getMasterGain(ac)
  const t = ac.currentTime
  const notes = [330, 311, 294, 262] // E4, D#4, D4, C4
  for (let i = 0; i < notes.length; i++) {
    playTone(ac, dest, notes[i], 'triangle', t + i * 0.2, 0.3, 0.25, 0.01, 0.1)
  }
}
