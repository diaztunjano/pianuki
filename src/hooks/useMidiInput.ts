import { useEffect } from 'react'
import { useBoundStore } from '../stores/audioStore'
import { midiNoteToName } from '../lib/noteUtils'

/**
 * MIDI input hook using the Web MIDI API.
 *
 * - Requests MIDI access on mount
 * - Attaches onmidimessage handler to all input ports
 * - Handles hot-plug: re-attaches handlers when devices connect/disconnect
 * - Dispatches unified NoteOn/NoteOff InputEvents to the Zustand store
 * - Handles velocity-0 NoteOn as NoteOff (research Pitfall 5)
 * - Gracefully degrades if MIDI is denied or unavailable (MIDI is secondary input)
 *
 * No return value — side-effect only hook.
 */
export function useMidiInput(): void {
  useEffect(() => {
    let midiAccess: MIDIAccess | null = null

    function handleMidiMessage(event: MIDIMessageEvent): void {
      const data = event.data
      if (!data || data.length < 3) return

      const status = data[0]
      const note = data[1]
      const velocity = data[2]

      const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0
      const isNoteOff =
        (status & 0xf0) === 0x80 ||
        // Velocity-0 NoteOn is a NoteOff in the MIDI spec (common keyboard behavior)
        ((status & 0xf0) === 0x90 && velocity === 0)

      if (isNoteOn) {
        useBoundStore.getState().addEvent({
          type: 'NoteOn',
          note,
          noteName: midiNoteToName(note),
          source: 'midi',
          timestamp: performance.now(),
        })
      } else if (isNoteOff) {
        useBoundStore.getState().addEvent({
          type: 'NoteOff',
          note,
          noteName: midiNoteToName(note),
          source: 'midi',
          timestamp: performance.now(),
        })
      }
    }

    function attachHandlers(access: MIDIAccess): void {
      access.inputs.forEach((input) => {
        // Clear any existing handler first to avoid duplicates on hot-plug
        input.onmidimessage = null
        input.onmidimessage = handleMidiMessage
      })
    }

    async function setup(): Promise<void> {
      try {
        midiAccess = await navigator.requestMIDIAccess()
        attachHandlers(midiAccess)

        // Hot-plug support: re-attach handlers when devices connect/disconnect
        midiAccess.onstatechange = () => {
          if (midiAccess) {
            attachHandlers(midiAccess)
          }
        }
      } catch (err) {
        // MIDI is secondary input — log warning but do not throw
        console.warn('[useMidiInput] MIDI access denied or unavailable:', err)
      }
    }

    void setup()

    return () => {
      // Cleanup: detach all handlers
      if (midiAccess) {
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null
        })
        midiAccess.onstatechange = null
      }
    }
  }, [])
}
