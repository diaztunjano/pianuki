import { useEffect, useRef } from 'react'
import { useBoundStore } from '../stores'
import { update } from '../game/gameLoop'
import { drawBackground } from '../game/renderer/background'
import { drawEnemies } from '../game/renderer/enemies'
import { drawAnimations } from '../game/renderer/animations'
import { drawHud } from '../game/renderer/hud'
import type { Enemy } from '../game/enemyTypes'

// Fixed timestep: 60 updates per second
const TIMESTEP = 1000 / 60 // ~16.67ms

/**
 * Draw the full game frame to the canvas.
 * Delegates to composable render modules called in z-order.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const state = useBoundStore.getState()

  drawBackground(ctx, width, height, state.wrongNoteFlashFrames, state.currentLevel)
  drawEnemies(ctx, width, height, state.enemies)
  drawAnimations(ctx, width, height, state.enemies)
  drawHud(ctx, width, height, {
    playerHP: state.playerHP,
    maxPlayerHP: state.maxPlayerHP,
    currentWave: state.currentWave,
    totalWaves: state.totalWaves,
    activeNotes: state.activeNotes,
  })
}

/**
 * Canvas 2D game view.
 * Uses ResizeObserver to match drawing buffer to container pixel size.
 * Runs a fixed-timestep requestAnimationFrame loop calling update() and drawFrame() each tick.
 * Reads Zustand state via .getState() in the loop (not via hooks).
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Effect 1: ResizeObserver — keep canvas buffer size in sync with container
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Set initial size
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width
        canvas.height = entry.contentRect.height
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Effect 2: Fixed-timestep rAF game loop — runs once on mount, cleaned up on unmount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId: number
    let previousTimeMs = 0
    let accumulator = 0

    const loop = (currentTimeMs: number) => {
      const raw = currentTimeMs - previousTimeMs
      // Clamp delta to prevent spiral-of-death on tab switch / slow frames
      const deltaTimeMs = Math.min(raw, 100)
      previousTimeMs = currentTimeMs

      const { gamePhase } = useBoundStore.getState()

      if (gamePhase === 'playing') {
        accumulator += deltaTimeMs
        while (accumulator >= TIMESTEP) {
          update(TIMESTEP)
          accumulator -= TIMESTEP
        }
      }

      drawFrame(ctx, canvas.width, canvas.height)
      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(frameId)
  }, []) // Empty deps: starts once on mount, cleans up on unmount

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}

// Re-export Enemy type for downstream use (avoids importing from two places)
export type { Enemy }
