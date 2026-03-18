/**
 * Background renderer — themed fill per level, wrong-note flash,
 * grid dots, L-shape path with entry arrow and goal marker.
 */
import { getTheme } from './levelThemes'
import { drawPath } from './path'

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

  // L-shape path, entry arrow, and goal marker
  drawPath(ctx, width, height, pathWidth, theme)
}
