import type { Enemy } from '../enemyTypes'
import { getLPathPoint } from './enemies'
import { activeEffects, spawnedIds, spawnParticles, tickAndDrawParticles } from './particles'
import { getSprite } from './sprites'

/** Clear all animation state (call on game reset / level start). */
export function clearAnimationState(): void {
  activeEffects.clear()
  spawnedIds.clear()
}

// -----------------------------------------------------------------------
// Main draw function
// -----------------------------------------------------------------------

/**
 * Draw dying enemy effects — shrinking sprite + expanding white ring + particles.
 */
export function drawAnimations(
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
    if (enemy.state !== 'dying') continue
    const pos = getLPathPoint(enemy.pathT, width, height)
    const progress = enemy.defeatedFrames / 12

    // Spawn particles on the first frame this enemy is dying
    if (!spawnedIds.has(enemy.id)) {
      spawnedIds.add(enemy.id)
      spawnParticles(enemy, pos, spriteSize)
    }

    // Expanding white ring
    const ringRadius = enemyRadius * (1 + (1 - progress) * 0.8)
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${progress})`
    ctx.lineWidth = 3
    ctx.stroke()

    // Shrinking sprite
    const scale = progress
    const shrunkSize = spriteSize * scale
    if (shrunkSize > 1) {
      ctx.globalAlpha = progress
      const sprite = getSprite(enemy.enemyType, enemy.color, spriteSize)
      ctx.drawImage(
        sprite,
        pos.x - shrunkSize / 2,
        pos.y - shrunkSize / 2,
        shrunkSize,
        shrunkSize,
      )
      ctx.globalAlpha = 1

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(11, (enemyRadius * scale) * 0.55)}px sans-serif`
      ctx.fillText(enemy.noteName, pos.x, pos.y)
    }
  }

  // Draw and tick all active particle effects (including lingering ones from already-dead enemies)
  tickAndDrawParticles(ctx)
}
