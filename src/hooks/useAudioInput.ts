import { useEffect, useRef } from 'react'
import { PitchDetector } from 'pitchy'
import { useBoundStore } from '../stores/audioStore'
import { frequencyToMidiNote, midiNoteToName } from '../lib/noteUtils'

// --- Constants ---

/** Minimum clarity (0–1) from pitchy for a pitch to be considered valid */
const CLARITY_THRESHOLD = 0.75

/** FFT size for the AnalyserNode — power of 2, higher = more frequency resolution */
const FFT_SIZE = 2048

/**
 * RMS amplitude below which we treat the input as silence.
 * Prevents spurious detections from background noise.
 */
const SILENCE_THRESHOLD = 0.005

/** Piano frequency range: A0 (27.5 Hz) to C8 (~4186 Hz) */
const MIN_FREQUENCY = 27
const MAX_FREQUENCY = 4200

/**
 * Microphone pitch detection hook using Web Audio API + pitchy MPM algorithm.
 *
 * @param enabled - When false, setup is skipped entirely. Pass a state variable
 *   controlled by a "Start Mic" button to satisfy the user gesture requirement
 *   for AudioContext (Web Audio API requirement in browsers).
 *
 * Flow:
 *   getUserMedia → AudioContext → AnalyserNode → PitchDetector → rAF poll loop
 *     → NoteOn/NoteOff events dispatched to Zustand store
 *
 * Key behaviors:
 * - Silence gate: if RMS < SILENCE_THRESHOLD, emit NoteOff for lastNote (if any)
 * - Clarity gate: pitch only accepted if clarity > CLARITY_THRESHOLD
 * - Piano range gate: pitch discarded if outside 27–4200 Hz
 * - Note transition: emits NoteOff for previous note before emitting NoteOn for new note
 *
 * Cleanup: cancelAnimationFrame + stop all stream tracks + close AudioContext
 */
export function useAudioInput(enabled = true): void {
  // Track last detected note so we can emit NoteOff on transition or silence
  const lastNoteRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    let frameId: number | null = null
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null

    async function setup(): Promise<void> {
      try {
        // getUserMedia first — AudioContext MUST be created after a user gesture
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

        // Create AudioContext inside the success path (post-user-gesture)
        audioContext = new AudioContext()

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = FFT_SIZE

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        const detector = PitchDetector.forFloat32Array(analyser.fftSize)
        const buffer = new Float32Array(analyser.fftSize)

        function poll(): void {
          analyser.getFloatTimeDomainData(buffer)

          // Read latency offset once per frame for consistency across all events this tick
          const latencyOffsetMs = useBoundStore.getState().settings.latencyOffsetMs

          // RMS silence gate
          let sumSquares = 0
          for (let i = 0; i < buffer.length; i++) {
            sumSquares += buffer[i] * buffer[i]
          }
          const rms = Math.sqrt(sumSquares / buffer.length)

          if (rms < SILENCE_THRESHOLD) {
            // Silence — emit NoteOff for any held note
            if (lastNoteRef.current !== null) {
              useBoundStore.getState().addEvent({
                type: 'NoteOff',
                note: lastNoteRef.current,
                noteName: midiNoteToName(lastNoteRef.current),
                source: 'mic',
                timestamp: performance.now() - latencyOffsetMs,
              })
              lastNoteRef.current = null
            }
            frameId = requestAnimationFrame(poll)
            return
          }

          // Pitch detection
          const [frequency, clarity] = detector.findPitch(buffer, audioContext!.sampleRate)

          if (clarity > CLARITY_THRESHOLD && frequency >= MIN_FREQUENCY && frequency <= MAX_FREQUENCY) {
            const midiNote = frequencyToMidiNote(frequency)

            if (midiNote !== lastNoteRef.current) {
              // Emit NoteOff for previous note (if any)
              if (lastNoteRef.current !== null) {
                useBoundStore.getState().addEvent({
                  type: 'NoteOff',
                  note: lastNoteRef.current,
                  noteName: midiNoteToName(lastNoteRef.current),
                  source: 'mic',
                  timestamp: performance.now() - latencyOffsetMs,
                })
              }

              // Emit NoteOn for new note
              useBoundStore.getState().addEvent({
                type: 'NoteOn',
                note: midiNote,
                noteName: midiNoteToName(midiNote),
                source: 'mic',
                frequency,
                confidence: clarity,
                timestamp: performance.now() - latencyOffsetMs,
              })

              lastNoteRef.current = midiNote
            }
          } else {
            // Clarity below threshold or out of range — emit NoteOff if holding a note
            if (lastNoteRef.current !== null) {
              useBoundStore.getState().addEvent({
                type: 'NoteOff',
                note: lastNoteRef.current,
                noteName: midiNoteToName(lastNoteRef.current),
                source: 'mic',
                timestamp: performance.now() - latencyOffsetMs,
              })
              lastNoteRef.current = null
            }
          }

          frameId = requestAnimationFrame(poll)
        }

        frameId = requestAnimationFrame(poll)
      } catch (err) {
        console.error('[useAudioInput] Failed to set up audio input:', err)
      }
    }

    void setup()

    return () => {
      // Cleanup in order: stop rAF, stop stream tracks, close AudioContext
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close()
      }
      // Clear last note on unmount so re-mount starts clean
      lastNoteRef.current = null
    }
  }, [enabled])
}
