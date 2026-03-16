/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (respecting the browser user-gesture requirement). Can optionally
 * reuse an externally-provided AudioContext (e.g. from mic input).
 */

let ctx: AudioContext | null = null;
let muted = false;
let volume = 0.5;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  // Resume if suspended (common after idle / before user gesture)
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/** Allow the mic-input hook (or other code) to share its AudioContext. */
export function setAudioContext(external: AudioContext): void {
  ctx = external;
}

/** Mute / unmute all SFX independently from mic input. */
export function setSfxMuted(value: boolean): void {
  muted = value;
}

export function isSfxMuted(): boolean {
  return muted;
}

/** Set the master volume for all SFX (0–1). */
export function setSfxVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
}

export function getSfxVolume(): number {
  return volume;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function osc(
  ac: AudioContext,
  type: OscillatorType,
  frequency: number,
  gain: number,
  startTime: number,
  stopTime: number,
  dest: AudioNode = ac.destination,
): void {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = frequency;
  const scaledGain = gain * volume;
  g.gain.setValueAtTime(scaledGain, startTime);
  g.gain.linearRampToValueAtTime(0, stopTime);
  o.connect(g).connect(dest);
  o.start(startTime);
  o.stop(stopTime + 0.05); // small buffer so ramp finishes
}

// ---------------------------------------------------------------------------
// Public play functions
// ---------------------------------------------------------------------------

/** Bright two-tone chime for hitting the correct note. */
export function playCorrect(): void {
  if (muted) return;
  const ac = getContext();
  const t = ac.currentTime;

  // Two stacked sine tones an octave apart, quick decay
  osc(ac, 'sine', 880, 0.25, t, t + 0.15);
  osc(ac, 'sine', 1760, 0.15, t, t + 0.12);
}

/** Short buzzy tone for a wrong note. */
export function playWrong(): void {
  if (muted) return;
  const ac = getContext();
  const t = ac.currentTime;

  // Low sawtooth with fast decay — recognisably "wrong"
  osc(ac, 'sawtooth', 110, 0.2, t, t + 0.18);
  osc(ac, 'square', 98, 0.1, t, t + 0.15);
}

/** Descending pitch sweep when an enemy is defeated. */
export function playEnemyDeath(): void {
  if (muted) return;
  const ac = getContext();
  const t = ac.currentTime;

  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(100, t + 0.3);
  g.gain.setValueAtTime(0.25 * volume, t);
  g.gain.linearRampToValueAtTime(0, t + 0.35);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.4);
}

/** Ascending arpeggio signalling a new wave. */
export function playWaveStart(): void {
  if (muted) return;
  const ac = getContext();
  const t = ac.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const start = t + i * 0.08;
    osc(ac, 'sine', freq, 0.2, start, start + 0.15);
  });
}

/** Triumphant chord when a wave is completed. */
export function playWaveEnd(): void {
  if (muted) return;
  const ac = getContext();
  const t = ac.currentTime;

  // Major chord (C E G) with gentle sustain
  const chord = [523.25, 659.25, 783.99]; // C5 E5 G5
  chord.forEach((freq) => {
    osc(ac, 'sine', freq, 0.15, t, t + 0.5);
  });
  // Add a bright harmonic on top
  osc(ac, 'triangle', 1046.5, 0.08, t + 0.05, t + 0.45);
}

/** Descending minor arpeggio for game over. */
export function playGameOver(): void {
  if (muted) return;
  const ac = getContext();
  const t = ac.currentTime;

  // Descending minor: C5 Ab4 F4 C4
  const notes = [523.25, 415.3, 349.23, 261.63];
  notes.forEach((freq, i) => {
    const start = t + i * 0.2;
    osc(ac, 'triangle', freq, 0.2, start, start + 0.35);
  });
}
