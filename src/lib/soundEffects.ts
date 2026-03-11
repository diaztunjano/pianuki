/**
 * Sound effects manager for Pianuki game
 * Uses Web Audio API for precise, low-latency sound playback
 */

// Singleton audio context for all sound effects
let audioContext: AudioContext | null = null

// Cache for generated audio buffers
const bufferCache: Record<string, AudioBuffer> = {}

/**
 * Get or create the shared AudioContext
 * Lazy initialization to avoid autoplay policy issues
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * Generate a pleasant click/chime sound for correct note matches
 * Creates a short, bright tone with quick decay
 */
function generateClickSound(): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const duration = 0.08 // 80ms - short and punchy
  const length = sampleRate * duration

  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // Generate a bright chime: fundamental + harmonics
  const frequency = 1200 // Bright, attention-grabbing frequency
  const omega = (2 * Math.PI * frequency) / sampleRate

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Exponential decay envelope for natural sound
    const envelope = Math.exp(-20 * t)

    // Mix fundamental with 2nd and 3rd harmonics for richness
    const fundamental = Math.sin(omega * i)
    const harmonic2 = 0.5 * Math.sin(2 * omega * i)
    const harmonic3 = 0.25 * Math.sin(3 * omega * i)

    data[i] = (fundamental + harmonic2 + harmonic3) * envelope * 0.3
  }

  return buffer
}

/**
 * Generate a buzz sound for wrong note matches
 * Creates a harsh, dissonant tone to indicate error
 */
function generateBuzzSound(): AudioBuffer {
  const ctx = getAudioContext()
  const sampleRate = ctx.sampleRate
  const duration = 0.15 // 150ms - slightly longer to be noticeable
  const length = sampleRate * duration

  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  // Low, dissonant frequency
  const frequency = 180
  const omega = (2 * Math.PI * frequency) / sampleRate

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Exponential decay
    const envelope = Math.exp(-10 * t)

    // Add dissonance with slightly detuned second tone
    const tone1 = Math.sin(omega * i)
    const tone2 = 0.7 * Math.sin(1.05 * omega * i) // 5% detuned

    data[i] = (tone1 + tone2) * envelope * 0.2
  }

  return buffer
}

/**
 * Get or generate an audio buffer for a sound effect
 */
function getBuffer(soundType: 'click' | 'buzz'): AudioBuffer {
  if (!bufferCache[soundType]) {
    bufferCache[soundType] = soundType === 'click'
      ? generateClickSound()
      : generateBuzzSound()
  }
  return bufferCache[soundType]
}

/**
 * Play the click sound effect for correct note matches
 * Non-blocking, can be called multiple times for polyphonic playback
 */
export function playClickSound(): void {
  try {
    const ctx = getAudioContext()

    // Resume context if suspended (e.g., due to autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const buffer = getBuffer('click')
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch (error) {
    // Gracefully handle audio errors (e.g., browser doesn't support Web Audio)
    console.warn('Failed to play click sound:', error)
  }
}

/**
 * Play the buzz sound effect for wrong note matches
 */
export function playBuzzSound(): void {
  try {
    const ctx = getAudioContext()

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const buffer = getBuffer('buzz')
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch (error) {
    console.warn('Failed to play buzz sound:', error)
  }
}

/**
 * Preload sound effects to reduce latency on first play
 * Call this during app initialization or level start
 */
export function preloadSounds(): void {
  try {
    const ctx = getAudioContext()
    // Generate buffers in advance
    getBuffer('click')
    getBuffer('buzz')
    // Resume context to prepare for playback
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
  } catch (error) {
    console.warn('Failed to preload sounds:', error)
  }
}
