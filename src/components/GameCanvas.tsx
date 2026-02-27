import { useEffect, useRef } from 'react'
// useBoundStore imported here for future game loop state reads (Phase 2+)
// import { useBoundStore } from '../stores'

// Enemy definition for static placeholder display
interface Enemy {
  noteName: string
  color: string
  pathT: number // 0–1, position along the L-shape path
}

// Static placeholder enemies on the L-shape path
const PLACEHOLDER_ENEMIES: Enemy[] = [
  { noteName: 'C4', color: '#ef4444', pathT: 0.15 },
  { noteName: 'E4', color: '#3b82f6', pathT: 0.4  },
  { noteName: 'G4', color: '#22c55e', pathT: 0.65 },
  { noteName: 'A4', color: '#eab308', pathT: 0.85 },
]

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

  // --- Background ---
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

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

  // --- Placeholder enemies ---
  const enemyRadius = Math.max(20, pathWidth * 0.45)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const enemy of PLACEHOLDER_ENEMIES) {
    const pos = getLPathPoint(enemy.pathT, width, height, pathWidth)

    // Circle fill
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, enemyRadius, 0, Math.PI * 2)
    ctx.fillStyle = enemy.color
    ctx.fill()

    // Circle border
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Note name text inside circle
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(11, enemyRadius * 0.55)}px sans-serif`
    ctx.fillText(enemy.noteName, pos.x, pos.y)
  }

  // --- HUD: dev label ---
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.font = '11px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`${width}×${height}`, 8, 8)
}

/**
 * Canvas 2D game view.
 * Uses ResizeObserver to match drawing buffer to container pixel size.
 * Runs a requestAnimationFrame loop calling drawFrame each tick.
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

  // Effect 2: rAF game loop — runs once on mount, cleaned up on unmount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId: number

    const loop = () => {
      // Read Zustand state directly (not via hook) — zero React overhead in 60fps loop
      // Access store state here when game logic needs it (Phase 2+)
      // const { activeNotes, gamePhase } = useBoundStore.getState()
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
