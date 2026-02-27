import { useRef, useEffect } from 'react'
import { useBoundStore } from '../stores'

/**
 * Development-only event log.
 * Shows last 50 InputEvents from the Zustand store.
 * Conditionally rendered by AppShell via import.meta.env.DEV.
 */
export function DebugPanel() {
  const events = useBoundStore((s) => s.events)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstTimestamp = events[0]?.timestamp ?? 0

  // Auto-scroll to bottom whenever new events arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [events])

  return (
    <div className="w-72 flex flex-col bg-gray-900 border-l border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 text-gray-400 text-xs font-mono font-semibold shrink-0">
        Audio Events (last 50)
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {events.length === 0 ? (
          <div className="px-2 py-1 text-gray-600 text-xs font-mono italic">
            No events yet — play a note
          </div>
        ) : (
          events.map((event, i) => {
            const deltaMs = (event.timestamp - firstTimestamp).toFixed(0)
            return (
              <div
                key={i}
                className={`px-2 py-0.5 rounded text-xs font-mono ${
                  event.type === 'NoteOn' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {/* Source badge */}
                <span className="text-gray-500 mr-1">[{event.source}]</span>

                {/* Event type */}
                <span className="font-semibold">{event.type}</span>
                {' '}

                {/* Note name */}
                <span className="text-white">{event.noteName}</span>

                {/* Frequency (mic only) */}
                {event.frequency !== undefined && (
                  <span className="text-gray-400 ml-1">
                    {event.frequency.toFixed(1)}Hz
                  </span>
                )}

                {/* Confidence (mic only) */}
                {event.confidence !== undefined && (
                  <span className="text-gray-500 ml-1">
                    {(event.confidence * 100).toFixed(0)}%
                  </span>
                )}

                {/* Timestamp delta */}
                <span className="text-gray-600 ml-1">+{deltaMs}ms</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
