/**
 * L-shape path renderer — draws the vertical + horizontal enemy path,
 * entry arrow, and goal marker.
 */
import type { LevelTheme } from './levelThemes'

export function drawPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pathWidth: number,
  theme: LevelTheme,
): void {
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
