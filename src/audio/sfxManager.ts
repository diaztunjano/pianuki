/**
 * SFX Manager — synthesizes game sound effects via Web Audio API.
 *
 * Singleton that lazily creates an AudioContext on first play call
 * (respecting the browser user-gesture requirement). Can optionally
 * reuse an externally-provided AudioContext (e.g. from mic input).
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

/**
 * Ensure the AudioContext is running (not suspended).
 * Must be awaited before scheduling any audio nodes.
 */
async function ensureRunning(ac: AudioContext): Promise<AudioContext> {
  if (ac.state === 'suspended') {
    await ac.resume();
  }
  return ac;
}

/**
 * Get (or lazily create) the master gain node that all SFX route through.
 * This allows runtime volume control via setMasterVolume().
 */
function getMasterGain(ac: AudioContext): GainNode {
  if (!masterGain || masterGain.context !== ac) {
    masterGain = ac.createGain();
    masterGain.connect(ac.destination);
  }
  return masterGain;
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

/** Update the master gain node volume (0–1). Call when store sfxVolume changes. */
export function setMasterVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  if (masterGain) {
    masterGain.gain.value = clamped;
  }
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
  dest: AudioNode = getMasterGain(ac),
): void {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = frequency;
  g.gain.setValueAtTime(gain, startTime);
  g.gain.linearRampToValueAtTime(0, stopTime);
  o.connect(g).connect(dest);
  o.start(startTime);
  o.stop(stopTime + 0.05); // small buffer so ramp finishes
}

// ---------------------------------------------------------------------------
// Public play functions
// ---------------------------------------------------------------------------

/** Bright two-tone chime for hitting the correct note. */
export async function playCorrect(): Promise<void> {
  if (muted) return;
  const ac = await ensureRunning(getContext());
  const t = ac.currentTime;

  // Two stacked sine tones an octave apart, quick decay
  osc(ac, 'sine', 880, 0.25, t, t + 0.15);
  osc(ac, 'sine', 1760, 0.15, t, t + 0.12);
}

/** Short buzzy tone for a wrong note. */
export async function playWrong(): Promise<void> {
  if (muted) return;
  const ac = await ensureRunning(getContext());
  const t = ac.currentTime;

  // Low sawtooth with fast decay — recognisably "wrong"
  osc(ac, 'sawtooth', 110, 0.2, t, t + 0.18);
  osc(ac, 'square', 98, 0.1, t, t + 0.15);
}

/** Descending pitch sweep when an enemy is defeated. */
export async function playEnemyDeath(): Promise<void> {
  if (muted) return;
  const ac = await ensureRunning(getContext());
  const t = ac.currentTime;
  const dest = getMasterGain(ac);

  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(100, t + 0.3);
  g.gain.setValueAtTime(0.25, t);
  g.gain.linearRampToValueAtTime(0, t + 0.35);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.4);
}

/** Ascending arpeggio signalling a new wave. */
export async function playWaveStart(): Promise<void> {
  if (muted) return;
  const ac = await ensureRunning(getContext());
  const t = ac.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const start = t + i * 0.08;
    osc(ac, 'sine', freq, 0.2, start, start + 0.15);
  });
}

/** Triumphant chord when a wave is completed. */
export async function playWaveEnd(): Promise<void> {
  if (muted) return;
  const ac = await ensureRunning(getContext());
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
export async function playGameOver(): Promise<void> {
  if (muted) return;
  const ac = await ensureRunning(getContext());
  const t = ac.currentTime;

  // Descending minor: C5 Ab4 F4 C4
  const notes = [523.25, 415.3, 349.23, 261.63];
  notes.forEach((freq, i) => {
    const start = t + i * 0.2;
    osc(ac, 'triangle', freq, 0.2, start, start + 0.35);
  });
}
