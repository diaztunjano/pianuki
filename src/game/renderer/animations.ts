import type { Enemy } from '../enemyTypes'
import { getLPathPoint } from './enemies'

/**
 * Draw dying enemy effects — shrinking circle + expanding white ring.
 */
export function drawAnimations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  enemies: readonly Enemy[],
): void {
  const pathWidth = Math.max(48, width * 0.055)
  const enemyRadius = Math.max(20, pathWidth * 0.45)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const enemy of enemies) {
    if (enemy.state !== 'dying') continue
    const pos = getLPathPoint(enemy.pathT, width, height)
    const progress = enemy.defeatedFrames / 12

    // Expanding white ring
    const ringRadius = enemyRadius * (1 + (1 - progress) * 0.8)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${progress})`
    ctx.lineWidth = 3
    ctx.stroke()

    // Shrinking enemy circle
    const shrunkRadius = enemyRadius * progress
    if (shrunkRadius > 0) {
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, shrunkRadius, 0, Math.PI * 2)
      ctx.fillStyle = enemy.color
      ctx.fill()

      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(11, shrunkRadius * 0.55)}px sans-serif`
      ctx.fillText(enemy.noteName, pos.x, pos.y)
    }
  }
}
