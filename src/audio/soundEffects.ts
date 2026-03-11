/**
 * Sound effects system using Web Audio API.
 * Generates and plays game sound effects programmatically.
 */

let audioContext: AudioContext | null = null
let clickBuffer: AudioBuffer | null = null

/**
 * Initialize the audio context and pre-generate sound buffers.
 * Call this once on user interaction (required for Web Audio API).
 */
export function initSoundEffects(): void {
  if (audioContext) return // Already initialized

  audioContext = new AudioContext()
  clickBuffer = generateClickSound(audioContext)
}

/**
 * Generate a pleasant click sound buffer using Web Audio API.
 * Creates a short, bright percussive sound suitable for correct note hits.
 */
function generateClickSound(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 0.08 // 80ms
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Two-tone click: bright high frequency + warm mid frequency
    const highFreq = Math.sin(2 * Math.PI * 1200 * t) * 0.4
    const midFreq = Math.sin(2 * Math.PI * 600 * t) * 0.3
    // Exponential decay envelope for percussive sound
    const envelope = Math.exp(-t * 25)
    data[i] = (highFreq + midFreq) * envelope
  }

  return buffer
}

/**
 * Play the click sound effect for correct note matches.
 * @param volume - Volume multiplier (0-1), default 0.3
 */
export function playClickSound(volume = 0.3): void {
  if (!audioContext || !clickBuffer) {
    console.warn('Sound effects not initialized. Call initSoundEffects() first.')
    return
  }

  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }

  const source = audioContext.createBufferSource()
  const gainNode = audioContext.createGain()

  source.buffer = clickBuffer
  gainNode.gain.value = volume

  source.connect(gainNode)
  gainNode.connect(audioContext.destination)

  source.start(0)
}

/**
 * Cleanup audio resources when no longer needed.
 */
export function cleanupSoundEffects(): void {
  if (audioContext) {
    audioContext.close()
    audioContext = null
    clickBuffer = null
  }
}
