import type { Enemy } from '../enemyTypes'

/**
 * Interpolate a point along the L-shape path.
 * The path goes: top-center -> down 60% of height -> right to 80% of width
 *
 * Segment 1 (t 0-0.55): vertical drop from top-center to the elbow
 * Segment 2 (t 0.55-1): horizontal run from elbow to right
 */
export function getLPathPoint(
  t: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const startX = w * 0.35
  const elbowY = h * 0.62
  const endX = w * 0.82
  const seg1End = 0.55

  if (t <= seg1End) {
    return { x: startX, y: (t / seg1End) * elbowY }
  }
  const seg2T = (t - seg1End) / (1 - seg1End)
  return { x: startX + seg2T * (endX - startX), y: elbowY }
}

/**
 * Draw alive enemies as colored circles with note labels.
 */
export function drawEnemies(
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
    if (enemy.state !== 'alive') continue
    const pos = getLPathPoint(enemy.pathT, width, height)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, enemyRadius, 0, Math.PI * 2)
    ctx.fillStyle = enemy.color
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(11, enemyRadius * 0.55)}px sans-serif`
    ctx.fillText(enemy.noteName, pos.x, pos.y)
  }
}
