import { Howl } from 'howler'
import { generateClickSound, generateBuzzSound } from './soundGenerator'

/**
 * Singleton sound effects manager
 * Provides a non-React interface for playing sounds from the game loop
 * Must be initialized before use (typically on app mount)
 */
class SoundEffectsManager {
  private clickSound: Howl | null = null
  private buzzSound: Howl | null = null
  private initialized = false

  /**
   * Initialize sound effects - must be called before playing sounds
   * Safe to call multiple times (subsequent calls are no-ops)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Generate audio buffers
      const clickBuffer = generateClickSound()
      const buzzBuffer = generateBuzzSound()

      // Convert AudioBuffer to data URLs for Howler
      const clickDataUrl = this.audioBufferToDataUrl(clickBuffer)
      const buzzDataUrl = this.audioBufferToDataUrl(buzzBuffer)

      // Initialize Howler instances
      this.clickSound = new Howl({
        src: [clickDataUrl],
        volume: 0.5,
        preload: true,
      })

      this.buzzSound = new Howl({
        src: [buzzDataUrl],
        volume: 0.4,
        preload: true,
      })

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize sound effects:', error)
    }
  }

  /**
   * Play the click sound for correct note matches
   * Safe to call even if not initialized (will be silent)
   */
  playClickSound(): void {
    if (this.clickSound && this.initialized) {
      // Stop any currently playing instance to allow rapid retriggering
      this.clickSound.stop()
      this.clickSound.play()
    }
  }

  /**
   * Play the buzz sound for wrong note matches
   * Safe to call even if not initialized (will be silent)
   */
  playBuzzSound(): void {
    if (this.buzzSound && this.initialized) {
      // Stop any currently playing instance
      this.buzzSound.stop()
      this.buzzSound.play()
    }
  }

  /**
   * Cleanup - unload all sounds
   */
  cleanup(): void {
    this.clickSound?.unload()
    this.buzzSound?.unload()
    this.clickSound = null
    this.buzzSound = null
    this.initialized = false
  }

  private audioBufferToDataUrl(buffer: AudioBuffer): string {
    const wav = this.audioBufferToWav(buffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2
    const arrayBuffer = new ArrayBuffer(44 + length)
    const view = new DataView(arrayBuffer)

    const sampleRate = buffer.sampleRate
    const numChannels = buffer.numberOfChannels

    // Write RIFF header
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + length, true)
    this.writeString(view, 8, 'WAVE')

    // Write fmt chunk
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // chunk size
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * 2, true) // byte rate
    view.setUint16(32, numChannels * 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample

    // Write data chunk
    this.writeString(view, 36, 'data')
    view.setUint32(40, length, true)

    // Write PCM samples
    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i]
        // Convert float [-1, 1] to 16-bit integer
        const intSample = Math.max(-1, Math.min(1, sample))
        view.setInt16(offset, intSample < 0 ? intSample * 0x8000 : intSample * 0x7fff, true)
        offset += 2
      }
    }

    return arrayBuffer
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
}

// Export singleton instance
export const soundEffectsManager = new SoundEffectsManager()
