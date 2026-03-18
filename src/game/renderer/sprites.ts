/**
 * Programmatic pixel-art sprite generator for enemies.
 *
 * Draws sprites onto offscreen canvases and caches them by type + size.
 * When the canvas resizes, sprites are regenerated at the new resolution.
 */

/** Pixel grid patterns — each row is a string where '#' = filled, '.' = empty */
const NOTE_SPRITE_PATTERN = [
  '..####..',
  '.######.',
  '###..###',
  '##....##',
  '##.##.##',
  '##.##.##',
  '##....##',
  '###..###',
  '.######.',
  '..####..',
]

const INTERVAL_SPRITE_PATTERN = [
  '.##..##.',
  '########',
  '########',
  '.######.',
  '.######.',
  '..####..',
  '..####..',
  '...##...',
  '...##...',
  '....#...',
]

type SpriteType = 'note' | 'interval'

interface CachedSprite {
  canvas: OffscreenCanvas
  size: number
}

const spriteCache = new Map<string, CachedSprite>()

/** Build a cache key from type, color, and size. */
function cacheKey(type: SpriteType, color: string, size: number): string {
  return `${type}:${color}:${size}`
}

/**
 * Get the pixel pattern for a given sprite type.
 */
function getPattern(type: SpriteType): string[] {
  return type === 'note' ? NOTE_SPRITE_PATTERN : INTERVAL_SPRITE_PATTERN
}

/**
 * Draw a pixel-art sprite onto an offscreen canvas.
 * Each '#' character in the pattern becomes a filled pixel block.
 * The sprite is drawn in the given color with a subtle darker outline.
 */
function renderSprite(
  type: SpriteType,
  color: string,
  size: number,
): OffscreenCanvas {
  const pattern = getPattern(type)
  const rows = pattern.length
  const cols = pattern[0].length
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')!

  const pixelW = size / cols
  const pixelH = size / rows

  // Draw filled pixels
  ctx.fillStyle = color
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pattern[r][c] === '#') {
        ctx.fillRect(
          Math.floor(c * pixelW),
          Math.floor(r * pixelH),
          Math.ceil(pixelW),
          Math.ceil(pixelH),
        )
      }
    }
  }

  // Draw darker border pixels (any '#' pixel adjacent to a '.' or edge)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pattern[r][c] !== '#') continue
      const isEdge =
        r === 0 ||
        r === rows - 1 ||
        c === 0 ||
        c === cols - 1 ||
        pattern[r - 1]?.[c] !== '#' ||
        pattern[r + 1]?.[c] !== '#' ||
        pattern[r][c - 1] !== '#' ||
        pattern[r][c + 1] !== '#'
      if (isEdge) {
        ctx.fillRect(
          Math.floor(c * pixelW),
          Math.floor(r * pixelH),
          Math.ceil(pixelW),
          Math.ceil(pixelH),
        )
      }
    }
  }

  // Re-draw interior pixels so only the border is darkened
  ctx.fillStyle = color
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (pattern[r][c] !== '#') continue
      const isInterior =
        pattern[r - 1][c] === '#' &&
        pattern[r + 1][c] === '#' &&
        pattern[r][c - 1] === '#' &&
        pattern[r][c + 1] === '#'
      if (isInterior) {
        ctx.fillRect(
          Math.floor(c * pixelW),
          Math.floor(r * pixelH),
          Math.ceil(pixelW),
          Math.ceil(pixelH),
        )
      }
    }
  }

  // Add a subtle highlight on interior pixels (top-left lit)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  for (let r = 1; r < rows / 2; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (pattern[r][c] !== '#') continue
      const isInterior =
        pattern[r - 1][c] === '#' &&
        pattern[r + 1][c] === '#' &&
        pattern[r][c - 1] === '#' &&
        pattern[r][c + 1] === '#'
      if (isInterior) {
        ctx.fillRect(
          Math.floor(c * pixelW),
          Math.floor(r * pixelH),
          Math.ceil(pixelW),
          Math.ceil(pixelH),
        )
      }
    }
  }

  return canvas
}

/**
 * Get a cached sprite canvas for the given enemy type, color, and size.
 * Sprites are lazily generated and cached. If the size changes (canvas resize),
 * a new sprite is generated at the new resolution.
 */
export function getSprite(
  type: SpriteType,
  color: string,
  size: number,
): OffscreenCanvas {
  // Quantize size to nearest 2px to avoid thrashing cache during smooth resize
  const quantized = Math.round(size / 2) * 2
  const key = cacheKey(type, color, quantized)
  const cached = spriteCache.get(key)
  if (cached) return cached.canvas

  const canvas = renderSprite(type, color, quantized)
  spriteCache.set(key, { canvas, size: quantized })
  return canvas
}

/**
 * Clear the entire sprite cache (e.g. on large resize or level change).
 */
export function clearSpriteCache(): void {
  spriteCache.clear()
}
