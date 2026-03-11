/**
 * Sound Manager
 *
 * Handles all game sound effects using Web Audio API.
 * Generates sounds programmatically to avoid external file dependencies.
 */

class SoundManager {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true
  private lastPlayTime: number = 0
  private minInterval: number = 16 // Minimum 16ms between sounds (one frame at 60fps)

  /**
   * Initialize the audio context.
   * Must be called after a user gesture (e.g., button click).
   */
  initialize(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
  }

  /**
   * Play a click sound when a piano key matches an enemy.
   * Generates a pleasant chime-like sound with quick attack and decay.
   * Throttled to prevent sound spam when multiple enemies match in same frame.
   */
  playMatchClick(): void {
    if (!this.enabled || !this.audioContext) return

    // Throttle to prevent sound spam (max once per frame)
    const now_ms = performance.now()
    if (now_ms - this.lastPlayTime < this.minInterval) return
    this.lastPlayTime = now_ms

    const ctx = this.audioContext
    const now = ctx.currentTime

    // Create oscillator for a bright, clear tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // Connect oscillator -> gain -> output
    osc.connect(gain)
    gain.connect(ctx.destination)

    // Use a sine wave for a clean, pleasant tone
    osc.type = 'sine'

    // Frequency: A5 (880 Hz) - bright but not harsh
    osc.frequency.setValueAtTime(880, now)

    // Envelope: quick attack, short sustain, fast decay
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01) // 10ms attack
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15) // 140ms decay

    // Start and stop the oscillator
    osc.start(now)
    osc.stop(now + 0.15)

    // Clean up after the sound completes
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  }

  /**
   * Enable or disable all sound effects.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Get current enabled state.
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Resume audio context if it's suspended.
   * Browsers often suspend audio context until user interaction.
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
}

// Export a singleton instance
export const soundManager = new SoundManager()
