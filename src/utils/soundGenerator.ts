/**
 * Utility to generate synthesized sound effects using Web Audio API
 * This allows us to create sounds without requiring external audio files
 */

/**
 * Generates a pleasant click/chime sound for correct note matches
 * Creates a brief high-frequency tone with quick attack and decay
 */
export function generateClickSound(): AudioBuffer {
  const audioContext = new AudioContext()
  const sampleRate = audioContext.sampleRate
  const duration = 0.1 // 100ms
  const frequency = 800 // 800 Hz - pleasant click tone

  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const channelData = buffer.getChannelData(0)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate
    // Sine wave at the specified frequency
    const sample = Math.sin(2 * Math.PI * frequency * t)
    // Exponential decay envelope for natural sound
    const envelope = Math.exp(-t * 40)
    channelData[i] = sample * envelope * 0.3 // 0.3 volume to avoid clipping
  }

  return buffer
}

/**
 * Generates a buzz/error sound for wrong note matches
 * Creates a low-frequency harsh tone
 */
export function generateBuzzSound(): AudioBuffer {
  const audioContext = new AudioContext()
  const sampleRate = audioContext.sampleRate
  const duration = 0.15 // 150ms
  const frequency = 120 // 120 Hz - low buzz

  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const channelData = buffer.getChannelData(0)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate
    // Square wave for harsh sound
    const sample = Math.sign(Math.sin(2 * Math.PI * frequency * t))
    // Quick attack, sustained, then decay
    const envelope = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 15)
    channelData[i] = sample * envelope * 0.2 // Lower volume for buzz
  }

  return buffer
}
