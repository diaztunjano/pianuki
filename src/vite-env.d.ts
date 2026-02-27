/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// WebMIDI type declarations (partial — covers Phase 1 NoteOn/NoteOff usage)
interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array
}

interface MIDIPort extends EventTarget {
  readonly id: string
  readonly name: string | null
  readonly type: 'input' | 'output'
  readonly state: 'connected' | 'disconnected'
  onmidimessage: ((event: MIDIMessageEvent) => void) | null
}

interface MIDIInput extends MIDIPort {
  readonly type: 'input'
}

interface MIDIAccess extends EventTarget {
  readonly inputs: Map<string, MIDIInput>
  onstatechange: ((event: Event) => void) | null
}

interface Navigator {
  requestMIDIAccess(options?: { sysex?: boolean }): Promise<MIDIAccess>
}
