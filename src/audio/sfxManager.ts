/**
 * SFX Manager — synthesises sound effects via Web Audio API.
 *
 * All sounds are generated with OscillatorNode + GainNode envelopes,
 * no external audio files required.
 *
 * AudioContext is created lazily on first play call so it respects
 * the browser's user-gesture requirement. If the mic input (or any
 * other part of the app) already has an AudioContext, pass it via
 * `sfxManager.setContext(ctx)` to reuse it.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
  }
  // Resume in case it was suspended (autoplay policy)
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/** Allow external code (e.g. mic hook) to share its AudioContext. */
export function setContext(externalCtx: AudioContext): void {
  ctx = externalCtx;
}

// ─── helpers ────────────────────────────────────────────────────

function osc(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  endTime: number,
  gain: GainNode,
) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(gain);
  o.start(startTime);
  o.stop(endTime);
}

// ─── sound events ───────────────────────────────────────────────

/** Short bright chime — correct note hit */
export function playCorrect(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

  osc(ac, 'sine', 880, t, t + 0.3, g);
  osc(ac, 'sine', 1320, t + 0.05, t + 0.3, g);
}

/** Buzzy dissonant blip — wrong note */
export function playWrong(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

  osc(ac, 'sawtooth', 150, t, t + 0.25, g);
  osc(ac, 'square', 180, t, t + 0.25, g);
}

/** Quick descending pop — enemy defeated */
export function playEnemyDeath(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, t);
  o.frequency.exponentialRampToValueAtTime(200, t + 0.2);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.2);
}

/** Rising arpeggio — wave starts */
export function playWaveStart(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

  notes.forEach((freq, i) => {
    const g = ac.createGain();
    g.connect(ac.destination);
    const start = t + i * 0.1;
    g.gain.setValueAtTime(0.2, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc(ac, 'sine', freq, start, start + 0.15, g);
  });
}

/** Descending arpeggio — wave complete */
export function playWaveEnd(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [1046.5, 783.99, 659.25, 523.25]; // C6 G5 E5 C5

  notes.forEach((freq, i) => {
    const g = ac.createGain();
    g.connect(ac.destination);
    const start = t + i * 0.1;
    g.gain.setValueAtTime(0.2, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc(ac, 'sine', freq, start, start + 0.2, g);
  });
}

/** Dramatic low rumble + descending tone — game over */
export function playGameOver(): void {
  const ac = getCtx();
  const t = ac.currentTime;

  // Low rumble
  const gRumble = ac.createGain();
  gRumble.connect(ac.destination);
  gRumble.gain.setValueAtTime(0.3, t);
  gRumble.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc(ac, 'sawtooth', 80, t, t + 1.2, gRumble);

  // Descending tone
  const gTone = ac.createGain();
  gTone.connect(ac.destination);
  gTone.gain.setValueAtTime(0.25, t + 0.1);
  gTone.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(440, t + 0.1);
  o.frequency.exponentialRampToValueAtTime(110, t + 1.0);
  o.connect(gTone);
  o.start(t + 0.1);
  o.stop(t + 1.0);
}
