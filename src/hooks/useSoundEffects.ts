import { useEffect } from 'react'
import { soundEffectsManager } from '../utils/soundEffectsManager'

/**
 * React hook for initializing sound effects
 * Wraps the singleton soundEffectsManager for use in React components
 * Call this once in a top-level component (e.g., App) to initialize sounds
 */
export function useSoundEffects() {
  useEffect(() => {
    // Initialize sound effects manager on mount
    soundEffectsManager.initialize()

    // Cleanup on unmount
    return () => {
      soundEffectsManager.cleanup()
    }
  }, [])

  return {
    playClickSound: () => soundEffectsManager.playClickSound(),
    playBuzzSound: () => soundEffectsManager.playBuzzSound(),
  }
}
