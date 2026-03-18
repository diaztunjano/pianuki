import type { Enemy } from '../enemyTypes'
import { getLPathPoint } from './enemies'
import { getSprite } from './sprites'

// -----------------------------------------------------------------------
// Particle system for death dissolve effect
// -----------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number   // 1.0 → 0.0
  size: number
  color: string
}

interface DeathEffect {
  enemyId: string
  particles: Particle[]
}

/** Active death effects, keyed by enemy ID. */
const activeEffects = new Map<string, DeathEffect>()

/** Set of enemy IDs we've already spawned particles for. */
const spawnedIds = new Set<string>()

const PARTICLE_COUNT = 8
const PARTICLE_DECAY = 0.045 // life lost per frame (~22 frames to fully fade)

/**
 * Spawn particles at the enemy's position when it first enters dying state.
 */
function spawnParticles(enemy: Enemy, pos: { x: number; y: number }, size: number): void {
  const particles: Particle[] = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4
    const speed = 1.5 + Math.random() * 2
    particles.push({
      x: pos.x + (Math.random() - 0.5) * size * 0.3,
      y: pos.y + (Math.random() - 0.5) * size * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      size: 2 + Math.random() * 3,
      color: enemy.color,
    })
  }
  activeEffects.set(enemy.id, { enemyId: enemy.id, particles })
}

/**
 * Update and draw active particle effects.
 * Called each frame — advances particle positions and removes dead effects.
 */
function tickAndDrawParticles(ctx: CanvasRenderingContext2D): void {
  for (const [id, effect] of activeEffects) {
    let allDead = true
    for (const p of effect.particles) {
      if (p.life <= 0) continue
      allDead = false

      // Update
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // slight gravity
      p.life -= PARTICLE_DECAY

      // Draw
      if (p.life > 0) {
        ctx.globalAlpha = p.life * 0.8
        ctx.fillStyle = p.color
        const s = p.size * p.life
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
      }
    }
    if (allDead) {
      activeEffects.delete(id)
      spawnedIds.delete(id)
    }
  }
  ctx.globalAlpha = 1
}

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
