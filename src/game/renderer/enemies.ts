import type { Enemy } from '../enemyTypes'
import { getSprite } from './sprites'

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
 * Draw alive enemies as pixel-art sprites with note labels.
 */
export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  enemies: readonly Enemy[],
): void {
  const pathWidth = Math.max(48, width * 0.055)
  const enemyRadius = Math.max(20, pathWidth * 0.45)
  const spriteSize = Math.round(enemyRadius * 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const enemy of enemies) {
    if (enemy.state !== 'alive') continue
    const pos = getLPathPoint(enemy.pathT, width, height)

    const sprite = getSprite(enemy.enemyType, enemy.color, spriteSize)
    ctx.drawImage(
      sprite,
      pos.x - spriteSize / 2,
      pos.y - spriteSize / 2,
      spriteSize,
      spriteSize,
    )

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(11, enemyRadius * 0.55)}px sans-serif`
    ctx.fillText(enemy.noteName, pos.x, pos.y)
  }
}
