/**
 * SFX Manager — synthesized sound effects via Web Audio API.
 *
 * Singleton with lazy AudioContext creation (respects browser user-gesture requirement).
 * All sounds are generated with OscillatorNode + GainNode envelopes — no audio files.
 */

import { useBoundStore } from '../stores/audioStore'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  // Resume if suspended (autoplay policy)
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Check store — returns null if SFX disabled, otherwise the volume-scaled gain destination. */
function getSfxGain(): { ac: AudioContext; dest: GainNode } | null {
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  if (!sfxEnabled) return null
  const ac = getCtx()
  const master = ac.createGain()
  master.gain.value = sfxVolume
  master.connect(ac.destination)
  return { ac, dest: master }
}

/** Inject an external AudioContext (e.g. from mic input) to share resources. */
export function setAudioContext(externalCtx: AudioContext): void {
  ctx = externalCtx
}

// ── helpers ──────────────────────────────────────────────────────────

function osc(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  endTime: number,
  gain: GainNode,
): void {
  const o = ac.createOscillator()
  o.type = type
  o.frequency.value = freq
  o.connect(gain)
  o.start(startTime)
  o.stop(endTime)
}

// ── sound events ────────────────────────────────────────────────────

/** Happy chime — two quick ascending sine tones. */
export function playCorrect(): void {
  const sfx = getSfxGain()
  if (!sfx) return
  const { ac, dest } = sfx
  const t = ac.currentTime
  const g = ac.createGain()
  g.connect(dest)
  g.gain.setValueAtTime(0.3, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)

  osc(ac, 'sine', 880, t, t + 0.15, g)
  osc(ac, 'sine', 1108.73, t + 0.1, t + 0.3, g) // C#6 — bright
}

/** Buzzy wrong note — short low square wave. */
export function playWrong(): void {
  const sfx = getSfxGain()
  if (!sfx) return
  const { ac, dest } = sfx
  const t = ac.currentTime
  const g = ac.createGain()
  g.connect(dest)
  g.gain.setValueAtTime(0.25, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)

  osc(ac, 'square', 110, t, t + 0.12, g)
  osc(ac, 'square', 98, t + 0.08, t + 0.25, g)
}

/** Enemy death — quick descending pitch sweep. */
export function playEnemyDeath(): void {
  const sfx = getSfxGain()
  if (!sfx) return
  const { ac, dest } = sfx
  const t = ac.currentTime
  const g = ac.createGain()
  g.connect(dest)
  g.gain.setValueAtTime(0.3, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)

  const o = ac.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(600, t)
  o.frequency.exponentialRampToValueAtTime(80, t + 0.2)
  o.connect(g)
  o.start(t)
  o.stop(t + 0.2)
}

/** Wave start — rising arpeggio (C5-E5-G5). */
export function playWaveStart(): void {
  const sfx = getSfxGain()
  if (!sfx) return
  const { ac, dest } = sfx
  const t = ac.currentTime
  const g = ac.createGain()
  g.connect(dest)
  g.gain.setValueAtTime(0.2, t)
  g.gain.setValueAtTime(0.2, t + 0.35)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

  osc(ac, 'triangle', 523.25, t, t + 0.15, g)        // C5
  osc(ac, 'triangle', 659.25, t + 0.12, t + 0.3, g)  // E5
  osc(ac, 'triangle', 783.99, t + 0.24, t + 0.5, g)  // G5
}

/** Wave end — descending soft tones (G5-E5-C5). */
export function playWaveEnd(): void {
  const sfx = getSfxGain()
  if (!sfx) return
  const { ac, dest } = sfx
  const t = ac.currentTime
  const g = ac.createGain()
  g.connect(dest)
  g.gain.setValueAtTime(0.2, t)
  g.gain.setValueAtTime(0.2, t + 0.4)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)

  osc(ac, 'sine', 783.99, t, t + 0.2, g)        // G5
  osc(ac, 'sine', 659.25, t + 0.15, t + 0.35, g) // E5
  osc(ac, 'sine', 523.25, t + 0.3, t + 0.6, g)   // C5
}

/** Game over — ominous low descending tones. */
export function playGameOver(): void {
  const sfx = getSfxGain()
  if (!sfx) return
  const { ac, dest } = sfx
  const t = ac.currentTime
  const g = ac.createGain()
  g.connect(dest)
  g.gain.setValueAtTime(0.3, t)
  g.gain.setValueAtTime(0.25, t + 0.6)
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)

  osc(ac, 'sawtooth', 330, t, t + 0.4, g)        // E4
  osc(ac, 'sawtooth', 262, t + 0.3, t + 0.7, g)  // C4
  osc(ac, 'sawtooth', 196, t + 0.6, t + 1.0, g)  // G3
  osc(ac, 'square', 130.81, t + 0.9, t + 1.2, g)  // C3
}
