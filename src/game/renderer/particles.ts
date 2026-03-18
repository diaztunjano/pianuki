import type { Enemy } from '../enemyTypes'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number   // 1.0 → 0.0
  size: number
  color: string
}

export interface DeathEffect {
  enemyId: string
  particles: Particle[]
}

/** Active death effects, keyed by enemy ID. */
export const activeEffects = new Map<string, DeathEffect>()

/** Set of enemy IDs we've already spawned particles for. */
export const spawnedIds = new Set<string>()

const PARTICLE_COUNT = 8
const PARTICLE_DECAY = 0.045 // life lost per frame (~22 frames to fully fade)

/**
 * Spawn particles at the enemy's position when it first enters dying state.
 */
export function spawnParticles(enemy: Enemy, pos: { x: number; y: number }, size: number): void {
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
export function tickAndDrawParticles(ctx: CanvasRenderingContext2D): void {
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
