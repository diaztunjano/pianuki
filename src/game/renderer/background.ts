/**
 * Background renderer — themed fill per level, wrong-note flash,
 * grid dots, L-shape path with entry arrow and goal marker.
 */

/**
 * Per-level color theme.
 * Each level gets a distinct background, grid dot color, path fill/stroke,
 * and goal marker color to give visual variety.
 */
interface LevelTheme {
  bg: string
  gridDot: string
  pathFill: string
  pathStroke: string
  goalColor: string
}

const LEVEL_THEMES: LevelTheme[] = [
  // Level 0 — Meadow: soft green
  {
    bg: '#1a2e1a',
    gridDot: '#2a4a2a',
    pathFill: '#2d4828',
    pathStroke: '#4a6848',
    goalColor: '#f59e0b',
  },
  // Level 1 — Forest: deep teal
  {
    bg: '#1a2e2e',
    gridDot: '#2a4a4a',
    pathFill: '#28403d',
    pathStroke: '#486860',
    goalColor: '#22c55e',
  },
  // Level 2 — Mountain: slate blue
  {
    bg: '#1a1a2e',
    gridDot: '#2a2a4a',
    pathFill: '#2d3748',
    pathStroke: '#4a5568',
    goalColor: '#3b82f6',
  },
  // Level 3 — Storm: dark purple
  {
    bg: '#2e1a2e',
    gridDot: '#4a2a4a',
    pathFill: '#3d2848',
    pathStroke: '#684868',
    goalColor: '#a855f7',
  },
  // Level 4 — Summit: dark crimson
  {
    bg: '#2e1a1a',
    gridDot: '#4a2a2a',
    pathFill: '#482828',
    pathStroke: '#684848',
    goalColor: '#ef4444',
  },
]

/** Fallback theme if levelIndex is out of range. */
const DEFAULT_THEME: LevelTheme = LEVEL_THEMES[2]

function getTheme(levelIndex: number): LevelTheme {
  return LEVEL_THEMES[levelIndex] ?? DEFAULT_THEME
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wrongNoteFlashFrames: number,
  levelIndex: number,
): void {
  const pathWidth = Math.max(48, width * 0.055)
  const theme = getTheme(levelIndex)

  // Themed fill
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, width, height)

  // Wrong note flash overlay (drawn over background, before path)
  if (wrongNoteFlashFrames > 0) {
    ctx.fillStyle = `rgba(220, 38, 38, ${(wrongNoteFlashFrames / 8) * 0.3})`
    ctx.fillRect(0, 0, width, height)
  }

  // Subtle grid dots
  const gridSpacing = 40
  ctx.fillStyle = theme.gridDot
  for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
    for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
      ctx.beginPath()
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // L-shape path
  const startX = width * 0.35
  const elbowY = height * 0.62
  const endX = width * 0.82
  const halfW = pathWidth / 2

  ctx.fillStyle = theme.pathFill
  ctx.strokeStyle = theme.pathStroke
  ctx.lineWidth = 2

  // Vertical segment
  ctx.beginPath()
  ctx.rect(startX - halfW, 0, pathWidth, elbowY + halfW)
  ctx.fill()
  ctx.stroke()

  // Horizontal segment
  ctx.beginPath()
  ctx.rect(startX - halfW, elbowY - halfW, endX - startX + halfW, pathWidth)
  ctx.fill()
  ctx.stroke()

  // Entry arrow at top
  ctx.fillStyle = theme.pathStroke
  ctx.beginPath()
  ctx.moveTo(startX - 12, 8)
  ctx.lineTo(startX + 12, 8)
  ctx.lineTo(startX, 28)
  ctx.closePath()
  ctx.fill()

  // Goal marker at path end
  ctx.fillStyle = theme.goalColor
  ctx.beginPath()
  ctx.arc(endX, elbowY, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = theme.bg
  ctx.font = `bold ${Math.max(10, pathWidth * 0.25)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', endX, elbowY)
}
