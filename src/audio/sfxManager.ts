/**
 * SFX Manager — synthesized sound effects via Web Audio API.
 *
 * Singleton. AudioContext is created lazily on first play call
 * (respects browser user-gesture requirement). Call setAudioContext()
 * to share an existing context (e.g. from mic input).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/** Optionally reuse an existing AudioContext (e.g. from useAudioInput). */
export function setAudioContext(external: AudioContext): void {
  ctx = external;
}

// ── helpers ──────────────────────────────────────────────────────────

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

// ── sound events ─────────────────────────────────────────────────────

/** Short ascending chime — correct note hit. */
export function playCorrect(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

  osc(ac, 'sine', 523.25, t, t + 0.15, g);       // C5
  osc(ac, 'sine', 659.25, t + 0.08, t + 0.3, g); // E5
}

/** Harsh buzz — wrong note. */
export function playWrong(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

  osc(ac, 'sawtooth', 120, t, t + 0.25, g);
  osc(ac, 'square', 90, t, t + 0.25, g);
}

/** Quick descending pop — enemy defeated. */
export function playEnemyDeath(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.2);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.2);
}

/** Rising arpeggio — wave starting. */
export function playWaveStart(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5

  notes.forEach((freq, i) => {
    const g = ac.createGain();
    g.connect(ac.destination);
    const start = t + i * 0.1;
    g.gain.setValueAtTime(0.15, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc(ac, 'triangle', freq, start, start + 0.15, g);
  });
}

/** Descending arpeggio — wave complete. */
export function playWaveEnd(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523.25, 392.0, 329.63, 261.63]; // C5 G4 E4 C4

  notes.forEach((freq, i) => {
    const g = ac.createGain();
    g.connect(ac.destination);
    const start = t + i * 0.12;
    g.gain.setValueAtTime(0.15, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc(ac, 'triangle', freq, start, start + 0.2, g);
  });
}

/** Dramatic low rumble + dissonance — game over. */
export function playGameOver(): void {
  const ac = getCtx();
  const t = ac.currentTime;

  // Low rumble
  const g1 = ac.createGain();
  g1.connect(ac.destination);
  g1.gain.setValueAtTime(0.3, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc(ac, 'sawtooth', 65, t, t + 1.2, g1);

  // Dissonant minor second
  const g2 = ac.createGain();
  g2.connect(ac.destination);
  g2.gain.setValueAtTime(0.15, t + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  osc(ac, 'sine', 138.59, t + 0.1, t + 1.0, g2); // C#3
  osc(ac, 'sine', 130.81, t + 0.1, t + 1.0, g2); // C3
}
