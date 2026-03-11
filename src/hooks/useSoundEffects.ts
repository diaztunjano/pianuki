import { useEffect, useRef } from 'react'

/**
 * Sound effects hook using Web Audio API for synthesized sounds.
 *
 * Creates a separate AudioContext for sound effects to avoid interference
 * with the pitch detection AudioContext used in useAudioInput.
 *
 * Provides methods to play various game sound effects:
 * - correctMatch: Pleasant click/chime when piano key matches enemy
 * - wrongNote: Buzz sound when wrong note is played
 */
export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Initialize AudioContext on mount
    audioContextRef.current = new AudioContext()

    return () => {
      // Cleanup on unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close()
      }
    }
  }, [])

  /**
   * Plays a pleasant click/chime sound for correct note matches.
   * Creates a brief tone with a quick attack and decay for immediate feedback.
   */
  const playCorrectMatch = () => {
    const ctx = audioContextRef.current
    if (!ctx) return

    const now = ctx.currentTime

    // Create oscillator for the tone
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    // Connect nodes: oscillator -> gain -> destination
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Pleasant click tone: short high-pitched beep (1200 Hz)
    oscillator.frequency.setValueAtTime(1200, now)
    oscillator.type = 'sine'

    // Quick attack and decay envelope for a "click" feel
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.005) // 5ms attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08) // 75ms decay

    // Play for 80ms total
    oscillator.start(now)
    oscillator.stop(now + 0.08)
  }

  /**
   * Plays a buzz sound for wrong notes.
   * Creates a harsher, dissonant tone to indicate an error.
   */
  const playWrongNote = () => {
    const ctx = audioContextRef.current
    if (!ctx) return

    const now = ctx.currentTime

    // Create oscillator for the buzz
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Low frequency buzz (150 Hz) with square wave for harshness
    oscillator.frequency.setValueAtTime(150, now)
    oscillator.type = 'square'

    // Quick burst
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01) // 10ms attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15) // 140ms decay

    oscillator.start(now)
    oscillator.stop(now + 0.15)
  }

  return {
    playCorrectMatch,
    playWrongNote,
  }
}
