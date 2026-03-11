import { useEffect, useRef } from 'react'
import { useBoundStore } from '../stores'
import { update } from '../game/gameLoop'
import { midiNoteToName } from '../lib/noteUtils'
import { useSoundEffects } from '../hooks/useSoundEffects'
import type { Enemy } from '../game/enemyTypes'

// Fixed timestep: 60 updates per second
const TIMESTEP = 1000 / 60 // ~16.67ms

/**
 * Interpolate a point along the L-shape path.
 * The path goes: top-center → down 60% of height → right to 80% of width
 *
 * Segment 1 (t 0–0.55): vertical drop from top-center to the elbow
 * Segment 2 (t 0.55–1): horizontal run from elbow to right
 */
function getLPathPoint(
  t: number,
  w: number,
  h: number,
  _pathWidth: number,
): { x: number; y: number } {
  const startX = w * 0.35     // path center x at top
  const elbowY = h * 0.62     // y position of the horizontal turn
  const endX = w * 0.82       // x position of path end

  const seg1End = 0.55 // fraction of t at which elbow is reached

  if (t <= seg1End) {
    const seg1T = t / seg1End
    return {
      x: startX,
      y: seg1T * elbowY,
    }
  } else {
    const seg2T = (t - seg1End) / (1 - seg1End)
    return {
      x: startX + seg2T * (endX - startX),
      y: elbowY,
    }
  }
}

/**
 * Draw the full game frame to the canvas.
 * Called every rAF tick — must be fast (no allocations, no DOM queries).
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const pathWidth = Math.max(48, width * 0.055) // responsive path width
  const state = useBoundStore.getState()

  // --- Background ---
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

  // --- Wrong note flash (UIVS-04) — drawn over background, before path ---
  if (state.wrongNoteFlashFrames > 0) {
    ctx.fillStyle = `rgba(220, 38, 38, ${(state.wrongNoteFlashFrames / 8) * 0.3})`
    ctx.fillRect(0, 0, width, height)
  }

  // --- Subtle grid dots ---
  const gridSpacing = 40
  ctx.fillStyle = '#2a2a4a'
  for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
    for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
      ctx.beginPath()
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // --- L-shape path ---
  // Draw as a wide filled strip along the path line
  const startX = width * 0.35
  const elbowY = height * 0.62
  const endX = width * 0.82
  const halfW = pathWidth / 2

  ctx.fillStyle = '#2d3748'
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 2

  // Vertical segment
  ctx.beginPath()
  ctx.rect(startX - halfW, 0, pathWidth, elbowY + halfW)
  ctx.fill()
  ctx.stroke()

  // Horizontal segment (drawn from elbow to end, overlapping the vertical bottom)
  ctx.beginPath()
  ctx.rect(startX - halfW, elbowY - halfW, endX - startX + halfW, pathWidth)
  ctx.fill()
  ctx.stroke()

  // Path entry arrow at top (indicates enemy entry point)
  ctx.fillStyle = '#4a5568'
  ctx.beginPath()
  ctx.moveTo(startX - 12, 8)
  ctx.lineTo(startX + 12, 8)
  ctx.lineTo(startX, 28)
  ctx.closePath()
  ctx.fill()

  // Goal marker at path end
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.arc(endX, elbowY, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold ${Math.max(10, pathWidth * 0.25)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', endX, elbowY)

  // --- Real enemies from Zustand state ---
  const { enemies } = state
  const enemyRadius = Math.max(20, pathWidth * 0.45)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const enemy of enemies) {
    if (enemy.state === 'dead') continue

    const pos = getLPathPoint(enemy.pathT, width, height, pathWidth)

    if (enemy.state === 'alive') {
      // Draw filled circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, enemyRadius, 0, Math.PI * 2)
      ctx.fillStyle = enemy.color
      ctx.fill()

      // White border
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Note name centered inside
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(11, enemyRadius * 0.55)}px sans-serif`
      ctx.fillText(enemy.noteName, pos.x, pos.y)
    } else if (enemy.state === 'dying') {
      // Shrinking circle + expanding white ring death animation
      const progress = enemy.defeatedFrames / 12 // 1 → 0 as animation plays
      const shrunkRadius = enemyRadius * progress

      // Expanding white ring
      const ringRadius = enemyRadius * (1 + (1 - progress) * 0.8)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${progress})`
      ctx.lineWidth = 3
      ctx.stroke()

      // Shrinking enemy circle
      if (shrunkRadius > 0) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, shrunkRadius, 0, Math.PI * 2)
        ctx.fillStyle = enemy.color
        ctx.fill()

        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Note name (still visible during death)
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${Math.max(11, shrunkRadius * 0.55)}px sans-serif`
        ctx.fillText(enemy.noteName, pos.x, pos.y)
      }
    }
  }

  // --- HUD (drawn last, always on top) ---

  // 1. HP bar (top-left)
  const hpRatio = state.playerHP / state.maxPlayerHP
  const hpBarW = 160
  const hpBarH = 14
  const hpBarX = 12
  const hpBarY = 12

  // Background track
  ctx.fillStyle = '#374151'
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH)

  // HP fill
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444'
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH)

  // Border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH)

  // 2. Wave counter (top-right)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(
    `Wave ${state.currentWave + 1}/${state.totalWaves}`,
    width - 12,
    12,
  )

  // 3. Detected note pill (bottom-left, AINP-07)
  const pillX = 12
  const pillY = height - 44
  const pillW = 80
  const pillH = 24

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(pillX, pillY, pillW, pillH)

  const noteDisplay =
    state.activeNotes.size > 0
      ? Array.from(state.activeNotes).map(midiNoteToName).join('+')
      : '---'

  ctx.fillStyle = '#ffffff'
  ctx.font = '13px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(noteDisplay, pillX + 6, pillY + pillH / 2)
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
  const { playCorrectMatch } = useSoundEffects()

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
          update(TIMESTEP, { onCorrectMatch: playCorrectMatch })
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
