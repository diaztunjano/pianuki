import { GameCanvas } from './GameCanvas'
import { KeyboardStrip } from './KeyboardStrip'
import { DebugPanel } from './DebugPanel'

/**
 * Top-level layout shell.
 * Flexbox structure:
 *   - Outer: flex-col filling the entire viewport (h-screen w-screen)
 *   - Middle row: flex-row with GameCanvas (flex-1) + optional DebugPanel (fixed width)
 *   - Bottom: KeyboardStrip (fixed height)
 *
 * DebugPanel is conditionally rendered in DEV mode only.
 * In production builds, tree-shaking eliminates it entirely.
 */
export function AppShell() {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden">
      {/* Middle row: canvas + debug panel */}
      <div className="flex flex-1 overflow-hidden">
        <GameCanvas />
        {import.meta.env.DEV && <DebugPanel />}
      </div>

      {/* Bottom: 88-key keyboard strip */}
      <KeyboardStrip />
    </div>
  )
}
