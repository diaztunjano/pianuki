import { create, StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'

// --- Shared Event Type ---

/**
 * Unified input event produced by both mic (pitch detection) and MIDI pipelines.
 * Both audio hooks write to this type via addEvent so the rest of the app
 * doesn't need to know which input source is active.
 */
export interface InputEvent {
  type: 'NoteOn' | 'NoteOff'
  note: number         // MIDI note number 21–108
  noteName: string     // e.g. "C4", "A#3"
  source: 'mic' | 'midi'
  frequency?: number   // Hz — mic input only
  confidence?: number  // 0–1 clarity — mic input only
  timestamp: number    // performance.now()
}

// --- Audio Slice ---

interface AudioSlice {
  activeNotes: Set<number>  // MIDI note numbers currently held
  events: InputEvent[]      // Rolling buffer, last 50 events
  addEvent: (event: InputEvent) => void
}

const createAudioSlice: StateCreator<
  BoundStore,
  [['zustand/devtools', never]],
  [],
  AudioSlice
> = (set) => ({
  activeNotes: new Set<number>(),
  events: [],
  addEvent: (event) =>
    set(
      (state) => {
        // CRITICAL: Always create a new Set — Zustand uses reference equality.
        // Mutating the existing set does not trigger re-renders.
        const newNotes = new Set(state.activeNotes)
        if (event.type === 'NoteOn') {
          newNotes.add(event.note)
        } else {
          newNotes.delete(event.note)
        }
        return {
          activeNotes: newNotes,
          events: [...state.events, event].slice(-50), // Keep last 50
        }
      },
      false,
      'audio/addEvent',
    ),
})

// --- Game Slice (stub for Phase 1) ---

interface GameSlice {
  gamePhase: 'idle' | 'playing' | 'paused'
}

const createGameSlice: StateCreator<
  BoundStore,
  [['zustand/devtools', never]],
  [],
  GameSlice
> = () => ({
  gamePhase: 'idle',
})

// --- Bound Store ---

type BoundStore = AudioSlice & GameSlice

export const useBoundStore = create<BoundStore>()(
  devtools(
    (...args) => ({
      ...createAudioSlice(...args),
      ...createGameSlice(...args),
    }),
    { name: 'pianuki-store' },
  ),
)

// Convenience selectors
export const useActiveNotes = () => useBoundStore((s) => s.activeNotes)
export const useEvents = () => useBoundStore((s) => s.events)
export const useAddEvent = () => useBoundStore((s) => s.addEvent)
