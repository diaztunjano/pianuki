// Pure utility functions for MIDI note conversion
// No React, no imports — safe to use anywhere in the audio pipeline

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Convert a frequency in Hz to the nearest MIDI note number.
 * MIDI 69 = A4 = 440 Hz
 */
export function frequencyToMidiNote(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69)
}

/**
 * Convert a MIDI note number to a human-readable note name (e.g., "C4", "A#3").
 * MIDI 21 = A0 (lowest piano key), MIDI 108 = C8 (highest piano key)
 */
export function midiNoteToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const note = NOTES[midi % 12]
  return `${note}${octave}`
}

/**
 * Returns true if the MIDI note number is within the 88-key piano range.
 * A0 = 21, C8 = 108
 */
export function isInPianoRange(midi: number): boolean {
  return midi >= 21 && midi <= 108
}
